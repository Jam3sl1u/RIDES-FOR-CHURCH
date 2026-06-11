import { prisma } from "@church-rides/db";
import MembersTable from "@/components/MembersTable";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const members = await prisma.member.findMany({ orderBy: { fullName: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        <p className="mt-1 text-sm text-navy-muted">
          Everyone registered through #rides-signup. Edits here update what drivers see.
        </p>
      </div>
      <MembersTable
        initialMembers={members.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
