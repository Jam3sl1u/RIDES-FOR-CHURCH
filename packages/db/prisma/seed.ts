import { PrismaClient, PickupLocation } from "@prisma/client";

const prisma = new PrismaClient();

/** Next Sunday (00:00 UTC) — used so seeded ride requests show up on the dashboard. */
function nextSunday(): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const offset = (7 - d.getUTCDay()) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

async function main() {
  const church = await prisma.church.upsert({
    where: { discordServerId: "123456789012345678" },
    update: {},
    create: {
      name: "Grace Community Church",
      discordServerId: "123456789012345678", // replace with your real server ID
      signupChannelId: "111111111111111111", // #rides-signup
      weeklyChannelId: "222222222222222222", // #rides-this-week
      weeklyMessageTemplate:
        "🚗 Who needs a ride this Sunday? React with ✅ to sign up!",
      weeklySendDay: 5, // Friday
      weeklySendTime: "18:00",
    },
  });

  const drivers = [
    { fullName: "Sarah Kim", phoneNumber: "+16195550101", email: "sarah@example.com", discordId: "300000000000000001", pickupZone: PickupLocation.Mesa, seatsAvailable: 4 },
    { fullName: "Marcus Lee", phoneNumber: "+16195550102", email: "marcus@example.com", discordId: "300000000000000002", pickupZone: PickupLocation.PV1, seatsAvailable: 3 },
    { fullName: "Priya Patel", phoneNumber: "+16195550103", email: null, discordId: "300000000000000003", pickupZone: PickupLocation.Camino, seatsAvailable: 5 },
  ];
  for (const d of drivers) {
    const existing = await prisma.driver.findFirst({ where: { phoneNumber: d.phoneNumber } });
    if (!existing) await prisma.driver.create({ data: { ...d, churchId: church.id } });
  }

  const members = [
    { discordId: "400000000000000001", discordUsername: "jenny.c", fullName: "Jenny Chen", phoneNumber: "+18585550201", pickupLocation: PickupLocation.Mesa, preferences: "needs early pickup" },
    { discordId: "400000000000000002", discordUsername: "dave_r", fullName: "David Ramirez", phoneNumber: "+18585550202", pickupLocation: PickupLocation.UTC, preferences: null },
    { discordId: "400000000000000003", discordUsername: "amara.o", fullName: "Amara Obi", phoneNumber: "+18585550203", pickupLocation: PickupLocation.Midway, preferences: "has mobility needs" },
    { discordId: "400000000000000004", discordUsername: "tomwu", fullName: "Tom Wu", phoneNumber: "+18585550204", pickupLocation: PickupLocation.PV2, preferences: null },
    { discordId: "400000000000000005", discordUsername: "lils", fullName: "Lily Santos", phoneNumber: "+18585550205", pickupLocation: PickupLocation.VDC, preferences: "usually brings a friend" },
  ];
  const createdMembers: { id: string }[] = [];
  for (const m of members) {
    createdMembers.push(
      await prisma.member.upsert({
        where: { discordId: m.discordId },
        update: {},
        create: { ...m, churchId: church.id },
      })
    );
  }

  // A sample week of ride requests so the dashboard isn't empty on first run.
  const weekDate = nextSunday();
  for (const m of createdMembers.slice(0, 4)) {
    await prisma.rideRequest.upsert({
      where: { memberId_weekDate: { memberId: m.id, weekDate } },
      update: {},
      create: { memberId: m.id, weekDate },
    });
  }

  console.log(`Seeded church "${church.name}" with ${members.length} members, ${drivers.length} drivers, and 4 ride requests for ${weekDate.toISOString().slice(0, 10)}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
