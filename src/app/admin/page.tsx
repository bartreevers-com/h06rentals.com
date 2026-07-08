import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin-auth";
import { LoginForm } from "./LoginForm";

export default async function AdminHome() {
  const session = await getSession();
  if (session) redirect(session.role === "driver" ? "/admin/trips" : "/admin/bookings");
  return (
    <div className="mx-auto max-w-sm pt-16">
      <h1 className="display text-2xl text-cream">Staff sign-in</h1>
      <p className="mt-2 text-sm text-muted">
        Admin, sales and drivers sign in here — you&apos;ll see your own workspace.
      </p>
      <LoginForm />
    </div>
  );
}
