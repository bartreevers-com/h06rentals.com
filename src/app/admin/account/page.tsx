import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin-auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/admin");

  return (
    <div className="max-w-md">
      <h1 className="display text-2xl text-cream">Your account</h1>
      <p className="mt-1 text-sm text-muted">
        Signed in as {session.name} · {session.role.replace("_", " ")}
      </p>
      <div className="glass mt-6 p-6">
        <h2 className="eyebrow mb-4">Change my password</h2>
        {session.userId === 0 ? (
          <p className="text-sm text-muted">
            The owner sign-in password is set in the server environment (ADMIN_PASSWORD), not here.
          </p>
        ) : (
          <ChangePasswordForm />
        )}
      </div>
    </div>
  );
}
