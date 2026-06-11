/** Pickup-chain order used for routing. Index = priority. */
export const PICKUP_ROUTE = [
  "Mesa",
  "UTC",
  "Midway",
  "PV1",
  "PV2",
  "Vdcn",
  "Camino",
  "VDC",
] as const;

export type PickupLocationName = (typeof PICKUP_ROUTE)[number];

export const routeIndex = (loc: string): number => {
  const i = PICKUP_ROUTE.indexOf(loc as PickupLocationName);
  return i === -1 ? PICKUP_ROUTE.length : i;
};

/** US phone validation: accepts (619) 555-0101, 619-555-0101, 6195550101, +16195550101. */
export const US_PHONE_REGEX = /^(\+1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})$/;

/** Normalize a validated US phone number to E.164 (+1XXXXXXXXXX). */
export function normalizeUSPhone(raw: string): string | null {
  const m = raw.trim().match(US_PHONE_REGEX);
  if (!m) return null;
  return `+1${m[2]}${m[3]}${m[4]}`;
}

/** Returns the upcoming Sunday at 00:00 UTC (today if today is Sunday). */
export function upcomingSunday(from = new Date()): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7));
  return d;
}

export interface AssignmentSummary {
  driverId: string;
  driverName: string;
  seatsAvailable: number;
  riders: {
    memberId: string;
    fullName: string;
    phoneNumber: string;
    pickupLocation: PickupLocationName;
    preferences?: string | null;
  }[];
}
