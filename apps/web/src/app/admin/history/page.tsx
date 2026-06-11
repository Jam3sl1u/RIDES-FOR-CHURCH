import { prisma } from "@church-rides/db";
import { routeIndex } from "@church-rides/types";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [assignments, requests] = await Promise.all([
    prisma.rideAssignment.findMany({
      include: { driver: true, member: true },
      orderBy: { weekDate: "desc" },
      take: 500,
    }),
    prisma.rideRequest.groupBy({
      by: ["weekDate"],
      _count: { _all: true },
      orderBy: { weekDate: "desc" },
      take: 26,
    }),
  ]);

  const requestCounts = new Map<string, number>(
    requests.map((r) => [r.weekDate.toISOString(), r._count._all])
  );

  // Group assignments by week, then by driver.
  const weeks = new Map<string, Map<string, typeof assignments>>();
  for (const a of assignments) {
    const wk = a.weekDate.toISOString();
    const byDriver = weeks.get(wk) ?? new Map();
    byDriver.set(a.driverId, [...(byDriver.get(a.driverId) ?? []), a]);
    weeks.set(wk, byDriver);
  }

  const weekKeys = [...new Set([...weeks.keys(), ...requestCounts.keys()])].sort().reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-navy-muted">Past Sundays — who asked, who drove, who rode.</p>
      </div>

      {weekKeys.length === 0 && (
        <div className="card p-6 text-sm text-navy-muted">
          Nothing yet — history fills in after your first Sunday of rides.
        </div>
      )}

      <div className="space-y-6">
        {weekKeys.map((wk) => {
          const date = new Date(wk);
          const byDriver = weeks.get(wk);
          const assigned = byDriver ? [...byDriver.values()].reduce((s, l) => s + l.length, 0) : 0;
          const requested = requestCounts.get(wk) ?? assigned;

          return (
            <section key={wk} className="card p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {date.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </h2>
                <p className="text-sm text-navy-muted">
                  {requested} requested · {assigned} assigned · {byDriver?.size ?? 0} cars
                </p>
              </div>

              {byDriver && byDriver.size > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {[...byDriver.values()].map((list) => {
                    const riders = [...list].sort(
                      (a, b) => routeIndex(a.member.pickupLocation) - routeIndex(b.member.pickupLocation)
                    );
                    return (
                      <div key={list[0].driverId} className="rounded-lg bg-parchment p-4 text-sm">
                        <p className="font-medium">{list[0].driver.fullName}</p>
                        <ol className="mt-1.5 space-y-0.5 text-navy-muted">
                          {riders.map((a, i) => (
                            <li key={a.id}>
                              {i + 1}. {a.member.fullName} — {a.member.pickupLocation}
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm text-navy-muted">Requests came in, but no assignments were recorded.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
