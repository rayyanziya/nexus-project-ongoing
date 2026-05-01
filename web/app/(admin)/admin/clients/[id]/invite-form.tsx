"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteClientUserAction, type InviteState } from "../actions";

export function InviteUserForm({ clientId }: { clientId: string }) {
  const action = inviteClientUserAction.bind(null, clientId);
  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    action,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          disabled={pending}
          placeholder="user@example.com"
          className="flex-1 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send invitation"}
        </button>
      </div>
      {state && (
        <p
          className={
            state.ok
              ? "text-sm text-emerald-700"
              : "text-sm text-red-700"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
