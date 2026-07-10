import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, emailList, enquiries, payments } from "@/lib/db/schema";
import { hasRole } from "@/lib/admin-auth";

/** Records and analytics, downloadable as CSV (owner and admin). */

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  if (!(await hasRole("owner", "admin"))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
  const { kind } = await ctx.params;
  const db = await getDb();

  let rows: Record<string, unknown>[] = [];
  if (kind === "bookings") {
    rows = (await db.select().from(bookings).orderBy(desc(bookings.createdAt))).map((b) => ({
      ref: b.ref,
      status: b.status,
      created: b.createdAt?.toISOString(),
      trip: b.tripType,
      vehicle: b.vehicleName,
      pickup_date: b.pickupDate,
      pickup_time: b.pickupTime,
      pickup: b.pickupLocation,
      destination: b.destination,
      customer: b.customerName,
      phone: b.customerPhone,
      email: b.customerEmail,
      quote_total_ngn: b.quoteTotal,
      amount_due_ngn: b.amountDue,
      amount_paid_ngn: b.amountPaid,
      is_estimate: b.isEstimate,
      payment_option: b.paymentOption,
      trip_started: b.tripStartedAt?.toISOString(),
      trip_completed: b.tripCompletedAt?.toISOString(),
      admin_notes: b.adminNotes,
    }));
  } else if (kind === "payments") {
    rows = (await db.select().from(payments).orderBy(desc(payments.createdAt))).map((p) => ({
      reference: p.reference,
      booking_id: p.bookingId,
      provider: p.provider,
      amount_ngn: p.amountNgn,
      status: p.status,
      channel: p.channel,
      paid_at: p.paidAt?.toISOString(),
      created: p.createdAt?.toISOString(),
    }));
  } else if (kind === "enquiries") {
    rows = (await db.select().from(enquiries).orderBy(desc(enquiries.createdAt))).map((e) => ({
      id: e.id,
      type: e.type,
      status: e.status,
      created: e.createdAt?.toISOString(),
      name: e.name,
      phone: e.phone,
      email: e.email,
      vehicle: e.vehicleSlug,
      message: e.message,
    }));
  } else if (kind === "emails") {
    rows = (await db.select().from(emailList).orderBy(desc(emailList.createdAt))).map((e) => ({
      email: e.email,
      name: e.name,
      phone: e.phone,
      source: e.source,
      joined: e.createdAt?.toISOString(),
    }));
  } else {
    return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="h06-${kind}-${stamp}.csv"`,
    },
  });
}
