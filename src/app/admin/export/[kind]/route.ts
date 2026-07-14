import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, emailList, enquiries, kpis, kpiScores, payments, staffUsers } from "@/lib/db/schema";
import { hasRole } from "@/lib/admin-auth";

/** Records and analytics, downloadable as CSV. Business records: owner and
 *  admin. Performance report: owner and HR. */

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
  const { kind } = await ctx.params;
  const session =
    kind === "performance" ? await hasRole("owner", "hr") : await hasRole("owner", "admin");
  if (!session) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
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
  } else if (kind === "performance") {
    const [allScores, allKpis, people] = await Promise.all([
      db.select().from(kpiScores).orderBy(desc(kpiScores.periodDate)),
      db.select().from(kpis),
      db.select().from(staffUsers).where(eq(staffUsers.isActive, true)),
    ]);
    const kpiBy = new Map(allKpis.map((k) => [k.id, k]));
    const staffBy = new Map(people.map((p) => [p.id, p]));
    rows = allScores.map((s) => {
      const k = kpiBy.get(s.kpiId);
      const p = k ? staffBy.get(k.staffId) : undefined;
      return {
        period_date: s.periodDate,
        staff: p?.name ?? k?.staffId,
        role: p?.role,
        kpi: k?.title,
        cadence: k?.cadence,
        target: k?.target,
        weight: k?.weight,
        achieved: s.achieved,
        completion_pct: k ? Math.round(Math.min(1, s.achieved / Math.max(1, k.target)) * 100) : "",
        note: s.note,
        recorded_by: s.recordedBy,
      };
    });
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
