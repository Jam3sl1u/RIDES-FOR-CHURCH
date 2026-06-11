import { prisma } from "@church-rides/db";
import { upcomingSunday } from "@church-rides/types";
import AssignmentsBoard from "@/components/AssignmentsBoard";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const weekDate = upcomingSunday();
  const week = weekDate.toISOString().slice(0, 10);

  const [assignments, pending, drivers] = await Promise.all([
    prisma.rideAssignment.findMany({ where: { weekDate }, include: { member: true } }),
    prisma.rideRequest.findMany({
      where: { weekDate, status: { in: ["PENDING", "UNASSIGNED"] } },
      include: { member: true },
    }),
    prisma.driver.findMany({ where: { isAvailableThisWeek: true }, orderBy: { fullName: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
        <p className="mt-1 text-sm text-navy-muted">
          Drag riders between cars to override the automatic plan. Changes save instantly.
        </p>
      </div>
      <AssignmentsBoard
        week={week}
        drivers={drivers}
        initialAssignments={assignments.map((a) => ({
          memberId: a.memberId,
          driverId: a.driverId,
          fullName: a.member.fullName,
          phoneNumber: a.member.phoneNumber,
          pickupLocation: a.member.pickupLocation,
        }))}
        initialUnassigned={pending.map((r) => ({
          memberId: r.memberId,
          driverId: null,
          fullName: r.member.fullName,
          phoneNumber: r.member.phoneNumber,
          pickupLocation: r.member.pickupLocation,
        }))}
      />
    </div>
  );
}
