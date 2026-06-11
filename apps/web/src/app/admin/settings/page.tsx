import { prisma } from "@church-rides/db";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const church = await prisma.church.findFirst();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Church Settings</h1>
        <p className="mt-1 text-sm text-navy-muted">
          Controls the Discord bot: where it listens, what it posts, and when.
        </p>
      </div>
      {church ? (
        <SettingsForm church={church} />
      ) : (
        <div className="card p-6 text-sm text-navy-muted">
          No church configured yet. Run <code className="rounded bg-parchment px-1.5 py-0.5">npm run db:seed</code>{" "}
          or insert a Church row to get started.
        </div>
      )}
    </div>
  );
}
