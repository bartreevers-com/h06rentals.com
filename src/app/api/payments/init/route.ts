import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { initializeTransaction, makePaymentReference } from "@/lib/paystack";
import { getBookingByRef } from "@/lib/repo";

const InitSchema = z.object({ ref: z.string() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = InitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const booking = await getBookingByRef(parsed.data.ref);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const outstanding = booking.amountDue - booking.amountPaid;
  if (outstanding <= 0) {
    return NextResponse.json({ error: "This booking is already paid" }, { status: 409 });
  }

  const reference = makePaymentReference(booking.ref);
  const origin = req.nextUrl.origin;
  const callbackUrl = `${origin}/api/payments/callback`;

  try {
    const init = await initializeTransaction({
      email: booking.customerEmail,
      amountNgn: outstanding,
      reference,
      callbackUrl,
      metadata: { bookingRef: booking.ref, custom_fields: [{ display_name: "Booking", value: booking.ref }] },
    });

    const db = await getDb();
    await db.insert(payments).values({
      bookingId: booking.id,
      provider: init.provider,
      reference,
      amountNgn: outstanding,
      status: "pending",
    });

    return NextResponse.json({ authorizationUrl: init.authorizationUrl, reference });
  } catch (err) {
    console.error("[payments/init]", err);
    return NextResponse.json(
      { error: "We couldn't start the payment. Please try again or use WhatsApp." },
      { status: 502 },
    );
  }
}
