import { NextResponse } from "next/server";
import { prisma } from "@church-rides/db";
import { normalizeUSPhone } from "@church-rides/types";
import { requireAdmin } from "@/lib/api";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const drivers = await prisma.driver.findMany({ orderBy: { fullName: "asc" } });
  return NextResponse.json(drivers);
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json();
  const phone = normalizeUSPhone(body.phoneNumber ?? "");
  if (!body.fullName || !phone || !body.pickupZone) {
    return NextResponse.json(
      { error: "fullName, a valid US phoneNumber, and pickupZone are required" },
      { status: 400 }
    );
  }

  const church = await prisma.church.findFirst();
  if (!church) return NextResponse.json({ error: "No church configured yet" }, { status: 400 });

  const driver = await prisma.driver.create({
    data: {
      fullName: String(body.fullName).trim(),
      phoneNumber: phone,
      email: body.email || null,
      discordId: body.discordId || null,
      pickupZone: body.pickupZone,
      seatsAvailable: Number(body.seatsAvailable) || 4,
      churchId: church.id,
    },
  });
  return NextResponse.json(driver, { status: 201 });
}
