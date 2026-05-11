"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { requestOtpCode, verifyOtpCode, type RequestOtpState } from "@/lib/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  next?: string;
};

export function SignInForm({ next = "/" }: Props) {
  const [emailState, requestAction, requestPending] = useActionState<RequestOtpState, FormData>(
    requestOtpCode,
    null,
  );

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
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
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

function CodeForm({ email, next, onChangeEmail, resendAction, resendPending }: CodeFormProps) {
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyOtpCode, null);
  const error = verifyState?.error ?? null;

  const handleResend = () => {
    const formData = new FormData();
    formData.set("email", email);
    startTransition(() => {
      resendAction(formData);
    });
  };

  return (
    <form action={verifyAction} className="flex flex-col gap-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />

      <div className="rounded-lg border border-foreground/15 bg-background/60 px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          We sent a code to <span className="font-medium text-foreground">{email}</span>.
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
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-baseline">
          <Label htmlFor="token">8-digit code</Label>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendPending}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
          >
            {resendPending ? "Sending…" : "Resend code"}
          </button>
        </div>

        <Input
          id="token"
          name="token"
          type="text"
          required
          inputMode="numeric"
          pattern="[0-9]{8}"
          maxLength={8}
          autoComplete="one-time-code"
          autoFocus
          className="font-mono tracking-[0.4em]"
        />
      </div>

      <Button type="submit" disabled={verifyPending} className="mt-2 w-full">
        {verifyPending ? "Verifying…" : "Sign in"}
      </Button>
    </form>
  );
}
