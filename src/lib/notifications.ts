import "server-only";
import type { Booking } from "./db/schema";
import { sendEmail } from "./email";
import { formatNaira } from "./quote";
import { getTripType } from "./trip-types";

/**
 * Customer lifecycle emails. Every booking event reaches the customer's
 * inbox: created, priced, confirmed, cancelled, payment succeeded/failed.
 * Delivery goes through sendEmail (Resend when configured, logged until
 * then, always recorded in email_log).
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.h06rentals.com";

const bookingLink = (ref: string) => `${SITE_URL}/booking/${ref}`;

function tripSummary(b: Booking): string[] {
  const trip = getTripType(b.tripType);
  return [
    `Booking reference: ${b.ref}`,
    `Trip: ${trip?.label ?? b.tripType}`,
    b.vehicleName ? `Vehicle: ${b.vehicleName}` : null,
    `Pickup: ${b.pickupLocation} on ${b.pickupDate} at ${b.pickupTime}`,
    b.destination ? `Destination: ${b.destination}${b.destinationState ? `, ${b.destinationState}` : ""}` : null,
    `Passengers: ${b.passengers} · Luggage: ${b.luggage}`,
  ].filter((x): x is string => x !== null);
}

const signature = ["", "H06 Rentals — Luxury Car Hire, Lagos", "WhatsApp: +234 913 999 9533"];

export async function emailBookingCreated(b: Booking) {
  const payable = !b.isEstimate && b.quoteTotal > 0 && b.amountDue - b.amountPaid > 0;
  await sendEmail({
    to: b.customerEmail,
    subject: `Your H06 booking ${b.ref}`,
    text: [
      `Dear ${b.customerName},`,
      ``,
      `Thank you — your booking is in. Here is everything we have:`,
      ``,
      ...tripSummary(b),
      ``,
      b.isEstimate
        ? `Estimated quote: ${formatNaira(b.quoteTotal)}. The concierge will confirm the final price shortly — you will receive a payment link by email the moment it is set.`
        : `Total: ${formatNaira(b.quoteTotal)}.`,
      payable
        ? `You can view your booking and pay securely (card, bank transfer or USSD via Paystack) here: ${bookingLink(b.ref)}`
        : `Track your booking here: ${bookingLink(b.ref)}`,
      ...signature,
    ].join("\n"),
  });
}

export async function emailBookingPriced(b: Booking) {
  await sendEmail({
    to: b.customerEmail,
    subject: `Your H06 quote is ready — ${b.ref} · ${formatNaira(b.quoteTotal)}`,
    text: [
      `Dear ${b.customerName},`,
      ``,
      `The concierge has confirmed the price for your booking:`,
      ``,
      ...tripSummary(b),
      ``,
      `Confirmed total: ${formatNaira(b.quoteTotal)}`,
      b.amountPaid > 0 ? `Already paid: ${formatNaira(b.amountPaid)}` : null,
      `Balance due: ${formatNaira(Math.max(0, b.amountDue - b.amountPaid))}`,
      ``,
      `Pay securely here (card, bank transfer or USSD via Paystack):`,
      bookingLink(b.ref),
      ...signature,
    ]
      .filter((x): x is string => x !== null)
      .join("\n"),
  });
}

export async function emailBookingConfirmed(b: Booking) {
  await sendEmail({
    to: b.customerEmail,
    subject: `Confirmed — your H06 booking ${b.ref}`,
    text: [
      `Dear ${b.customerName},`,
      ``,
      `Your booking is confirmed. Your chauffeur will be prepared and on time.`,
      ``,
      ...tripSummary(b),
      ``,
      b.amountDue - b.amountPaid > 0
        ? `Outstanding balance: ${formatNaira(b.amountDue - b.amountPaid)} — pay any time at ${bookingLink(b.ref)}`
        : `Fully paid — nothing more to do.`,
      `Your booking page: ${bookingLink(b.ref)}`,
      ...signature,
    ].join("\n"),
  });
}

export async function emailBookingCancelled(b: Booking) {
  await sendEmail({
    to: b.customerEmail,
    subject: `Booking ${b.ref} cancelled`,
    text: [
      `Dear ${b.customerName},`,
      ``,
      `Your booking ${b.ref} has been cancelled. If this is unexpected, reply to this email or message the concierge on WhatsApp and we will sort it out immediately.`,
      ...signature,
    ].join("\n"),
  });
}

export async function emailPaymentFailed(b: Booking, amountNgn: number) {
  await sendEmail({
    to: b.customerEmail,
    subject: `Payment didn't go through — booking ${b.ref}`,
    text: [
      `Dear ${b.customerName},`,
      ``,
      `Your payment of ${formatNaira(amountNgn)} for booking ${b.ref} was not successful. Nothing has been charged and your booking is still held.`,
      ``,
      `You can retry securely here (card, bank transfer or USSD via Paystack):`,
      bookingLink(b.ref),
      ``,
      `If it keeps failing, message the concierge on WhatsApp and we will help.`,
      ...signature,
    ].join("\n"),
  });
}
