import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
} from "discord.js";
import cron from "node-cron";
import { handleSignupChannelMessage, handleInteraction } from "./registration";
import { handleReactionAdd } from "./reactions";
import { runWeeklyPostCheck } from "./jobs/weeklyPost";
import { runAssignmentJob } from "./jobs/assignRides";
import { runDriverNotifications } from "./jobs/notifyDrivers";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  // Partials are required to receive reactions on messages sent before the bot restarted.
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);

  // Every minute: check each church's configured weekly send day/time.
  cron.schedule("* * * * *", () => runWeeklyPostCheck(client).catch(logErr("weeklyPost")));

  // Saturday 11:45 AM — build ride assignments.
  cron.schedule("45 11 * * 6", () => runAssignmentJob().catch(logErr("assignRides")));

  // Saturday 12:00 PM — notify drivers (Discord DM primary, Resend email backup).
  cron.schedule("0 12 * * 6", () => runDriverNotifications(client).catch(logErr("notifyDrivers")));
});

client.on(Events.MessageCreate, (msg) => handleSignupChannelMessage(msg).catch(logErr("signup")));
client.on(Events.InteractionCreate, (i) => handleInteraction(i).catch(logErr("interaction")));
client.on(Events.MessageReactionAdd, (reaction, user) =>
  handleReactionAdd(reaction, user).catch(logErr("reaction"))
);

function logErr(scope: string) {
  return (err: unknown) => console.error(`[${scope}]`, err);
}

client.login(process.env.DISCORD_BOT_TOKEN);
