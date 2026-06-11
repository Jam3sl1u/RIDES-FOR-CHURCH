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
  if (body.email !== undefined) data.email = body.email || null;
  if (body.discordId !== undefined) data.discordId = body.discordId || null;
  if (body.pickupZone) data.pickupZone = body.pickupZone;
  if (body.seatsAvailable !== undefined) data.seatsAvailable = Number(body.seatsAvailable);
  if (body.isAvailableThisWeek !== undefined) data.isAvailableThisWeek = !!body.isAvailableThisWeek;
  if (body.phoneNumber) {
    const phone = normalizeUSPhone(body.phoneNumber);
    if (!phone) return NextResponse.json({ error: "Invalid US phone number" }, { status: 400 });
    data.phoneNumber = phone;
  }

  const driver = await prisma.driver.update({ where: { id: params.id }, data });
  return NextResponse.json(driver);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await prisma.driver.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
