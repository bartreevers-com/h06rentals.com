import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { getSession } from "@/lib/admin-auth";
import { getTripType } from "@/lib/trip-types";
import { completeTripAction, startTripAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function DriverTrips() {
  const session = await getSession();
  if (!session) redirect("/admin");
  if (session.role === "sales") redirect("/admin/bookings");

  const db = await getDb();
  const rows =
    session.role === "driver"
      ? await db
          .select()
          .from(bookings)
          .where(eq(bookings.assignedDriverId, session.userId))
          .orderBy(desc(bookings.pickupDate))
      : await db.select().from(bookings).orderBy(desc(bookings.pickupDate));

  const active = rows.filter(
    (b) => !b.tripCompletedAt && ["confirmed", "pending_confirmation"].includes(b.status),
  );
  const done = rows.filter((b) => b.tripCompletedAt).slice(0, 5);

  return (
    <div>
      <h1 className="display text-2xl text-cream">My Trips</h1>
      <p className="mt-1 text-sm text-muted">
        {session.role === "driver"
          ? "Your assigned trips. Start when the customer is on board; complete when they arrive."
          : "All trips (admin view) — drivers see only their own assignments."}
      </p>

      <h2 className="eyebrow mb-3 mt-8">Upcoming &amp; active</h2>
      {active.length === 0 ? (
        <div className="glass-subtle p-8 text-center text-sm text-muted">
          Nothing assigned right now. New trips appear here the moment the office assigns them to you.
        </div>
      ) : (
        <div className="space-y-4">
          {active.map((b) => {
            const trip = getTripType(b.tripType);
            const started = Boolean(b.tripStartedAt);
            return (
              <div key={b.id} className={`glass-subtle p-5 ${started ? "!border-emerald-glow/50" : ""}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm text-emerald-glow">{b.ref}</span>
                  <span className="text-sm font-medium text-cream">
                    {b.pickupDate} · {b.pickupTime}
                  </span>
                  <span className="text-xs text-muted">
                    {trip?.shortLabel ?? b.tripType}
                    {b.vehicleName ? ` · ${b.vehicleName}` : ""}
                  </span>
                  {started && (
                    <span className="rounded-full border border-emerald-glow/40 px-2.5 py-0.5 text-[0.65rem] uppercase tracking-wider text-emerald-glow">
                      Trip in progress
                    </span>
                  )}
                </div>
                <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                  <p><span className="text-muted">Pickup:</span> <span className="text-cream">{b.pickupLocation}</span></p>
                  {b.destination && (
                    <p><span className="text-muted">Destination:</span> <span className="text-cream">{b.destination}{b.destinationState ? `, ${b.destinationState}` : ""}</span></p>
                  )}
                  <p><span className="text-muted">Passenger:</span> <span className="text-cream">{b.customerName} · {b.passengers} pax · {b.luggage} bags</span></p>
                  {b.flightNumber && <p><span className="text-muted">Flight:</span> <span className="text-cream">{b.flightNumber}</span></p>}
                  {b.notes && <p className="sm:col-span-2"><span className="text-muted">Notes:</span> <span className="text-cream">{b.notes}</span></p>}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`tel:${b.customerPhone}`} className="btn btn-ghost btn-sm">
                    Call {b.customerName.split(" ")[0]}
                  </a>
                  <a
                    href={`https://wa.me/${b.customerPhone.replace(/[^\d]/g, "").replace(/^0/, "234")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp btn-sm"
                  >
                    WhatsApp
                  </a>
                  {!started ? (
                    <form action={startTripAction}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="btn btn-primary btn-sm">Start trip</button>
                    </form>
                  ) : (
                    <form action={completeTripAction}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="btn btn-primary btn-sm">Complete trip</button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <>
          <h2 className="eyebrow mb-3 mt-10">Recently completed</h2>
          <div className="space-y-2">
            {done.map((b) => (
              <div key={b.id} className="glass-subtle flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="font-mono text-emerald-glow">{b.ref}</span>
                <span className="text-cream-dim">{b.pickupDate}</span>
                <span className="text-muted">{b.pickupLocation}{b.destination ? ` → ${b.destination}` : ""}</span>
                <span className="ml-auto text-xs text-muted">Completed ✓</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
