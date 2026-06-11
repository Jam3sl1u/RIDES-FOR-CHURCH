import { NextResponse } from "next/server";
import { prisma } from "@church-rides/db";
import { requireAdmin } from "@/lib/api";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const q = new URL(req.url).searchParams.get("q")?.trim();
  const members = await prisma.member.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { discordUsername: { contains: q, mode: "insensitive" } },
            { phoneNumber: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json(members);
}
