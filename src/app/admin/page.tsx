import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { LoginForm } from "./LoginForm";

export default async function AdminHome() {
  if (await isAdmin()) redirect("/admin/bookings");
  return (
    <div className="mx-auto max-w-sm pt-16">
      <h1 className="display text-2xl text-cream">Concierge sign-in</h1>
      <p className="mt-2 text-sm text-muted">Operations access for the H06 team.</p>
      <LoginForm />
    </div>
  );
}
