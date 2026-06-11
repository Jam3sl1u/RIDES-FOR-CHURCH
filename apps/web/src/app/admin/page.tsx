import Link from "next/link";
import { prisma } from "@church-rides/db";
import { upcomingSunday, routeIndex } from "@church-rides/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const weekDate = upcomingSunday();
  const weekLabel = weekDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const [requests, assignments, drivers] = await Promise.all([
    prisma.rideRequest.findMany({ where: { weekDate }, include: { member: true } }),
    prisma.rideAssignment.findMany({ where: { weekDate }, include: { driver: true, member: true } }),
    prisma.driver.findMany({ orderBy: { fullName: "asc" } }),
  ]);

  const availableDrivers = drivers.filter((d) => d.isAvailableThisWeek);
  const seats = availableDrivers.reduce((s, d) => s + d.seatsAvailable, 0);
  const unassigned = requests.filter((r) => r.status !== "ASSIGNED" && r.status !== "CANCELLED");

  const byDriver = new Map<string, typeof assignments>();
  for (const a of assignments) {
    byDriver.set(a.driverId, [...(byDriver.get(a.driverId) ?? []), a]);
  }

  const stats = [
    { label: "Ride requests", value: requests.length, href: "/admin/assignments" },
    { label: "Assigned", value: assignments.length, href: "/admin/assignments" },
    { label: "Waiting for a seat", value: unassigned.length, href: "/admin/assignments" },
    { label: "Seats available", value: `${seats} · ${availableDrivers.length} drivers`, href: "/admin/drivers" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">This week</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Sunday, {weekLabel}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition hover:border-navy/30">
            <p className="text-sm text-navy-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </Link>
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Cars this Sunday</h2>
          {byDriver.size === 0 ? (
            <p className="mt-3 text-sm text-navy-muted">
              No assignments yet. They generate automatically Saturday at 11:45 AM, or run them now from{" "}
              <Link href="/admin/assignments" className="underline">Assignments</Link>.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {[...byDriver.values()].map((list) => {
                const riders = [...list].sort(
                  (a, b) => routeIndex(a.member.pickupLocation) - routeIndex(b.member.pickupLocation)
                );
                const d = list[0].driver;
                return (
                  <li key={d.id} className="rounded-lg bg-parchment p-4">
                    <p className="font-medium">
                      {d.fullName}{" "}
                      <span className="text-sm font-normal text-navy-muted">
                        · {list.length}/{d.seatsAvailable} seats · zone {d.pickupZone}
                      </span>
                    </p>
                    <ol className="mt-2 space-y-1 text-sm">
                      {riders.map((a, i) => (
                        <li key={a.id}>
                          {i + 1}. {a.member.fullName} — {a.member.pickupLocation}
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold">Driver availability</h2>
          <ul className="mt-4 divide-y divide-navy/10">
            {drivers.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                <span>
                  {d.fullName}
                  <span className="ml-2 text-navy-muted">{d.pickupZone} · {d.seatsAvailable} seats</span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    d.isAvailableThisWeek ? "bg-green-100 text-green-800" : "bg-navy/10 text-navy-muted"
                  }`}
                >
                  {d.isAvailableThisWeek ? "Driving" : "Off this week"}
                </span>
              </li>
            ))}
            {drivers.length === 0 && (
              <li className="py-2.5 text-sm text-navy-muted">
                No drivers yet — add one from the <Link href="/admin/drivers" className="underline">Drivers</Link> page.
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
