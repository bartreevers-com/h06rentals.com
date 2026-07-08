import type { AddOn, InterstateSurcharge, Vehicle, VehicleRate } from "./db/schema";
import { CHAUFFEUR_TIERS, getTripType } from "./trip-types";

export interface QuoteInput {
  tripType: string;
  vehicleSlug?: string;
  chauffeurTier?: string; // for interstate_chauffeur trips
  numDays?: number;
  destinationState?: string;
  addOnSlugs?: string[];
  luggage?: number;
}

export interface QuoteLine {
  label: string;
  amountNgn: number | null; // null = custom quote line
  note?: string;
}

export interface QuoteResult {
  lines: QuoteLine[];
  totalNgn: number; // sum of priceable lines
  isEstimate: boolean; // true if any line needs concierge confirmation
  depositNgn: number;
}

export const DEPOSIT_PERCENT = 50;

export function computeQuote(
  input: QuoteInput,
  vehicle: Vehicle | null,
  rate: VehicleRate | null,
  addOns: AddOn[],
  surcharges: InterstateSurcharge[],
): QuoteResult {
  const trip = getTripType(input.tripType);
  const lines: QuoteLine[] = [];
  let isEstimate = false;
  const days = Math.max(1, input.numDays ?? 1);

  if (!trip) {
    return { lines: [], totalNgn: 0, isEstimate: true, depositNgn: 0 };
  }

  if (trip.id === "interstate_chauffeur") {
    const tier = CHAUFFEUR_TIERS.find((t) => t.id === (input.chauffeurTier ?? "regular")) ?? CHAUFFEUR_TIERS[0];
    const perDay = tier.rate24;
    lines.push({
      label: `${tier.label} × ${days} day${days > 1 ? "s" : ""}`,
      amountNgn: perDay * days,
      note: "Fuel and accommodation for the chauffeur are the client's responsibility on interstate trips",
    });
  } else if (trip.instantQuote && trip.rateKey && rate && vehicle) {
    const base = rate[trip.rateKey];
    if (trip.id === "interstate") {
      const s = surcharges.find(
        (x) => x.state.toLowerCase() === (input.destinationState ?? "").toLowerCase(),
      );
      if (s) {
        const daily = Math.round(base * (1 + Number(s.surcharge)));
        lines.push({
          label: `${vehicle.name} — interstate to ${s.state} × ${days} day${days > 1 ? "s" : ""}`,
          amountNgn: daily * days,
          note: `Base ₦${base.toLocaleString()} +${Math.round(Number(s.surcharge) * 100)}% ${s.region} surcharge per day`,
        });
      } else {
        lines.push({
          label: `${vehicle.name} — interstate × ${days} day${days > 1 ? "s" : ""}`,
          amountNgn: null,
          note: "Destination state not on our standard card — the concierge will confirm the fare",
        });
        isEstimate = true;
      }
    } else if (trip.perDay) {
      lines.push({
        label: `${vehicle.name} — ${trip.label} × ${days} day${days > 1 ? "s" : ""}`,
        amountNgn: base * days,
      });
    } else {
      lines.push({ label: `${vehicle.name} — ${trip.label}`, amountNgn: base });
    }
  } else {
    // concierge-quoted trips (weddings, corporate, VIP, custom) or VIP vehicles
    const what = vehicle ? vehicle.name : trip.label;
    lines.push({
      label: `${what} — ${trip.label}`,
      amountNgn: null,
      note: "Priced by the H06 concierge for your itinerary",
    });
    isEstimate = true;
  }

  // Excess luggage
  if (vehicle && input.luggage && input.luggage > vehicle.baggageCapacity) {
    const extra = input.luggage - vehicle.baggageCapacity;
    lines.push({
      label: `Excess luggage × ${extra}`,
      amountNgn: extra * vehicle.excessLuggageCharge,
      note: `Beyond the ${vehicle.name.split(" ").slice(-2).join(" ")}'s ${vehicle.baggageCapacity}-bag capacity`,
    });
  }

  // Add-ons
  for (const slug of input.addOnSlugs ?? []) {
    const a = addOns.find((x) => x.slug === slug);
    if (!a) continue;
    if (a.priceNgn == null) {
      lines.push({ label: a.label, amountNgn: null, note: "Custom quote — confirmed by concierge" });
      isEstimate = true;
    } else {
      lines.push({ label: a.label, amountNgn: a.priceNgn });
    }
  }

  const totalNgn = lines.reduce((s, l) => s + (l.amountNgn ?? 0), 0);
  const depositNgn = Math.round((totalNgn * DEPOSIT_PERCENT) / 100);
  return { lines, totalNgn, isEstimate, depositNgn };
}

export function formatNaira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}
