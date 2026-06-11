import type { Client } from "discord.js";
import { prisma } from "@church-rides/db";
import { routeIndex, upcomingSunday } from "@church-rides/types";
import { sendDriverEmail } from "../lib/email";

/** Saturday 12:00 PM — send each driver their passenger list. */
export async function runDriverNotifications(client: Client) {
  const sunday = upcomingSunday();

  const assignments = await prisma.rideAssignment.findMany({
    where: { weekDate: sunday },
    include: { driver: true, member: true },
  });
  if (assignments.length === 0) {
    console.log("No assignments to notify for", sunday.toISOString().slice(0, 10));
    return;
  }

  // Group by driver.
  const byDriver = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const list = byDriver.get(a.driverId) ?? [];
    list.push(a);
    byDriver.set(a.driverId, list);
  }

  for (const [, list] of byDriver) {
    const driver = list[0].driver;

    // Sort riders by the priority route so the list doubles as a pickup order.
    const riders = list
      .map((a) => a.member)
      .sort((a, b) => routeIndex(a.pickupLocation) - routeIndex(b.pickupLocation));

    const lines = riders.map(
      (m, i) => `${i + 1}. ${m.fullName} – ${m.phoneNumber} – Pickup: ${m.pickupLocation}`
    );
    const route = [...new Set(riders.map((m) => m.pickupLocation))].join(" → ");

    const dmText = [
      `Hi ${driver.fullName}! Here are your riders this Sunday:`,
      ...lines,
      `Pick up in this order: ${route}`,
      `Thanks for serving! 🙏`,
    ].join("\n");

    // 1) Discord DM (primary)
    if (driver.discordId) {
      try {
        const user = await client.users.fetch(driver.discordId);
        await user.send(dmText);
      } catch (err) {
        console.warn(`DM failed for driver ${driver.fullName}:`, err);
      }
    }

    // 2) Resend email (backup) — sent whenever the driver has an email on file.
    if (driver.email) {
      try {
        await sendDriverEmail({
          to: driver.email,
          driverName: driver.fullName,
          rows: riders.map((m) => ({
            fullName: m.fullName,
            phoneNumber: m.phoneNumber,
            pickupLocation: m.pickupLocation,
          })),
        });
      } catch (err) {
        console.warn(`Email failed for driver ${driver.fullName}:`, err);
      }
    }
  }

  console.log(`Notified ${byDriver.size} drivers for ${sunday.toISOString().slice(0, 10)}`);
}
