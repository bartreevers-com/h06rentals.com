import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { computeQuote } from "@/lib/quote";
import { getRate, getVehicle, listAddOns, listSurcharges, nextBookingRef } from "@/lib/repo";
import { getTripType } from "@/lib/trip-types";
import { formatNaira } from "@/lib/quote";

const BookingSchema = z.object({
  tripType: z.string(),
  vehicleSlug: z.string().optional(),
  chauffeurTier: z.string().optional(),
  pickupLocation: z.string().min(2).max(300),
  destination: z.string().max(300).optional(),
  destinationState: z.string().max(60).optional(),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  numDays: z.number().int().min(1).max(60).default(1),
  passengers: z.number().int().min(1).max(60).default(1),
  luggage: z.number().int().min(0).max(40).default(0),
  flightNumber: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
  addOnSlugs: z.array(z.string()).default([]),
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().min(7).max(20),
  customerEmail: z.string().email(),
  paymentOption: z.enum(["full", "deposit", "bank_transfer", "pay_later"]),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the booking details", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const trip = getTripType(input.tripType);
  if (!trip) return NextResponse.json({ error: "Unknown trip type" }, { status: 400 });

  const [vehicle, rate, addOnRows, surcharges] = await Promise.all([
    input.vehicleSlug ? getVehicle(input.vehicleSlug) : Promise.resolve(null),
    input.vehicleSlug ? getRate(input.vehicleSlug) : Promise.resolve(null),
    listAddOns(),
    listSurcharges(),
  ]);

  if (input.vehicleSlug && !vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 400 });
  }
  if (vehicle && !vehicle.isAvailable) {
    return NextResponse.json({ error: "This vehicle is currently unavailable — please choose another or contact the concierge" }, { status: 409 });
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

  const canPayNow = quote.totalNgn > 0;
  const paymentOption = canPayNow ? input.paymentOption : "pay_later";
  const amountDue =
    paymentOption === "deposit" ? quote.depositNgn : paymentOption === "full" ? quote.totalNgn : quote.totalNgn;

  const ref = await nextBookingRef();
  const db = await getDb();
  const [created] = await db
    .insert(bookings)
    .values({
      ref,
      status: paymentOption === "full" || paymentOption === "deposit" ? "pending_payment" : "pending_confirmation",
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

  // Notify the H06 team (logged if email keys are not configured yet).
  await sendEmail({
    to: process.env.ADMIN_NOTIFY_EMAIL ?? "hello@h06rentals.com",
    subject: `New booking ${ref} — ${vehicle?.name ?? trip.label}`,
    text: [
      `New booking on the H06 platform`,
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

  return NextResponse.json({
    ref: created.ref,
    status: created.status,
    quoteTotal: quote.totalNgn,
    amountDue,
    isEstimate: quote.isEstimate,
    requiresPayment: paymentOption === "full" || paymentOption === "deposit",
  });
}
