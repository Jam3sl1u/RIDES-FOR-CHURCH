import { prisma } from "@church-rides/db";
import DriversManager from "@/components/DriversManager";

export const dynamic = "force-dynamic";

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({ orderBy: { fullName: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
        <p className="mt-1 text-sm text-navy-muted">
          Toggle who's driving this week — only available drivers get assignments and Saturday notifications.
        </p>
      </div>
      <DriversManager initialDrivers={drivers} />
    </div>
  );
}
