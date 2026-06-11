import type {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import { prisma } from "@church-rides/db";
import { upcomingSunday } from "@church-rides/types";

/** Reactions count until Saturday 10:00 AM (server-local time) before the target Sunday. */
function isBeforeCutoff(now: Date, sunday: Date): boolean {
  const cutoff = new Date(sunday);
  cutoff.setUTCDate(cutoff.getUTCDate() - 1); // Saturday
  // Convert to a local-time wall-clock cutoff of 10:00.
  const local = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate(), 10, 0, 0);
  return now < local;
}

export async function handleReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (user.partial) await user.fetch();
  if (reaction.emoji.name !== "✅") return;

  const guildId = reaction.message.guildId;
  if (!guildId) return;

  const church = await prisma.church.findUnique({ where: { discordServerId: guildId } });
  if (!church || reaction.message.id !== church.activeWeeklyMessageId) return;

  const sunday = upcomingSunday();
  if (!isBeforeCutoff(new Date(), sunday)) return; // past Saturday 10 AM — signups closed

  const member = await prisma.member.findUnique({ where: { discordId: user.id } });

  if (!member) {
    try {
      await (user as User).send(
        `You're not registered yet! Head to <#${church.signupChannelId}> to sign up.`
      );
    } catch {
      // User has DMs disabled — nothing else we can do.
      console.warn(`Could not DM unregistered user ${user.id}`);
    }
    return;
  }

  await prisma.rideRequest.upsert({
    where: { memberId_weekDate: { memberId: member.id, weekDate: sunday } },
    update: { status: "PENDING" },
    create: { memberId: member.id, weekDate: sunday },
  });
  console.log(`Ride request saved: ${member.fullName} for ${sunday.toISOString().slice(0, 10)}`);
}
