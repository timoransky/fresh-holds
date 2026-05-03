"use client";

import { useActionState } from "react";
import { requestMagicLink } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

type Props = {
  next?: string;
};

export function SignInForm({ next = "/" }: Props) {
  const [state, formAction, isPending] = useActionState(requestMagicLink, null);
  const sent = state && "sent" in state && state.sent;
  const error = state && "error" in state ? state.error : null;

  if (sent) {
    return (
      <div className="rounded-lg border border-foreground/15 bg-background/60 px-4 py-6 text-sm">
        <p className="font-semibold text-foreground">Check your email.</p>
        <p className="mt-1 text-muted-foreground">
          We sent you a sign-in link. Open it on this device to finish signing in.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        />
      </div>

      <Button type="submit" disabled={isPending} className="mt-2 w-full">
        {isPending ? "Sending link…" : "Send sign-in link"}
      </Button>

      <p className="text-xs text-muted-foreground">
        We&rsquo;ll email you a one-time link. No password needed.
      </p>
    </form>
  );
}
