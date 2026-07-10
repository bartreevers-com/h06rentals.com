"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AddOn, InterstateSurcharge, Vehicle, VehicleRate } from "@/lib/db/schema";
import { computeQuote, formatNaira } from "@/lib/quote";
import { CHAUFFEUR_TIERS, getTripType, TRIP_TYPES, TRIP_VEHICLE_AFFINITY } from "@/lib/trip-types";
import { VehicleSketch } from "@/components/VehicleSketch";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

interface Props {
  vehicles: Vehicle[];
  rates: VehicleRate[];
  addOns: AddOn[];
  surcharges: InterstateSurcharge[];
  initialTrip?: string;
  initialVehicle?: string;
}

interface FormState {
  tripType: string;
  vehicleSlug: string;
  chauffeurTier: string;
  pickupLocation: string;
  destination: string;
  destinationState: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  numDays: number;
  passengers: number;
  luggage: number;
  flightNumber: string;
  notes: string;
  addOnSlugs: string[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentOption: "full" | "deposit" | "pay_later";
}

const STEPS = ["Trip", "Details", "Vehicle", "Confirm"] as const;

export function BookingWizard({ vehicles, rates, addOns, surcharges, initialTrip, initialVehicle }: Props) {
  const router = useRouter();
  const validInitialTrip = TRIP_TYPES.some((t) => t.id === initialTrip) ? initialTrip! : "";
  const validInitialVehicle = vehicles.some((v) => v.slug === initialVehicle) ? initialVehicle! : "";

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    tripType: validInitialTrip,
    vehicleSlug: validInitialVehicle,
    chauffeurTier: "regular",
    pickupLocation: "",
    destination: "",
    destinationState: "",
    pickupDate: "",
    pickupTime: "",
    returnDate: "",
    numDays: 1,
    passengers: 1,
    luggage: 0,
    flightNumber: "",
    notes: "",
    addOnSlugs: [],
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    paymentOption: "full",
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const trip = getTripType(form.tripType);
  const vehicle = vehicles.find((v) => v.slug === form.vehicleSlug) ?? null;
  const rate = rates.find((r) => r.vehicleSlug === form.vehicleSlug) ?? null;
  const isChauffeurOnly = form.tripType === "interstate_chauffeur";

  const quote = useMemo(
    () =>
      computeQuote(
        {
          tripType: form.tripType,
          vehicleSlug: form.vehicleSlug || undefined,
          chauffeurTier: form.chauffeurTier,
          numDays: form.numDays,
          destinationState: form.destinationState || undefined,
          addOnSlugs: form.addOnSlugs,
          luggage: form.luggage,
        },
        vehicle,
        rate,
        addOns,
        surcharges,
      ),
    [form, vehicle, rate, addOns, surcharges],
  );

  const showQuote = Boolean(trip) && (isChauffeurOnly || vehicle || !trip?.instantQuote);
  const canPayNow = quote.totalNgn > 0;

  // ranked vehicle list for step 3
  const rankedVehicles = useMemo(() => {
    const affinity = TRIP_VEHICLE_AFFINITY[form.tripType] ?? [];
    const core = vehicles.filter((v) => v.tier === "core");
    const vip = vehicles.filter((v) => v.tier === "vip");
    const scored = [...core].sort((a, b) => {
      const ia = affinity.indexOf(a.slug);
      const ib = affinity.indexOf(b.slug);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    // custom / vip / wedding trips may also want the VIP wing
    const includeVip = ["custom", "vip_security", "wedding_event", "corporate"].includes(form.tripType);
    return includeVip ? [...scored, ...vip] : scored;
  }, [vehicles, form.tripType]);

  const stepValid = (): string | null => {
    if (step === 0) {
      if (!trip) return "Choose a trip type to continue";
      return null;
    }
    if (step === 1) {
      if (form.pickupLocation.trim().length < 2) return "Where should the chauffeur meet you?";
      if (trip?.needsDestination && form.destination.trim().length < 2)
        return "Please add a destination";
      if (trip?.needsState && !form.destinationState) return "Select the destination state";
      if (!form.pickupDate) return "Pick a date";
      if (form.pickupDate < new Date().toISOString().slice(0, 10)) return "The pickup date has already passed";
      if (!form.pickupTime) return "Pick a time";
      return null;
    }
    if (step === 2) {
      if (!isChauffeurOnly && trip?.instantQuote && !vehicle) return "Choose a vehicle to continue";
      return null;
    }
    if (step === 3) {
      if (form.customerName.trim().length < 2) return "Please add your name";
      if (form.customerPhone.trim().length < 7) return "Please add a phone number";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.customerEmail)) return "Please add a valid email";
      return null;
    }
    return null;
  };

  const next = () => {
    const err = stepValid();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    const err = stepValid();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripType: form.tripType,
          vehicleSlug: form.vehicleSlug || undefined,
          chauffeurTier: isChauffeurOnly ? form.chauffeurTier : undefined,
          pickupLocation: form.pickupLocation.trim(),
          destination: form.destination.trim() || undefined,
          destinationState: form.destinationState || undefined,
          pickupDate: form.pickupDate,
          pickupTime: form.pickupTime,
          returnDate: form.returnDate || undefined,
          numDays: form.numDays,
          passengers: form.passengers,
          luggage: form.luggage,
          flightNumber: form.flightNumber.trim() || undefined,
          notes: form.notes.trim() || undefined,
          addOnSlugs: form.addOnSlugs,
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          customerEmail: form.customerEmail.trim(),
          paymentOption: canPayNow ? form.paymentOption : "pay_later",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong — please try again");

      if (data.requiresPayment) {
        const payRes = await fetch("/api/payments/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: data.ref }),
        });
        const pay = await payRes.json();
        if (!payRes.ok) {
          // booking exists — land on its page where payment can be retried
          router.push(`/booking/${data.ref}?payment=init_failed`);
          return;
        }
        window.location.href = pay.authorizationUrl;
        return;
      }
      router.push(`/booking/${data.ref}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — please try again");
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1.7fr_1fr]">
      <div>
        {/* stepper */}
        <ol className="flex items-center gap-2" aria-label="Booking steps">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 flex-col gap-2">
              <span
                className={`h-1 rounded-full transition-colors ${
                  i <= step ? "bg-emerald" : "bg-forest"
                }`}
              />
              <span className={`text-xs ${i === step ? "text-emerald-glow" : "text-muted"}`}>
                {i + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="mt-8"
          >
            {step === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {TRIP_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      set("tripType", t.id);
                      setError(null);
                    }}
                    className={`glass-subtle p-5 text-left transition-all ${
                      form.tripType === t.id
                        ? "!border-emerald-glow/60 !bg-emerald-deep/20"
                        : "hover:border-cream/20"
                    }`}
                    aria-pressed={form.tripType === t.id}
                  >
                    <p className="text-sm font-medium text-cream">{t.label}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">{t.description}</p>
                    {!t.instantQuote && (
                      <p className="mt-2 text-[0.68rem] uppercase tracking-wider text-muted">
                        Concierge quoted
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {step === 1 && trip && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="pickup">Pickup location</label>
                  <LocationAutocomplete
                    id="pickup"
                    placeholder={
                      form.tripType === "airport_pickup"
                        ? "e.g. MMIA Terminal 2, Ikeja"
                        : "e.g. Eko Hotel, Victoria Island"
                    }
                    value={form.pickupLocation}
                    onChange={(v) => set("pickupLocation", v)}
                  />
                </div>

                {trip.needsDestination && (
                  <div className="sm:col-span-2">
                    <label className="field-label" htmlFor="destination">Destination</label>
                    <LocationAutocomplete
                      id="destination"
                      placeholder={
                        form.tripType === "airport_dropoff"
                          ? "e.g. MMIA Terminal 1"
                          : form.tripType === "interstate"
                            ? "e.g. Ibadan city centre"
                            : "Where are we headed?"
                      }
                      value={form.destination}
                      onChange={(v) => set("destination", v)}
                    />
                  </div>
                )}

                {trip.needsState && (
                  <div>
                    <label className="field-label" htmlFor="state">Destination state</label>
                    <select
                      id="state"
                      className="field"
                      value={form.destinationState}
                      onChange={(e) => set("destinationState", e.target.value)}
                    >
                      <option value="">Select state…</option>
                      {surcharges.map((s) => (
                        <option key={s.state} value={s.state}>
                          {s.state} — {s.region}
                        </option>
                      ))}
                      <option value="other">Another state (concierge quote)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="field-label" htmlFor="date">Pickup date</label>
                  <input
                    id="date"
                    type="date"
                    className="field"
                    min={new Date().toISOString().slice(0, 10)}
                    value={form.pickupDate}
                    onChange={(e) => set("pickupDate", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="time">Pickup time</label>
                  <input
                    id="time"
                    type="time"
                    className="field"
                    value={form.pickupTime}
                    onChange={(e) => set("pickupTime", e.target.value)}
                  />
                </div>

                {trip.needsDays && (
                  <div>
                    <label className="field-label" htmlFor="days">Number of days</label>
                    <input
                      id="days"
                      type="number"
                      min={1}
                      max={60}
                      className="field"
                      value={form.numDays}
                      onChange={(e) => set("numDays", Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                )}

                {trip.needsDays && (
                  <div>
                    <label className="field-label" htmlFor="return">Return date (optional)</label>
                    <input
                      id="return"
                      type="date"
                      className="field"
                      min={form.pickupDate || undefined}
                      value={form.returnDate}
                      onChange={(e) => set("returnDate", e.target.value)}
                    />
                  </div>
                )}

                {trip.needsFlight && (
                  <div>
                    <label className="field-label" htmlFor="flight">Flight number (optional)</label>
                    <input
                      id="flight"
                      className="field"
                      placeholder="e.g. BA75"
                      value={form.flightNumber}
                      onChange={(e) => set("flightNumber", e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="field-label" htmlFor="passengers">Passengers</label>
                  <input
                    id="passengers"
                    type="number"
                    min={1}
                    max={60}
                    className="field"
                    value={form.passengers}
                    onChange={(e) => set("passengers", Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="luggage">Luggage (pieces)</label>
                  <input
                    id="luggage"
                    type="number"
                    min={0}
                    max={40}
                    className="field"
                    value={form.luggage}
                    onChange={(e) => set("luggage", Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>

                {isChauffeurOnly && (
                  <div className="sm:col-span-2">
                    <p className="field-label">Chauffeur tier</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {CHAUFFEUR_TIERS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => set("chauffeurTier", t.id)}
                          className={`glass-subtle p-4 text-left ${
                            form.chauffeurTier === t.id
                              ? "!border-emerald-glow/60 !bg-emerald-deep/20"
                              : ""
                          }`}
                          aria-pressed={form.chauffeurTier === t.id}
                        >
                          <p className="text-sm font-medium text-cream">{t.label}</p>
                          <p className="mt-1 text-xs text-muted">{t.description}</p>
                          <p className="mt-2 text-xs text-emerald-glow">
                            {formatNaira(t.rate24)}/day
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="notes">Notes for the concierge (optional)</label>
                  <textarea
                    id="notes"
                    className="field min-h-24"
                    placeholder="Anything we should prepare for?"
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                {isChauffeurOnly ? (
                  <div className="glass-emerald p-6">
                    <p className="text-sm text-cream">
                      Chauffeur-only service — no H06 vehicle needed. Your{" "}
                      {CHAUFFEUR_TIERS.find((t) => t.id === form.chauffeurTier)?.label.toLowerCase()}{" "}
                      is included in the quote. Add extras below if useful.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {rankedVehicles.map((v, i) => {
                      const r = rates.find((x) => x.vehicleSlug === v.slug);
                      const selected = form.vehicleSlug === v.slug;
                      const recommended = i === 0 && trip?.instantQuote && v.tier === "core";
                      return (
                        <button
                          key={v.slug}
                          type="button"
                          onClick={() => set("vehicleSlug", selected ? "" : v.slug)}
                          className={`glass-subtle flex items-center gap-4 p-4 text-left transition-all ${
                            selected ? "!border-emerald-glow/60 !bg-emerald-deep/20" : "hover:border-cream/20"
                          }`}
                          aria-pressed={selected}
                        >
                          <div className="hidden h-14 w-24 shrink-0 items-center justify-center sm:flex">
                            <VehicleSketch
                              slug={v.slug}
                              category={v.category}
                              name={v.name}
                              tint={v.tier === "vip" ? "bronze" : "green"}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium text-cream">{v.name}</p>
                              {recommended && (
                                <span className="rounded-full bg-emerald-deep/50 px-2 py-0.5 text-[0.62rem] uppercase tracking-wider text-emerald-glow">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {v.seats} seats · {v.tagline}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            {r && trip?.rateKey ? (
                              <>
                                <p className="text-sm font-semibold text-emerald-glow">
                                  {formatNaira(r[trip.rateKey])}
                                </p>
                                <p className="text-[0.65rem] uppercase tracking-wider text-muted">
                                  {trip.perDay ? "per day" : trip.shortLabel}
                                </p>
                              </>
                            ) : (
                              <p className={`text-[0.68rem] uppercase tracking-wider ${v.tier === "vip" ? "text-champagne" : "text-muted"}`}>
                                Concierge priced
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <h3 className="eyebrow mb-3 mt-8">Add-ons</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {addOns.map((a) => {
                    const on = form.addOnSlugs.includes(a.slug);
                    return (
                      <button
                        key={a.slug}
                        type="button"
                        onClick={() =>
                          set(
                            "addOnSlugs",
                            on ? form.addOnSlugs.filter((s) => s !== a.slug) : [...form.addOnSlugs, a.slug],
                          )
                        }
                        className={`glass-subtle flex items-start justify-between gap-3 p-4 text-left ${
                          on ? "!border-emerald-glow/60 !bg-emerald-deep/20" : "hover:border-cream/20"
                        }`}
                        aria-pressed={on}
                      >
                        <div>
                          <p className="text-sm font-medium text-cream">{a.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted">{a.description}</p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-emerald-glow">
                          {a.priceNgn == null ? "Quote" : formatNaira(a.priceNgn)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="name">Full name</label>
                  <input
                    id="name"
                    className="field"
                    autoComplete="name"
                    value={form.customerName}
                    onChange={(e) => set("customerName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="phone">Phone (WhatsApp preferred)</label>
                  <input
                    id="phone"
                    className="field"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+234…"
                    value={form.customerPhone}
                    onChange={(e) => set("customerPhone", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    className="field"
                    type="email"
                    autoComplete="email"
                    value={form.customerEmail}
                    onChange={(e) => set("customerEmail", e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <p className="field-label">How would you like to pay?</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {canPayNow && (
                      <>
                        <PaymentOption
                          selected={form.paymentOption === "full"}
                          onClick={() => set("paymentOption", "full")}
                          title={`Pay in full — ${formatNaira(quote.totalNgn)}`}
                          note="Card, transfer or USSD via secure checkout"
                        />
                        <PaymentOption
                          selected={form.paymentOption === "deposit"}
                          onClick={() => set("paymentOption", "deposit")}
                          title={`Pay 50% deposit — ${formatNaira(quote.depositNgn)}`}
                          note="Balance due before the trip begins"
                        />
                      </>
                    )}
                    <PaymentOption
                      selected={form.paymentOption === "pay_later"}
                      onClick={() => set("paymentOption", "pay_later")}
                      title="Confirm first, pay later"
                      note="The concierge confirms availability, then emails your secure payment link"
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    All payments run through secure Paystack checkout — card, bank transfer or USSD.
                  </p>
                  {quote.isEstimate && (
                    <p className="mt-3 rounded-lg border border-cream/20 bg-ink/40 p-3 text-xs leading-relaxed text-cream-dim">
                      Part of this trip is an estimated quote. Final confirmation by H06 concierge —
                      you can still pay the fixed portion now or confirm everything on WhatsApp first.
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p role="alert" className="mt-5 rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button type="button" onClick={back} disabled={step === 0} className="btn btn-ghost btn-md disabled:opacity-30">
            Back
          </button>
          {step < 3 ? (
            <button type="button" onClick={next} className="btn btn-primary btn-md">
              Continue
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={submitting} className="btn btn-primary btn-lg disabled:opacity-60">
              {submitting
                ? "Preparing…"
                : canPayNow && (form.paymentOption === "full" || form.paymentOption === "deposit")
                  ? "Reserve & pay securely"
                  : "Reserve now"}
            </button>
          )}
        </div>
      </div>

      {/* ── live quote rail ─────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-24 h-fit">
        <div className="glass-emerald p-6">
          <h2 className="eyebrow mb-4">Your quote</h2>
          {!showQuote ? (
            <p className="text-sm leading-relaxed text-muted">
              Choose a trip {trip?.instantQuote !== false && "and a vehicle"} to see live pricing —
              fixed rates, no surprises.
            </p>
          ) : (
            <>
              <ul className="space-y-3 text-sm">
                {quote.lines.map((l, i) => (
                  <li key={i}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-cream-dim">{l.label}</span>
                      <span className="shrink-0 font-medium text-cream">
                        {l.amountNgn == null ? "TBC" : formatNaira(l.amountNgn)}
                      </span>
                    </div>
                    {l.note && <p className="mt-1 text-xs text-muted">{l.note}</p>}
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t hairline pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cream-dim">{quote.isEstimate ? "Estimated total" : "Total"}</span>
                  <span className="display text-2xl text-emerald-glow">{formatNaira(quote.totalNgn)}</span>
                </div>
                {canPayNow && (
                  <p className="mt-1.5 text-right text-xs text-muted">
                    or {formatNaira(quote.depositNgn)} deposit
                  </p>
                )}
                {quote.isEstimate && (
                  <p className="mt-3 text-xs leading-relaxed text-cream-dim">
                    Estimated quote. Final confirmation by H06 concierge.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function PaymentOption({
  selected,
  onClick,
  title,
  note,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  note: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass-subtle p-4 text-left transition-all ${
        selected ? "!border-emerald-glow/60 !bg-emerald-deep/20" : "hover:border-cream/20"
      }`}
      aria-pressed={selected}
    >
      <p className="text-sm font-medium text-cream">{title}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </button>
  );
}
