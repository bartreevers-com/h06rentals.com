"use client";

import { useActionState, useState } from "react";
import {
  createStaffAction,
  emailAllLoginsAction,
  emailLoginDetailsAction,
  resetStaffPasswordAction,
} from "../actions";

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
          <option value="owner">Owner — everything, including Team</option>
          <option value="admin">Admin — full access (except Team &amp; Performance)</option>
          <option value="sales">Sales — bookings &amp; enquiries</option>
          <option value="driver">Driver — assigned trips only</option>
          <option value="hr">HR — performance &amp; recruitment</option>
          <option value="hiring_manager">Hiring manager — assigned vacancies only</option>
          <option value="assessor">Panel assessor — assigned candidates only</option>
          <option value="staff">Staff — tracked for performance, no sign-in</option>
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

export function EmailLoginButton({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(emailLoginDetailsAction, null);
  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="id" value={userId} />
      <button className="btn btn-ghost btn-sm" disabled={pending}>
        {pending ? "Sending…" : "Reset password & email login"}
      </button>
      {state?.error && <p className="mt-1.5 text-xs text-red-300">{state.error}</p>}
      {state?.ok && <p className="mt-1.5 text-xs text-emerald-glow">{state.ok}</p>}
    </form>
  );
}

export function EmailAllLoginsButton() {
  const [state, action, pending] = useActionState(emailAllLoginsAction, null);
  const [confirming, setConfirming] = useState(false);
  return (
    <div>
      {!confirming ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)}>
          Reset &amp; email all logins
        </button>
      ) : (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-amber-300">
            Every active account gets a NEW password, emailed to them. Current passwords stop working.
          </span>
          <button className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "Sending…" : "Yes, reset & email everyone"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)} disabled={pending}>
            Cancel
          </button>
        </form>
      )}
      {state?.ok && <p className="mt-2 text-xs text-emerald-glow">{state.ok}</p>}
      {state?.error && <p className="mt-2 text-xs text-red-300">{state.error}</p>}
    </div>
  );
}
