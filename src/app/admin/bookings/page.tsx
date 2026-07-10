import { redirect } from "next/navigation";
import { asc, and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { staffUsers } from "@/lib/db/schema";
import { hasRole } from "@/lib/admin-auth";
import { formatNaira } from "@/lib/quote";
import { listBookings } from "@/lib/repo";
import { bookingStats } from "@/lib/payments";
import { getTripType } from "@/lib/trip-types";
import Link from "next/link";
import { adminFollowUpMessage, customerWaLink } from "@/lib/whatsapp";
import {
  assignDriverAction,
  deleteBookingAction,
  saveAdminNotesAction,
  setBookingPriceAction,
  setBookingStatusAction,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  pending_payment: "border-cream/25 text-cream-dim",
  pending_confirmation: "border-emerald-glow/40 text-emerald-glow",
  confirmed: "border-emerald-glow/40 text-emerald-glow",
  completed: "border-cream/20 text-muted",
  cancelled: "border-red-400/40 text-red-300",
};

export default async function AdminBookings({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await hasRole("owner", "admin", "sales");
  if (!session) redirect("/admin");
  const { created } = await searchParams;
  const canExport = session.role === "owner" || session.role === "admin";
  const canPrice = canExport;
  const canDelete = session.role === "owner";
  const db = await getDb();
  const [rows, stats, drivers] = await Promise.all([
    listBookings(),
    bookingStats(),
    db
      .select()
      .from(staffUsers)
      .where(and(eq(staffUsers.role, "driver"), eq(staffUsers.isActive, true)))
      .orderBy(asc(staffUsers.name)),
  ]);
  const driverName = (id: number | null) => drivers.find((d) => d.id === id)?.name;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-2xl text-cream">Bookings</h1>
          <p className="mt-1 text-sm text-muted">
            {stats.count} total · {formatNaira(Number(stats.revenue))} collected
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canExport && (
            <>
              <a href="/admin/export/bookings" className="btn btn-ghost btn-sm" download>Bookings CSV</a>
              <a href="/admin/export/payments" className="btn btn-ghost btn-sm" download>Payments CSV</a>
              <a href="/admin/export/emails" className="btn btn-ghost btn-sm" download>Email list CSV</a>
            </>
          )}
          <Link href="/admin/bookings/new" className="btn btn-primary btn-sm">
            + New phone-in booking
          </Link>
        </div>
      </div>

      {created && (
        <p className="glass-subtle mt-4 !border-emerald-glow/40 p-3 text-sm text-emerald-glow">
          Booking {created} created — the client has been emailed their booking details
          {" "}and payment link.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="glass-subtle mt-8 p-10 text-center text-sm text-muted">
          No bookings yet. They&apos;ll appear here the moment a customer reserves.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((b) => {
            const trip = getTripType(b.tripType);
            const outstanding = Math.max(0, b.amountDue - b.amountPaid);
            return (
              <details key={b.id} className="glass-subtle overflow-hidden">
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-sm text-emerald-glow">{b.ref}</span>
                  <span className="text-sm text-cream">{b.customerName}</span>
                  <span className="text-xs text-muted">
                    {trip?.shortLabel ?? b.tripType}
                    {b.vehicleName ? ` · ${b.vehicleName}` : ""} · {b.pickupDate} {b.pickupTime}
                  </span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-sm text-cream">{formatNaira(b.quoteTotal)}</span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-wider ${STATUS_TONE[b.status] ?? ""}`}
                    >
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </span>
                </summary>

                <div className="border-t hairline p-4">
                  <div className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <p><span className="text-muted">Phone:</span> <span className="text-cream">{b.customerPhone}</span></p>
                    <p><span className="text-muted">Email:</span> <span className="text-cream">{b.customerEmail}</span></p>
                    <p><span className="text-muted">Pickup:</span> <span className="text-cream">{b.pickupLocation}</span></p>
                    {b.destination && (
                      <p><span className="text-muted">Destination:</span> <span className="text-cream">{b.destination}{b.destinationState ? `, ${b.destinationState}` : ""}</span></p>
                    )}
                    {b.numDays > 1 && <p><span className="text-muted">Days:</span> <span className="text-cream">{b.numDays}</span></p>}
                    <p><span className="text-muted">Passengers / luggage:</span> <span className="text-cream">{b.passengers} / {b.luggage}</span></p>
                    {b.flightNumber && <p><span className="text-muted">Flight:</span> <span className="text-cream">{b.flightNumber}</span></p>}
                    {b.addOns.length > 0 && (
                      <p><span className="text-muted">Add-ons:</span> <span className="text-cream">{b.addOns.map((a) => a.label).join(", ")}</span></p>
                    )}
                    <p>
                      <span className="text-muted">Payment:</span>{" "}
                      <span className="text-cream">
                        {b.paymentOption.replace(/_/g, " ")} · paid {formatNaira(b.amountPaid)}
                        {outstanding > 0 ? ` · outstanding ${formatNaira(outstanding)}` : " · settled"}
                      </span>
                    </p>
                    {b.isEstimate && <p className="text-cream-dim">Contains estimated items — confirm final price</p>}
                    {b.notes && <p className="sm:col-span-2 lg:col-span-3"><span className="text-muted">Customer notes:</span> <span className="text-cream">{b.notes}</span></p>}
                  </div>

                  {canPrice && (b.isEstimate || b.quoteTotal === 0) && (
                    <form
                      action={setBookingPriceAction}
                      className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-champagne/30 bg-ink/40 p-3"
                    >
                      <input type="hidden" name="id" value={b.id} />
                      <span className="text-xs uppercase tracking-wider text-champagne">
                        Concierge pricing
                      </span>
                      <input
                        name="finalPrice"
                        type="number"
                        min={1000}
                        step={500}
                        placeholder="Final price (₦)"
                        className="field !w-44 !py-1.5 text-sm"
                        required
                      />
                      <button className="btn btn-primary btn-sm">
                        Set price &amp; email payment link
                      </button>
                    </form>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <form action={assignDriverAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={b.id} />
                      <select
                        name="driverId"
                        className="field !w-44 !py-1.5 text-sm"
                        defaultValue={b.assignedDriverId ?? ""}
                        aria-label="Assign driver"
                      >
                        <option value="">No driver assigned</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <button className="btn btn-ghost btn-sm">Assign</button>
                    </form>
                    {b.assignedDriverId && (
                      <span className="text-xs text-emerald-glow">
                        Driver: {driverName(b.assignedDriverId) ?? "—"}
                        {b.tripCompletedAt ? " · trip completed" : b.tripStartedAt ? " · trip in progress" : ""}
                      </span>
                    )}
                    <a
                      href={customerWaLink(b.customerPhone, adminFollowUpMessage(b))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-whatsapp btn-sm"
                    >
                      WhatsApp {b.customerName.split(" ")[0]}
                    </a>
                    {(["confirmed", "completed", "cancelled"] as const).map((s) => (
                      <form key={s} action={setBookingStatusAction}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="status" value={s} />
                        <button
                          className={`btn btn-sm ${s === "confirmed" ? "btn-primary" : s === "cancelled" ? "btn-ghost !text-red-300" : "btn-ghost"}`}
                          disabled={b.status === s}
                        >
                          {s === "confirmed" ? "Mark confirmed" : s === "completed" ? "Mark completed" : "Cancel"}
                        </button>
                      </form>
                    ))}
                  </div>

                  <form action={saveAdminNotesAction} className="mt-4 flex gap-2">
                    <input type="hidden" name="id" value={b.id} />
                    <input
                      name="adminNotes"
                      className="field !py-2 text-sm"
                      placeholder="Internal note…"
                      defaultValue={b.adminNotes ?? ""}
                    />
                    <button className="btn btn-ghost btn-sm shrink-0">Save note</button>
                  </form>

                  {canDelete && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-muted hover:text-red-300">
                        Delete this record (owner only)
                      </summary>
                      <form action={deleteBookingAction} className="mt-2 flex items-center gap-3">
                        <input type="hidden" name="id" value={b.id} />
                        <span className="text-xs text-red-300">
                          Permanently removes {b.ref} and its payment records. Prefer Cancel to keep the history.
                        </span>
                        <button className="btn btn-ghost btn-sm !border-red-400/40 !text-red-300 shrink-0">
                          Delete permanently
                        </button>
                      </form>
                    </details>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
