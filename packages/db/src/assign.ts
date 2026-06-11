import { prisma } from "./index";
import { routeIndex } from "@church-rides/types";

/**
 * Ride assignment — runs Saturday 11:45 AM (or on demand from the admin dashboard).
 *
 * Priority routing chain: Mesa → UTC → Midway → PV1 → PV2 → Vdcn → Camino → VDC
 *
 * Strategy:
 *  1. Sort pending riders by their position in the chain.
 *  2. Sort available drivers by their zone's position in the chain.
 *  3. For each driver (in chain order), fill seats starting with riders in the
 *     driver's own zone, then spill into the nearest zones along the chain
 *     (smallest chain distance first), respecting seats_available.
 *  4. Overflow riders roll to the next driver; anyone left is marked UNASSIGNED.
 */
export async function assignRidesForWeek(weekDate: Date) {
  const requests = await prisma.rideRequest.findMany({
    where: { weekDate, status: { in: ["PENDING", "UNASSIGNED"] } },
    include: { member: true },
  });

  const drivers = await prisma.driver.findMany({
    where: { isAvailableThisWeek: true },
  });

  // Wipe any previous run for the week so re-runs are idempotent.
  await prisma.rideAssignment.deleteMany({ where: { weekDate } });

  const riders = requests
    .map((r) => ({ requestId: r.id, member: r.member }))
    .sort((a, b) => routeIndex(a.member.pickupLocation) - routeIndex(b.member.pickupLocation));

  const sortedDrivers = [...drivers].sort(
    (a, b) => routeIndex(a.pickupZone) - routeIndex(b.pickupZone)
  );

  const unassigned = new Set(riders.map((r) => r.requestId));
  const assignments: { driverId: string; memberId: string; requestId: string }[] = [];

  for (const driver of sortedDrivers) {
    let seatsLeft = driver.seatsAvailable;
    if (seatsLeft <= 0) continue;

    const driverZone = routeIndex(driver.pickupZone);

    // Candidates sorted by: distance from the driver's zone along the chain,
    // then by chain position (so pickup order follows the route).
    const candidates = riders
      .filter((r) => unassigned.has(r.requestId))
      .sort((a, b) => {
        const da = Math.abs(routeIndex(a.member.pickupLocation) - driverZone);
        const db = Math.abs(routeIndex(b.member.pickupLocation) - driverZone);
        if (da !== db) return da - db;
        return routeIndex(a.member.pickupLocation) - routeIndex(b.member.pickupLocation);
      });

    for (const rider of candidates) {
      if (seatsLeft === 0) break;
      assignments.push({
        driverId: driver.id,
        memberId: rider.member.id,
        requestId: rider.requestId,
      });
      unassigned.delete(rider.requestId);
      seatsLeft--;
    }
  }

  await prisma.$transaction([
    prisma.rideAssignment.createMany({
      data: assignments.map((a) => ({ driverId: a.driverId, memberId: a.memberId, weekDate })),
    }),
    prisma.rideRequest.updateMany({
      where: { id: { in: assignments.map((a) => a.requestId) } },
      data: { status: "ASSIGNED" },
    }),
    prisma.rideRequest.updateMany({
      where: { id: { in: [...unassigned] } },
      data: { status: "UNASSIGNED" },
    }),
  ]);

  return {
    assigned: assignments.length,
    unassigned: unassigned.size,
    drivers: sortedDrivers.length,
  };
}
