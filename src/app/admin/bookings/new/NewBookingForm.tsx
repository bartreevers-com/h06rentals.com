"use client";

import { useActionState, useState } from "react";
import { createAdminBookingAction } from "../../actions";

export function NewBookingForm({
  trips,
  tiers,
  vehicles,
}: {
  trips: { id: string; label: string }[];
  tiers: { id: string; label: string }[];
  vehicles: { slug: string; name: string; tier: string }[];
}) {
  const [state, action, pending] = useActionState(createAdminBookingAction, null);
  const [tripType, setTripType] = useState(trips[0]?.id ?? "");
  const isChauffeur = tripType === "interstate_chauffeur";

  return (
    <form action={action} className="mt-8 grid gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label" htmlFor="nb-trip">Trip type</label>
        <select
          id="nb-trip"
          name="tripType"
          className="field"
          value={tripType}
          onChange={(e) => setTripType(e.target.value)}
        >
          {trips.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        {isChauffeur ? (
          <>
            <label className="field-label" htmlFor="nb-tier">Chauffeur tier</label>
            <select id="nb-tier" name="chauffeurTier" className="field" defaultValue={tiers[0]?.id}>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label className="field-label" htmlFor="nb-vehicle">Vehicle</label>
            <select id="nb-vehicle" name="vehicleSlug" className="field" defaultValue="">
              <option value="">No vehicle (concierge-priced)</option>
              {vehicles.map((v) => (
                <option key={v.slug} value={v.slug}>
                  {v.name}{v.tier === "vip" ? " · VIP" : ""}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div>
        <label className="field-label" htmlFor="nb-date">Pickup date</label>
        <input id="nb-date" name="pickupDate" type="date" className="field" required />
      </div>
      <div>
        <label className="field-label" htmlFor="nb-time">Pickup time</label>
        <input id="nb-time" name="pickupTime" type="time" className="field" required />
      </div>

      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="nb-pickup">Pickup location</label>
        <input id="nb-pickup" name="pickupLocation" className="field" required />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="nb-dest">Destination (optional)</label>
        <input id="nb-dest" name="destination" className="field" />
      </div>

      <div>
        <label className="field-label" htmlFor="nb-days">Days</label>
        <input id="nb-days" name="numDays" type="number" min={1} max={60} defaultValue={1} className="field" />
      </div>
      <div>
        <label className="field-label" htmlFor="nb-pax">Passengers</label>
        <input id="nb-pax" name="passengers" type="number" min={1} max={60} defaultValue={1} className="field" />
      </div>
      <div>
        <label className="field-label" htmlFor="nb-luggage">Luggage</label>
        <input id="nb-luggage" name="luggage" type="number" min={0} max={40} defaultValue={0} className="field" />
      </div>
      <div>
        <label className="field-label" htmlFor="nb-flight">Flight number (optional)</label>
        <input id="nb-flight" name="flightNumber" className="field" />
      </div>

      <div className="sm:col-span-2 mt-2 border-t hairline pt-4">
        <p className="eyebrow mb-3">The client</p>
      </div>
      <div>
        <label className="field-label" htmlFor="nb-name">Full name</label>
        <input id="nb-name" name="customerName" className="field" required />
      </div>
      <div>
        <label className="field-label" htmlFor="nb-phone">Phone</label>
        <input id="nb-phone" name="customerPhone" className="field" placeholder="+234…" required />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="nb-email">Email (their notifications go here)</label>
        <input id="nb-email" name="customerEmail" type="email" className="field" required />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="nb-notes">Notes (optional)</label>
        <textarea id="nb-notes" name="notes" rows={2} className="field" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="nb-pay">Payment</label>
        <select id="nb-pay" name="paymentOption" className="field" defaultValue="full">
          <option value="full">Email a payment link for the full amount</option>
          <option value="deposit">Email a payment link for a 50% deposit</option>
          <option value="pay_later">No payment yet — confirm first</option>
        </select>
        <p className="mt-2 text-xs text-muted">
          Concierge-priced trips are always created without payment — set the final price on the
          booking afterwards and the client is emailed their payment link automatically.
        </p>
      </div>

      {state?.error && (
        <p role="alert" className="sm:col-span-2 rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button className="btn btn-primary btn-lg w-full" disabled={pending}>
          {pending ? "Creating booking…" : "Create booking & notify client"}
        </button>
      </div>
    </form>
  );
}
