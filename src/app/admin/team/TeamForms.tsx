"use client";

import { useActionState } from "react";
import { createStaffAction, resetStaffPasswordAction } from "../actions";

export function CreateStaffForm() {
  const [state, action, pending] = useActionState(createStaffAction, null);
  return (
    <form action={action} className="grid gap-4">
      <div>
        <label className="field-label" htmlFor="staff-name">Full name</label>
        <input id="staff-name" name="name" className="field" />
      </div>
      <div>
        <label className="field-label" htmlFor="staff-phone">Phone (their sign-in)</label>
        <input id="staff-phone" name="phone" className="field" placeholder="+234…" />
      </div>
      <div>
        <label className="field-label" htmlFor="staff-email">Email (optional)</label>
        <input id="staff-email" name="email" type="email" className="field" />
      </div>
      <div>
        <label className="field-label" htmlFor="staff-role">Role</label>
        <select id="staff-role" name="role" className="field" defaultValue="sales">
          <option value="admin">Admin — full access</option>
          <option value="sales">Sales — bookings &amp; enquiries</option>
          <option value="driver">Driver — assigned trips only</option>
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="staff-password">Initial password (min 8 chars)</label>
        <input id="staff-password" name="password" type="text" className="field" autoComplete="off" />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg border border-emerald-glow/30 bg-emerald-deep/15 p-3 text-sm text-emerald-glow">
          {state.ok}
        </p>
      )}
      <button className="btn btn-primary btn-md" disabled={pending}>
        {pending ? "Adding…" : "Add team member"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(resetStaffPasswordAction, null);
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={userId} />
      <input
        name="password"
        type="text"
        className="field !w-56 !py-2 text-sm"
        placeholder="New password (min 8)"
        autoComplete="off"
      />
      <button className="btn btn-ghost btn-sm" disabled={pending}>
        {pending ? "Saving…" : "Set password"}
      </button>
      {state?.error && <span className="text-xs text-red-300">{state.error}</span>}
      {state?.ok && <span className="text-xs text-emerald-glow">{state.ok}</span>}
    </form>
  );
}
