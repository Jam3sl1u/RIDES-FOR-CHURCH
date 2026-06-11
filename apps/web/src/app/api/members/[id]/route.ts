import { NextResponse } from "next/server";
import { prisma } from "@church-rides/db";
import { normalizeUSPhone } from "@church-rides/types";
import { requireAdmin } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.fullName) data.fullName = String(body.fullName).trim();
  if (body.preferences !== undefined) data.preferences = body.preferences || null;
  if (body.pickupLocation) data.pickupLocation = body.pickupLocation;
  if (body.phoneNumber) {
    const phone = normalizeUSPhone(body.phoneNumber);
    if (!phone) return NextResponse.json({ error: "Invalid US phone number" }, { status: 400 });
    data.phoneNumber = phone;
  }

  const member = await prisma.member.update({ where: { id: params.id }, data });
  return NextResponse.json(member);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await prisma.member.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
