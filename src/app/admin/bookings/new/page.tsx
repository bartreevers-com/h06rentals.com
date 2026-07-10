import Link from "next/link";
import { redirect } from "next/navigation";
import { hasRole } from "@/lib/admin-auth";
import { listVehicles } from "@/lib/repo";
import { TRIP_TYPES, CHAUFFEUR_TIERS } from "@/lib/trip-types";
import { NewBookingForm } from "./NewBookingForm";

export const dynamic = "force-dynamic";

/** Phone-in bookings: staff book on the client's behalf; the client gets
 *  the same emails, booking page and payment link as a web booking. */
export default async function NewAdminBooking() {
  if (!(await hasRole("owner", "admin", "sales"))) redirect("/admin");
  const vehicles = await listVehicles({});

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/bookings" className="text-xs text-muted hover:text-cream-dim">
        ← Back to bookings
      </Link>
      <h1 className="display mt-2 text-2xl text-cream">New phone-in booking</h1>
      <p className="mt-1 text-sm text-muted">
        Book on the client&apos;s behalf. They&apos;ll receive every email a web customer gets —
        confirmation, payment link, receipts — at the address you enter here.
      </p>
      <NewBookingForm
        trips={TRIP_TYPES.map((t) => ({ id: t.id, label: t.label }))}
        tiers={CHAUFFEUR_TIERS.map((t) => ({ id: t.id, label: t.label }))}
        vehicles={vehicles.map((v) => ({ slug: v.slug, name: v.name, tier: v.tier }))}
      />
    </div>
  );
}
