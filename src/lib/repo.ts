import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  addOns,
  bookings,
  enquiries,
  interstateSurcharges,
  payments,
  vehicleRates,
  vehicles,
  type Booking,
} from "./db/schema";

export async function listVehicles(opts?: { tier?: "core" | "vip"; includeUnavailable?: boolean }) {
  const db = await getDb();
  const rows = await db.select().from(vehicles).orderBy(asc(vehicles.sortOrder));
  return rows.filter(
    (v) =>
      (opts?.includeUnavailable || v.isAvailable) &&
      (!opts?.tier || v.tier === opts.tier),
  );
}

export async function getVehicle(slug: string) {
  const db = await getDb();
  const rows = await db.select().from(vehicles).where(eq(vehicles.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getRate(slug: string) {
  const db = await getDb();
  const rows = await db.select().from(vehicleRates).where(eq(vehicleRates.vehicleSlug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function listRates() {
  const db = await getDb();
  return db.select().from(vehicleRates);
}

export async function listAddOns(activeOnly = true) {
  const db = await getDb();
  const rows = await db.select().from(addOns).orderBy(asc(addOns.sortOrder));
  return activeOnly ? rows.filter((a) => a.isActive) : rows;
}

export async function listSurcharges() {
  const db = await getDb();
  return db.select().from(interstateSurcharges).orderBy(asc(interstateSurcharges.state));
}

export async function nextBookingRef(): Promise<string> {
  const db = await getDb();
  const rows = await db.select({ n: sql<number>`coalesce(max(id), 0)` }).from(bookings);
  return `H06-${String(Number(rows[0]?.n ?? 0) + 1).padStart(5, "0")}`;
}

export async function getBookingByRef(ref: string): Promise<Booking | null> {
  const db = await getDb();
  const rows = await db.select().from(bookings).where(eq(bookings.ref, ref)).limit(1);
  return rows[0] ?? null;
}

export async function listBookings() {
  const db = await getDb();
  return db.select().from(bookings).orderBy(desc(bookings.createdAt));
}

export async function listPaymentsForBooking(bookingId: number) {
  const db = await getDb();
  return db.select().from(payments).where(eq(payments.bookingId, bookingId)).orderBy(desc(payments.createdAt));
}

export async function listEnquiries() {
  const db = await getDb();
  return db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
}
