import { NextResponse } from "next/server";
import { prisma } from "@church-rides/db";
import { requireAdmin } from "@/lib/api";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const church = await prisma.church.findFirst();
  return NextResponse.json(church);
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json();
  const church = await prisma.church.findFirst();
  if (!church) return NextResponse.json({ error: "No church configured yet" }, { status: 400 });

  if (body.weeklySendTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.weeklySendTime)) {
    return NextResponse.json({ error: "weeklySendTime must be HH:mm (24h)" }, { status: 400 });
  }

  const updated = await prisma.church.update({
    where: { id: church.id },
    data: {
      name: body.name ?? undefined,
      signupChannelId: body.signupChannelId ?? undefined,
      weeklyChannelId: body.weeklyChannelId ?? undefined,
      weeklyMessageTemplate: body.weeklyMessageTemplate ?? undefined,
      weeklySendDay: body.weeklySendDay !== undefined ? Number(body.weeklySendDay) : undefined,
      weeklySendTime: body.weeklySendTime ?? undefined,
    },
  });
  return NextResponse.json(updated);
}
