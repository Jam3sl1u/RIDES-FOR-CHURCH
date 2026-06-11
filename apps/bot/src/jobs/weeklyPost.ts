import type { Client, TextChannel } from "discord.js";
import { prisma } from "@church-rides/db";

// Prevents double-posting if the minute tick fires twice (key: churchId + yyyy-mm-dd).
const sentToday = new Set<string>();

/**
 * Runs every minute. Posts the weekly ride message to each church whose
 * configured (weeklySendDay, weeklySendTime) matches the current local time.
 */
export async function runWeeklyPostCheck(client: Client) {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday … 6 = Saturday
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const churches = await prisma.church.findMany({
    where: { weeklySendDay: day, weeklySendTime: hhmm },
  });

  for (const church of churches) {
    const key = `${church.id}:${now.toISOString().slice(0, 10)}`;
    if (sentToday.has(key)) continue;
    sentToday.add(key);
    if (sentToday.size > 500) sentToday.clear(); // cheap memory cap

    try {
      const channel = (await client.channels.fetch(church.weeklyChannelId)) as TextChannel | null;
      if (!channel?.isTextBased()) {
        console.warn(`Church ${church.name}: weekly channel ${church.weeklyChannelId} not found`);
        continue;
      }

      const message = await channel.send(church.weeklyMessageTemplate);
      await message.react("✅");

      // Remember the message so reactions are tracked even across bot restarts.
      await prisma.church.update({
        where: { id: church.id },
        data: { activeWeeklyMessageId: message.id },
      });

      console.log(`Weekly ride post sent for ${church.name} (message ${message.id})`);
    } catch (err) {
      console.error(`Failed weekly post for ${church.name}:`, err);
    }
  }
}
