import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mark } from "@/components/Logo";
import { PayActions } from "@/components/booking/PayActions";
import { formatNaira } from "@/lib/quote";
import { getBookingByRef, getVehicle } from "@/lib/repo";
import { getTripType } from "@/lib/trip-types";
import { bookingWhatsAppMessage, waLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Booking",
  robots: { index: false },
};

/** Bronze is reserved for the VIP wing — core bookings celebrate in emerald. */
function statusUi(status: string, isVip: boolean): { label: string; tone: "emerald" | "bronze" | "neutral" | "red" } {
  const celebratory = isVip ? ("bronze" as const) : ("emerald" as const);
  switch (status) {
    case "pending_payment":
      return { label: "Awaiting payment", tone: "neutral" };
    case "pending_confirmation":
      return { label: "Awaiting concierge confirmation", tone: "emerald" };
    case "confirmed":
      return { label: "Confirmed", tone: celebratory };
    case "completed":
      return { label: "Completed", tone: celebratory };
    case "cancelled":
      return { label: "Cancelled", tone: "red" };
    default:
      return { label: "Awaiting concierge confirmation", tone: "emerald" };
  }
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { ref } = await params;
  const { payment } = await searchParams;
  const booking = await getBookingByRef(decodeURIComponent(ref));
  if (!booking) notFound();

  const trip = getTripType(booking.tripType);
  const vehicle = booking.vehicleSlug ? await getVehicle(booking.vehicleSlug) : null;
  const isVip = vehicle?.tier === "vip" || booking.tripType === "vip_security";
  const ui = statusUi(booking.status, isVip);
  const paid = booking.amountPaid > 0;
  const outstanding = Math.max(0, booking.amountDue - booking.amountPaid);
  const celebration = paid || booking.status === "confirmed" || booking.status === "completed";
  const waMessage = bookingWhatsAppMessage(booking, { paid });

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-28 lg:px-0">
      <div className="flex flex-col items-center text-center">
        {celebration ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={isVip ? "/brand/render-bronze-alpha.png" : "/brand/render-emerald-alpha.png"}
            alt=""
            width={86}
            height={92}
            className="mark-pulse object-contain drop-shadow-[0_14px_36px_rgba(30,92,69,0.45)]"
            draggable={false}
          />
        ) : (
          <Mark variant="silver" size={72} />
        )}
        <p className={`eyebrow mt-6 ${celebration && isVip ? "eyebrow-bronze" : "eyebrow-emerald"}`}>
          Booking {booking.ref}
        </p>
        <h1 className="display mt-3 text-3xl text-cream md:text-4xl">
          {payment === "success" || (paid && booking.status === "pending_confirmation")
            ? "Payment received. You're nearly there."
            : payment === "failed"
              ? "That payment didn't go through"
              : booking.status === "confirmed"
                ? "Your car is confirmed."
                : booking.status === "completed"
                  ? "Trip completed. Thank you."
                  : booking.status === "cancelled"
                    ? "This booking was cancelled"
                    : "Reservation received"}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          {payment === "failed"
            ? "No money left your account, or the charge was declined. You can try again below, or the concierge can arrange a bank transfer."
            : booking.status === "pending_confirmation"
              ? "The H06 concierge is reviewing your booking and will confirm on WhatsApp shortly."
              : booking.status === "pending_payment"
                ? "Complete payment to move your reservation to the front of the queue — or confirm via the concierge first."
                : null}
        </p>
        <span
          className={`mt-5 rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider ${
            ui.tone === "bronze"
              ? "border-champagne/40 text-champagne"
              : ui.tone === "emerald"
                ? "border-emerald-glow/40 text-emerald-glow"
                : ui.tone === "red"
                  ? "border-red-400/40 text-red-300"
                  : "border-cream/20 text-cream-dim"
          }`}
        >
          {ui.label}
        </span>
      </div>

      {/* summary */}
      <div className="glass mt-10 p-6 md:p-8">
        <h2 className="eyebrow mb-5">Trip summary</h2>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <Row k="Trip" v={trip?.label ?? booking.tripType} />
          {booking.vehicleName && <Row k="Vehicle" v={booking.vehicleName} />}
          {booking.chauffeurTier && (
            <Row k="Chauffeur" v={booking.chauffeurTier === "spy_police" ? "Spy Police" : "Regular"} />
          )}
          <Row k="Pickup" v={booking.pickupLocation} />
          {booking.destination && (
            <Row k="Destination" v={`${booking.destination}${booking.destinationState ? `, ${booking.destinationState}` : ""}`} />
          )}
          <Row k="Date" v={`${booking.pickupDate} at ${booking.pickupTime}`} />
          {booking.returnDate && <Row k="Return" v={booking.returnDate} />}
          {booking.numDays > 1 && <Row k="Duration" v={`${booking.numDays} days`} />}
          <Row k="Passengers" v={String(booking.passengers)} />
          <Row k="Luggage" v={String(booking.luggage)} />
          {booking.flightNumber && <Row k="Flight" v={booking.flightNumber} />}
          {booking.addOns.length > 0 && <Row k="Add-ons" v={booking.addOns.map((a) => a.label).join(", ")} />}
        </dl>

        <h2 className="eyebrow mb-4 mt-8">Quote</h2>
        <ul className="space-y-2.5 text-sm">
          {booking.quoteBreakdown.map((l, i) => (
            <li key={i} className="flex items-start justify-between gap-3">
              <span className="text-cream-dim">{l.label}</span>
              <span className="shrink-0 text-cream">{l.amountNgn == null ? "TBC" : formatNaira(l.amountNgn)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t hairline pt-4">
          <span className="text-sm text-cream-dim">{booking.isEstimate ? "Estimated total" : "Total"}</span>
          <span className="display text-2xl text-emerald-glow">{formatNaira(booking.quoteTotal)}</span>
        </div>
        {booking.isEstimate && (
          <p className="mt-2 text-xs text-cream-dim">Estimated quote. Final confirmation by H06 concierge.</p>
        )}
        {paid && (
          <p className="mt-3 rounded-lg border border-emerald-glow/30 bg-emerald-deep/15 p-3 text-sm text-emerald-glow">
            Paid so far: {formatNaira(booking.amountPaid)}
            {outstanding > 0 ? ` — outstanding: ${formatNaira(outstanding)}` : " — fully paid ✓"}
          </p>
        )}
      </div>

      {/* actions */}
      <div className="mt-8 flex flex-col gap-3">
        {outstanding > 0 && booking.status !== "cancelled" && (
          <PayActions bookingRef={booking.ref} outstanding={outstanding} />
        )}
        <a
          href={waLink(waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-whatsapp btn-lg w-full"
        >
          Send booking to WhatsApp concierge
        </a>
        <p className="text-center text-xs text-muted">
          The message is pre-filled with every detail — nothing to retype.
        </p>
        <p className="mt-3 text-center text-xs text-muted">
          While you wait —{" "}
          <a
            href="https://www.instagram.com/h06rentals"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cream-dim underline decoration-emerald-glow/40 underline-offset-2 hover:text-cream"
          >
            follow @h06rentals on Instagram
          </a>{" "}
          for the fleet in motion.
        </p>
        <Link href="/" className="btn btn-ghost btn-md mx-auto mt-2">
          Back to the showroom
        </Link>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 sm:block">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right text-cream sm:mt-0.5 sm:text-left">{v}</dd>
    </div>
  );
}
