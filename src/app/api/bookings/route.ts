import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBookingRecord } from "@/lib/booking-service";

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
  // All payment runs through Paystack (card, transfer, USSD) — no manual rails.
  paymentOption: z.enum(["full", "deposit", "pay_later"]),
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

  const result = await createBookingRecord(parsed.data, { source: "web" });
  if (result.error !== undefined) {
    return NextResponse.json(
      { error: result.error, busyUntil: result.busyUntil, suggestion: result.suggestion },
      { status: result.status },
    );
  }

  const b = result.booking;
  return NextResponse.json({
    ref: b.ref,
    status: b.status,
    quoteTotal: b.quoteTotal,
    amountDue: b.amountDue,
    isEstimate: b.isEstimate,
    requiresPayment: b.paymentOption === "full" || b.paymentOption === "deposit",
  });
}
