import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Interaction,
  Message,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { prisma } from "@church-rides/db";
import { PICKUP_ROUTE, normalizeUSPhone } from "@church-rides/types";

/*
 * Discord API note: a modal can only be opened in response to an *interaction*
 * (button click, slash command, select menu) — never directly from a plain
 * channel message — and modals only support text inputs, not dropdowns.
 *
 * Flow (closest possible to the spec, fully ephemeral/private):
 *   1. User sends any message in #rides-signup
 *   2. Bot replies with a "📝 Register / Update my info" button (auto-deletes in 60s)
 *   3. Button click → private modal: Full Name, Phone (validated), Preferences
 *   4. Modal submit → ephemeral pickup-location dropdown (Mesa…VDC)
 *   5. Selection → member upserted; "Your info has been updated!" if they already existed
 */

const REGISTER_BUTTON_ID = "rides:register";
const REGISTER_MODAL_ID = "rides:register-modal";
const LOCATION_SELECT_ID = "rides:location-select";

// Holds modal answers between step 3 and step 4 (keyed by Discord user ID).
const pendingRegistrations = new Map<
  string,
  { fullName: string; phoneNumber: string; preferences: string | null; guildId: string }
>();

export async function handleSignupChannelMessage(message: Message) {
  if (message.author.bot || !message.guildId) return;

  const church = await prisma.church.findUnique({
    where: { discordServerId: message.guildId },
  });
  if (!church || message.channelId !== church.signupChannelId) return;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(REGISTER_BUTTON_ID)
      .setLabel("📝 Register / Update my info")
      .setStyle(ButtonStyle.Primary)
  );

  const reply = await message.reply({
    content: `Hi <@${message.author.id}>! Tap below to register for rides — it only takes a minute.`,
    components: [row],
  });

  // Keep the signup channel tidy.
  setTimeout(() => reply.delete().catch(() => {}), 60_000);
}

export async function handleInteraction(interaction: Interaction) {
  // Step 3: open the modal.
  if (interaction.isButton() && interaction.customId === REGISTER_BUTTON_ID) {
    const modal = new ModalBuilder()
      .setCustomId(REGISTER_MODAL_ID)
      .setTitle("Ride Signup")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("fullName")
            .setLabel("Full Name")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(80)
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("phoneNumber")
            .setLabel("Phone Number (US)")
            .setPlaceholder("(619) 555-0101")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("preferences")
            .setLabel("Preferences (optional)")
            .setPlaceholder('e.g. "needs early pickup", "has mobility needs"')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
        )
      );
    await interaction.showModal(modal);
    return;
  }

  // Step 4: validate the modal, then ask for pickup location.
  if (interaction.isModalSubmit() && interaction.customId === REGISTER_MODAL_ID) {
    const fullName = interaction.fields.getTextInputValue("fullName").trim();
    const rawPhone = interaction.fields.getTextInputValue("phoneNumber");
    const preferences = interaction.fields.getTextInputValue("preferences").trim() || null;

    const phoneNumber = normalizeUSPhone(rawPhone);
    if (!phoneNumber) {
      await interaction.reply({
        content: "❌ That doesn't look like a valid US phone number (e.g. `(619) 555-0101`). Please tap the button and try again.",
        ephemeral: true,
      });
      return;
    }

    pendingRegistrations.set(interaction.user.id, {
      fullName,
      phoneNumber,
      preferences,
      guildId: interaction.guildId!,
    });

    const select = new StringSelectMenuBuilder()
      .setCustomId(LOCATION_SELECT_ID)
      .setPlaceholder("Choose your pickup location")
      .addOptions(PICKUP_ROUTE.map((loc) => ({ label: loc, value: loc })));

    await interaction.reply({
      content: "Almost done! Where should we pick you up?",
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      ephemeral: true,
    });
    return;
  }

  // Step 5: save the member.
  if (interaction.isStringSelectMenu() && interaction.customId === LOCATION_SELECT_ID) {
    const pending = pendingRegistrations.get(interaction.user.id);
    if (!pending) {
      await interaction.update({
        content: "⌛ This signup expired — please tap the register button again.",
        components: [],
      });
      return;
    }
    pendingRegistrations.delete(interaction.user.id);

    const church = await prisma.church.findUnique({
      where: { discordServerId: pending.guildId },
    });
    if (!church) {
      await interaction.update({ content: "❌ This server isn't configured yet.", components: [] });
      return;
    }

    const pickupLocation = interaction.values[0] as (typeof PICKUP_ROUTE)[number];
    const existing = await prisma.member.findUnique({
      where: { discordId: interaction.user.id },
    });

    await prisma.member.upsert({
      where: { discordId: interaction.user.id },
      update: {
        discordUsername: interaction.user.username,
        fullName: pending.fullName,
        phoneNumber: pending.phoneNumber,
        pickupLocation,
        preferences: pending.preferences,
      },
      create: {
        discordId: interaction.user.id,
        discordUsername: interaction.user.username,
        fullName: pending.fullName,
        phoneNumber: pending.phoneNumber,
        pickupLocation,
        preferences: pending.preferences,
        churchId: church.id,
      },
    });

    await interaction.update({
      content: existing
        ? "✅ Your info has been updated!"
        : `✅ You're registered, ${pending.fullName}! Watch for the weekly ride post.`,
      components: [],
    });
  }
}
