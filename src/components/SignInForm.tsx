"use client";

import { useActionState, useEffect, useState } from "react";
import {
  requestOtpCode,
  verifyOtpCode,
  type RequestOtpState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

type Props = {
  next?: string;
};

export function SignInForm({ next = "/" }: Props) {
  const [emailState, requestAction, requestPending] = useActionState<
    RequestOtpState,
    FormData
  >(requestOtpCode, null);

  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (emailState && "sent" in emailState && emailState.sent) {
      setPendingEmail(emailState.email);
    }
  }, [emailState]);

  if (pendingEmail) {
    return (
      <CodeForm
        email={pendingEmail}
        next={next}
        onChangeEmail={() => setPendingEmail(null)}
        resendAction={requestAction}
        resendPending={requestPending}
      />
    );
  }

  const error = emailState && "error" in emailState ? emailState.error : null;

  return (
    <form action={requestAction} className="flex flex-col gap-4">
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

      <Button type="submit" disabled={requestPending} className="mt-2 w-full">
        {requestPending ? "Sending code…" : "Send sign-in code"}
      </Button>

      <p className="text-xs text-muted-foreground">
        We&rsquo;ll email you an 8-digit code. No password needed.
      </p>
    </form>
  );
}

type CodeFormProps = {
  email: string;
  next: string;
  onChangeEmail: () => void;
  resendAction: (formData: FormData) => void;
  resendPending: boolean;
};

function CodeForm({
  email,
  next,
  onChangeEmail,
  resendAction,
  resendPending,
}: CodeFormProps) {
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyOtpCode,
    null,
  );
  const error = verifyState?.error ?? null;

  const handleResend = () => {
    const formData = new FormData();
    formData.set("email", email);
    resendAction(formData);
  };

  return (
    <form action={verifyAction} className="flex flex-col gap-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />

      <div className="rounded-lg border border-foreground/15 bg-background/60 px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          We sent a code to{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
        <button
          type="button"
          onClick={onChangeEmail}
          className="mt-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Wrong email?
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="token" className="text-sm font-medium">
          8-digit code
        </label>
        <input
          id="token"
          name="token"
          type="text"
          required
          inputMode="numeric"
          pattern="[0-9]{8}"
          maxLength={8}
          autoComplete="one-time-code"
          autoFocus
          className="h-9 rounded-md border border-input bg-background px-3 font-mono text-sm tracking-[0.4em] outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        />
      </div>

      <Button type="submit" disabled={verifyPending} className="mt-2 w-full">
        {verifyPending ? "Verifying…" : "Sign in"}
      </Button>

      <button
        type="button"
        onClick={handleResend}
        disabled={resendPending}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
      >
        {resendPending ? "Sending…" : "Resend code"}
      </button>
    </form>
  );
}
