import "server-only";
import { findConflict, formatDay, getBusyMap, suggestAlternative, tripEnd } from "./availability";
import { getDb } from "./db";
import { bookings, emailList, type Booking } from "./db/schema";
import { sendEmail } from "./email";
import { emailBookingCreated } from "./notifications";
import { computeQuote, formatNaira } from "./quote";
import { getRate, getVehicle, listAddOns, listRates, listSurcharges, listVehicles, nextBookingRef } from "./repo";
import { getTripType } from "./trip-types";

export interface BookingInput {
  tripType: string;
  vehicleSlug?: string;
  chauffeurTier?: string;
  pickupLocation: string;
  destination?: string;
  destinationState?: string;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string;
  numDays: number;
  passengers: number;
  luggage: number;
  flightNumber?: string;
  notes?: string;
  addOnSlugs: string[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentOption: "full" | "deposit" | "pay_later";
}

/**
 * Create a booking with a server-computed quote, add the customer to the
 * email list, and send both customer and team notifications. Used by the
 * public booking API and by staff creating phone-in bookings.
 */
export async function createBookingRecord(
  input: BookingInput,
  opts: { source: "web" | "admin"; createdBy?: string } = { source: "web" },
): Promise<
  | { booking: Booking; error?: never }
  | {
      booking?: never;
      error: string;
      status: number;
      busyUntil?: string;
      suggestion?: { slug: string; name: string } | null;
    }
> {
  const trip = getTripType(input.tripType);
  if (!trip) return { error: "Unknown trip type", status: 400 };

  const [vehicle, rate, addOnRows, surcharges] = await Promise.all([
    input.vehicleSlug ? getVehicle(input.vehicleSlug) : Promise.resolve(null),
    input.vehicleSlug ? getRate(input.vehicleSlug) : Promise.resolve(null),
    listAddOns(),
    listSurcharges(),
  ]);

  if (input.vehicleSlug && !vehicle) return { error: "Vehicle not found", status: 400 };
  if (vehicle && !vehicle.isAvailable && opts.source === "web") {
    return {
      error: "This vehicle is currently unavailable — please choose another or contact the concierge",
      status: 409,
    };
  }

  // Date-aware availability: confirmed bookings block their trip window.
  if (vehicle && opts.source === "web") {
    const requestedEnd = tripEnd(input.pickupDate, input.numDays, input.returnDate ?? null);
    const conflict = await findConflict(vehicle.slug, input.pickupDate, requestedEnd);
    if (conflict) {
      const [allVehicles, allRates, busyMap] = await Promise.all([
        listVehicles({ tier: vehicle.tier as "core" | "vip" }),
        listRates(),
        getBusyMap(),
      ]);
      const alt = suggestAlternative(vehicle, allVehicles, allRates, busyMap);
      return {
        error: `${vehicle.name} is fully booked until ${formatDay(conflict.busyUntil)} for those dates.`,
        status: 409,
        busyUntil: conflict.busyUntil,
        suggestion: alt ? { slug: alt.slug, name: alt.name } : null,
      };
    }
  }

  // Server-side quote — never trust the client's numbers.
  const quote = computeQuote(
    {
      tripType: input.tripType,
      vehicleSlug: input.vehicleSlug,
      chauffeurTier: input.chauffeurTier,
      numDays: input.numDays,
      destinationState: input.destinationState,
      addOnSlugs: input.addOnSlugs,
      luggage: input.luggage,
    },
    vehicle,
    rate,
    addOnRows,
    surcharges,
  );

  const selectedAddOns = input.addOnSlugs
    .map((slug) => addOnRows.find((a) => a.slug === slug))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map((a) => ({ slug: a.slug, label: a.label, priceNgn: a.priceNgn }));

  const canPayNow = quote.totalNgn > 0 && !quote.isEstimate;
  const paymentOption = canPayNow ? input.paymentOption : "pay_later";
  const amountDue = paymentOption === "deposit" ? quote.depositNgn : quote.totalNgn;

  const ref = await nextBookingRef();
  const db = await getDb();
  const [created] = await db
    .insert(bookings)
    .values({
      ref,
      status:
        paymentOption === "full" || paymentOption === "deposit" ? "pending_payment" : "pending_confirmation",
      tripType: input.tripType,
      vehicleSlug: vehicle?.slug ?? null,
      vehicleName: vehicle?.name ?? null,
      chauffeurTier: input.chauffeurTier ?? null,
      pickupLocation: input.pickupLocation,
      destination: input.destination ?? null,
      destinationState: input.destinationState ?? null,
      pickupDate: input.pickupDate,
      pickupTime: input.pickupTime,
      returnDate: input.returnDate ?? null,
      numDays: input.numDays,
      passengers: input.passengers,
      luggage: input.luggage,
      flightNumber: input.flightNumber ?? null,
      notes: input.notes ?? null,
      addOns: selectedAddOns,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      quoteTotal: quote.totalNgn,
      quoteBreakdown: quote.lines,
      isEstimate: quote.isEstimate,
      paymentOption,
      amountDue,
    })
    .returning();

  // Every buyer joins the email list, successful payment or not.
  await db
    .insert(emailList)
    .values({
      email: input.customerEmail.toLowerCase(),
      name: input.customerName,
      phone: input.customerPhone,
      source: opts.source === "admin" ? "admin_booking" : "booking",
    })
    .onConflictDoUpdate({
      target: emailList.email,
      set: { name: input.customerName, phone: input.customerPhone },
    });

  // Customer always hears from us immediately.
  await emailBookingCreated(created);

  // And the team knows a booking landed.
  await sendEmail({
    to: process.env.ADMIN_NOTIFY_EMAIL ?? "hello@h06rentals.com",
    subject: `New booking ${ref} — ${vehicle?.name ?? trip.label}${opts.source === "admin" ? " (phone-in)" : ""}`,
    text: [
      opts.source === "admin"
        ? `Phone-in booking created by ${opts.createdBy ?? "staff"}`
        : `New booking on the H06 platform`,
      ``,
      `Ref: ${ref}`,
      `Customer: ${input.customerName} · ${input.customerPhone} · ${input.customerEmail}`,
      `Trip: ${trip.label}`,
      vehicle ? `Vehicle: ${vehicle.name}` : null,
      `Pickup: ${input.pickupLocation}`,
      input.destination ? `Destination: ${input.destination}` : null,
      `Date: ${input.pickupDate} ${input.pickupTime}`,
      `Quote: ${formatNaira(quote.totalNgn)}${quote.isEstimate ? " (estimate)" : ""}`,
      `Payment option: ${paymentOption}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return { booking: created };
}
