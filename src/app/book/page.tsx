import type { Metadata } from "next";
import { launchGate } from "@/lib/launch-gate";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { listAddOns, listRates, listSurcharges, listVehicles } from "@/lib/repo";
import { getBusyMap } from "@/lib/availability";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Build My Trip — Instant Quote & Booking",
  description:
    "Build your Lagos luxury trip in four steps: choose the trip, the car and your add-ons, see the exact quote, and pay securely or confirm on WhatsApp.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string; vehicle?: string }>;
}) {
  await launchGate();
  const sp = await searchParams;
  const [vehicles, rates, addOns, surcharges, busyMap] = await Promise.all([
    listVehicles({ includeUnavailable: false }),
    listRates(),
    listAddOns(),
    listSurcharges(),
  , getBusyMap()]);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 lg:px-8">
      <p className="eyebrow eyebrow-emerald mb-3">The express lane</p>
      <h1 className="display text-4xl text-cream md:text-5xl">Build my trip</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Four steps. A live quote the whole way. Nothing to repeat on WhatsApp afterwards.
      </p>

      <BookingWizard
        vehicles={vehicles}
        busyMap={busyMap}
        rates={rates}
        addOns={addOns}
        surcharges={surcharges}
        initialTrip={sp.trip}
        initialVehicle={sp.vehicle}
      />
    </div>
  );
}
