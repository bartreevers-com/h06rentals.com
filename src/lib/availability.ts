import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { bookings, type Vehicle, type VehicleRate } from "./db/schema";

/**
 * Live availability, computed from bookings — no cron, no manual toggles.
 *
 * A vehicle is "busy" while a confirmed booking's trip window covers today
 * (Lagos time) and the driver hasn't completed the trip. The moment the
 * window passes — or the driver taps Complete — the car is bookable again
 * automatically. The manual isAvailable flag stays for maintenance.
 */

export function lagosToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function tripEnd(pickupDate: string, numDays: number, returnDate: string | null): string {
  if (returnDate && returnDate >= pickupDate) return returnDate;
  return addDaysISO(pickupDate, Math.max(0, numDays - 1));
}

export function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  });
}

interface Window {
  vehicleSlug: string;
  start: string;
  end: string;
}

async function confirmedWindows(): Promise<Window[]> {
  const db = await getDb();
  const rows = await db
    .select({
      vehicleSlug: bookings.vehicleSlug,
      pickupDate: bookings.pickupDate,
      numDays: bookings.numDays,
      returnDate: bookings.returnDate,
    })
    .from(bookings)
    .where(and(eq(bookings.status, "confirmed"), isNull(bookings.tripCompletedAt)));
  return rows
    .filter((r): r is typeof r & { vehicleSlug: string } => Boolean(r.vehicleSlug))
    .map((r) => ({
      vehicleSlug: r.vehicleSlug,
      start: r.pickupDate,
      end: tripEnd(r.pickupDate, r.numDays, r.returnDate),
    }));
}

/** slug → the date the car is busy until (only when busy TODAY). */
export async function getBusyMap(): Promise<Record<string, string>> {
  const today = lagosToday();
  const map: Record<string, string> = {};
  for (const w of await confirmedWindows()) {
    if (w.start <= today && today <= w.end) {
      if (!map[w.vehicleSlug] || w.end > map[w.vehicleSlug]) map[w.vehicleSlug] = w.end;
    }
  }
  return map;
}

/** Does a requested window overlap a confirmed booking for this vehicle? */
export async function findConflict(
  vehicleSlug: string,
  startDate: string,
  endDate: string,
): Promise<{ busyUntil: string } | null> {
  let worst: string | null = null;
  for (const w of await confirmedWindows()) {
    if (w.vehicleSlug !== vehicleSlug) continue;
    if (w.start <= endDate && startDate <= w.end) {
      if (!worst || w.end > worst) worst = w.end;
    }
  }
  return worst ? { busyUntil: worst } : null;
}

/** The next car to offer: same tier, free today, closest 12-hour rate. */
export function suggestAlternative(
  current: Vehicle,
  vehicles: Vehicle[],
  rates: VehicleRate[],
  busyMap: Record<string, string>,
): Vehicle | null {
  const rateOf = (slug: string) => rates.find((r) => r.vehicleSlug === slug)?.twelveHours ?? null;
  const base = rateOf(current.slug);
  const candidates = vehicles.filter(
    (v) => v.slug !== current.slug && v.tier === current.tier && v.isAvailable && !busyMap[v.slug],
  );
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => {
    // same category first, then closest price
    const catA = Number(b.category === current.category) - Number(a.category === current.category);
    if (catA !== 0) return catA;
    if (base === null) return 0;
    const ra = rateOf(a.slug);
    const rb = rateOf(b.slug);
    if (ra === null || rb === null) return ra === null ? 1 : -1;
    return Math.abs(ra - base) - Math.abs(rb - base);
  })[0];
}
