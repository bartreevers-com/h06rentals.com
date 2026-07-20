"use client";

import { useActionState } from "react";
import { changeMyPasswordAction } from "../actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changeMyPasswordAction, null);
  return (
    <form action={action} className="grid gap-4">
      <div>
        <label className="field-label" htmlFor="pw-current">Current password</label>
        <input id="pw-current" name="current" type="password" className="field" autoComplete="current-password" required />
      </div>
      <div>
        <label className="field-label" htmlFor="pw-next">New password (min 8 characters)</label>
        <input id="pw-next" name="next" type="password" className="field" autoComplete="new-password" required minLength={8} />
      </div>
      <div>
        <label className="field-label" htmlFor="pw-confirm">Repeat new password</label>
        <input id="pw-confirm" name="confirm" type="password" className="field" autoComplete="new-password" required minLength={8} />
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
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
