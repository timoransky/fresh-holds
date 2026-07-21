"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SupabaseClient = ReturnType<typeof createClient>;

type Props = {
  next?: string;
};

// Only follow same-origin, non-protocol-relative destinations. Anything else
// (an absolute URL, `//evil.com`) collapses to `/`, closing an open redirect.
function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function SignInForm({ next = "/" }: Props) {
  const [supabase] = useState(createClient);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  if (pendingEmail) {
    return (
      <CodeForm
        supabase={supabase}
        email={pendingEmail}
        next={next}
        onChangeEmail={() => setPendingEmail(null)}
      />
    );
  }

  return <EmailForm supabase={supabase} onSent={setPendingEmail} />;
}

type EmailFormProps = {
  supabase: SupabaseClient;
  onSent: (email: string) => void;
};

function EmailForm({ supabase, onSent }: EmailFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) {
      setError("Enter your email.");
      return;
    }

    setError(null);
    setPending(true);
    const { error: sendError } = await supabase.auth.signInWithOtp({ email });
    setPending(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }

    onSent(email);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormAlert state={error ? { error } : null} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Sending code…" : "Send sign-in code"}
      </Button>

      <p className="text-xs text-muted-foreground">
        We&rsquo;ll email you an 8-digit code. No password needed.
      </p>
    </form>
  );
}

type CodeFormProps = {
  supabase: SupabaseClient;
  email: string;
  next: string;
  onChangeEmail: () => void;
};

function CodeForm({ supabase, email, next, onChangeEmail }: CodeFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);

  const handleResend = async () => {
    setResendPending(true);
    setError(null);
    const { error: sendError } = await supabase.auth.signInWithOtp({ email });
    setResendPending(false);
    if (sendError) setError(sendError.message);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget).get("token") ?? "").trim();
    if (!token) {
      setError("Enter the 8-digit code from your email.");
      return;
    }

    setError(null);
    setPending(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (verifyError) {
      setPending(false);
      setError(verifyError.message);
      return;
    }

    // Auth cookie is set on the browser client; AuthListener will fire the
    // server refresh. Navigate to close the modal / reach the destination —
    // leave `pending` set so the button stays disabled through navigation.
    router.replace(safeNext(next));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

      <FormAlert state={error ? { error } : null} />

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

      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Verifying…" : "Sign in"}
      </Button>
    </form>
  );
}
