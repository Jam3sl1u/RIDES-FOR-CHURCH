import { NextResponse } from "next/server";
import { prisma, assignRidesForWeek } from "@church-rides/db";
import { upcomingSunday } from "@church-rides/types";
import { requireAdmin } from "@/lib/api";

/** GET ?week=YYYY-MM-DD — assignments + unassigned riders for a week (default: upcoming Sunday). */
export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const weekParam = new URL(req.url).searchParams.get("week");
  const weekDate = weekParam ? new Date(`${weekParam}T00:00:00Z`) : upcomingSunday();

  const [assignments, unassigned] = await Promise.all([
    prisma.rideAssignment.findMany({
      where: { weekDate },
      include: { driver: true, member: true },
    }),
    prisma.rideRequest.findMany({
      where: { weekDate, status: { in: ["PENDING", "UNASSIGNED"] } },
      include: { member: true },
    }),
  ]);

  return NextResponse.json({ weekDate, assignments, unassigned });
}

/** POST — run the assignment algorithm now for the upcoming Sunday. */
export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const weekDate = upcomingSunday();
  const result = await assignRidesForWeek(weekDate);
  return NextResponse.json({ weekDate, ...result });
}

/** PATCH — manual override: move a member to a driver (or null = unassign) for a week. */
export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { memberId, driverId, week } = await req.json();
  if (!memberId || !week) {
    return NextResponse.json({ error: "memberId and week are required" }, { status: 400 });
  }
  const weekDate = new Date(`${week}T00:00:00Z`);

  await prisma.rideAssignment.deleteMany({ where: { memberId, weekDate } });

  if (driverId) {
    await prisma.rideAssignment.create({ data: { memberId, driverId, weekDate } });
    await prisma.rideRequest.updateMany({
      where: { memberId, weekDate },
      data: { status: "ASSIGNED" },
    });
  } else {
    await prisma.rideRequest.updateMany({
      where: { memberId, weekDate },
      data: { status: "UNASSIGNED" },
    });
  }

  return NextResponse.json({ ok: true });
}
