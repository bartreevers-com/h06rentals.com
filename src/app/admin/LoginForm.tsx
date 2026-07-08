"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-8 grid gap-4">
      <div>
        <label className="field-label" htmlFor="identifier">Phone number</label>
        <input
          id="identifier"
          name="identifier"
          className="field"
          autoComplete="username"
          placeholder="+234… (owner: type owner)"
          autoFocus
        />
      </div>
      <div>
        <label className="field-label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" className="field" />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary btn-md" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
