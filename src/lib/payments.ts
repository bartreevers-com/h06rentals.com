import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { bookings, payments } from "./db/schema";
import { sendEmail } from "./email";
import { formatNaira } from "./quote";

/**
 * Settle a payment record and roll the result up to its booking.
 * Idempotent: a payment already in a terminal state is left untouched.
 */
export async function settlePayment(opts: {
  reference: string;
  outcome: "success" | "failed";
  channel?: string;
  paidAt?: Date;
  amountNgn?: number; // verified amount from the gateway
  raw?: unknown;
}): Promise<{ bookingRef: string | null; applied: boolean }> {
  const db = await getDb();
  const rows = await db.select().from(payments).where(eq(payments.reference, opts.reference)).limit(1);
  const payment = rows[0];
  if (!payment) return { bookingRef: null, applied: false };
  if (payment.status !== "pending") {
    const b = await db.select().from(bookings).where(eq(bookings.id, payment.bookingId)).limit(1);
    return { bookingRef: b[0]?.ref ?? null, applied: false };
  }

  await db
    .update(payments)
    .set({
      status: opts.outcome,
      channel: opts.channel ?? payment.channel,
      paidAt: opts.paidAt ?? (opts.outcome === "success" ? new Date() : null),
      raw: opts.raw ?? payment.raw,
    })
    .where(eq(payments.id, payment.id));

  const bRows = await db.select().from(bookings).where(eq(bookings.id, payment.bookingId)).limit(1);
  const booking = bRows[0];
  if (!booking) return { bookingRef: null, applied: true };

  if (opts.outcome === "success") {
    const credited = opts.amountNgn ?? payment.amountNgn;
    const newPaid = booking.amountPaid + credited;
    await db
      .update(bookings)
      .set({
        amountPaid: newPaid,
        status: "pending_confirmation",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id));

    await sendEmail({
      to: booking.customerEmail,
      subject: `Payment received — booking ${booking.ref}`,
      text: [
        `Dear ${booking.customerName},`,
        ``,
        `We have received your payment of ${formatNaira(credited)} for booking ${booking.ref}.`,
        booking.vehicleName ? `Vehicle: ${booking.vehicleName}` : null,
        `Pickup: ${booking.pickupLocation} on ${booking.pickupDate} at ${booking.pickupTime}`,
        ``,
        `Our concierge will confirm your booking shortly on WhatsApp.`,
        ``,
        `H06 Rentals — Luxury Car Hire, Lagos`,
      ]
        .filter((x): x is string => x !== null)
        .join("\n"),
    });
    await sendEmail({
      to: process.env.ADMIN_NOTIFY_EMAIL ?? "hello@h06rentals.com",
      subject: `Payment ${formatNaira(credited)} received — ${booking.ref}`,
      text: `Booking ${booking.ref} (${booking.customerName}, ${booking.customerPhone}) paid ${formatNaira(credited)} via ${payment.provider}. Total paid: ${formatNaira(newPaid)} of ${formatNaira(booking.amountDue)}.`,
    });
  }

  return { bookingRef: booking.ref, applied: true };
}

export async function getPaymentByReference(reference: string) {
  const db = await getDb();
  const rows = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
  return rows[0] ?? null;
}

export async function bookingStats() {
  const db = await getDb();
  const totals = await db
    .select({
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(amount_paid), 0)`,
    })
    .from(bookings);
  return totals[0] ?? { count: 0, revenue: 0 };
}
