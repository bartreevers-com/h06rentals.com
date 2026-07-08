import type { Booking } from "./db/schema";
import { formatNaira } from "./quote";
import { getTripType } from "./trip-types";

export { WHATSAPP_NUMBER, waLink, WA_PRESETS } from "./whatsapp-client";

const PAYMENT_LABEL: Record<string, string> = {
  full: "Full payment",
  deposit: "50% deposit",
  bank_transfer: "Bank transfer",
  pay_later: "Pay on confirmation",
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Payment pending",
  pending_confirmation: "Awaiting H06 confirmation",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Complete handoff message so the customer never repeats details. */
export function bookingWhatsAppMessage(b: Booking, opts?: { paid?: boolean }): string {
  const trip = getTripType(b.tripType);
  const rows: string[] = [
    `Hello H06 Rentals! Here is my booking:`,
    ``,
    `*Booking Ref:* ${b.ref}`,
    `*Name:* ${b.customerName}`,
    `*Phone:* ${b.customerPhone}`,
    `*Trip:* ${trip?.label ?? b.tripType}`,
  ];
  if (b.vehicleName) rows.push(`*Vehicle:* ${b.vehicleName}`);
  if (b.chauffeurTier) rows.push(`*Chauffeur:* ${b.chauffeurTier === "spy_police" ? "Spy Police" : "Regular"}`);
  rows.push(`*Pickup:* ${b.pickupLocation}`);
  if (b.destination) rows.push(`*Destination:* ${b.destination}${b.destinationState ? `, ${b.destinationState}` : ""}`);
  rows.push(`*Date:* ${b.pickupDate} at ${b.pickupTime}`);
  if (b.returnDate) rows.push(`*Return:* ${b.returnDate}`);
  if (b.numDays > 1) rows.push(`*Duration:* ${b.numDays} days`);
  rows.push(`*Passengers:* ${b.passengers}`, `*Luggage:* ${b.luggage}`);
  if (b.flightNumber) rows.push(`*Flight:* ${b.flightNumber}`);
  if (b.addOns.length) rows.push(`*Add-ons:* ${b.addOns.map((a) => a.label).join(", ")}`);
  rows.push(
    `*Quote:* ${b.isEstimate ? `${formatNaira(b.quoteTotal)} (estimate — some items need confirmation)` : formatNaira(b.quoteTotal)}`,
    `*Payment:* ${PAYMENT_LABEL[b.paymentOption] ?? b.paymentOption}${opts?.paid ? ` — PAID ${formatNaira(b.amountPaid)}` : b.amountPaid > 0 ? ` — paid ${formatNaira(b.amountPaid)} so far` : ""}`,
    `*Status:* ${STATUS_LABEL[b.status] ?? b.status}`,
  );
  if (b.notes) rows.push(`*Notes:* ${b.notes}`);
  rows.push(``, `Please confirm my booking. Thank you!`);
  return rows.join("\n");
}

/** Admin-side follow-up message to the customer. */
export function adminFollowUpMessage(b: Booking): string {
  return [
    `Hello ${b.customerName}, this is H06 Rentals concierge.`,
    ``,
    `Regarding your booking *${b.ref}* — ${b.vehicleName ?? getTripType(b.tripType)?.label ?? b.tripType} on ${b.pickupDate} at ${b.pickupTime}.`,
    ``,
  ].join("\n");
}

export function customerWaLink(phone: string, message: string): string {
  const clean = phone.replace(/[^\d]/g, "").replace(/^0/, "234");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
