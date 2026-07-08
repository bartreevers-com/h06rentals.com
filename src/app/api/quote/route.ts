import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeQuote } from "@/lib/quote";
import { getRate, getVehicle, listAddOns, listSurcharges } from "@/lib/repo";

const QuoteSchema = z.object({
  tripType: z.string(),
  vehicleSlug: z.string().optional(),
  chauffeurTier: z.string().optional(),
  numDays: z.number().int().min(1).max(60).optional(),
  destinationState: z.string().optional(),
  addOnSlugs: z.array(z.string()).optional(),
  luggage: z.number().int().min(0).max(40).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = QuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quote request" }, { status: 400 });
  }
  const input = parsed.data;
  const [vehicle, rate, addOns, surcharges] = await Promise.all([
    input.vehicleSlug ? getVehicle(input.vehicleSlug) : Promise.resolve(null),
    input.vehicleSlug ? getRate(input.vehicleSlug) : Promise.resolve(null),
    listAddOns(),
    listSurcharges(),
  ]);
  const quote = computeQuote(input, vehicle, rate, addOns, surcharges);
  return NextResponse.json(quote);
}
