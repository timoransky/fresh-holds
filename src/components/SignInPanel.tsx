import { SignInForm } from "@/components/SignInForm";

type Props = {
  next?: string;
};

export function SignInPanel({ next = "/" }: Props) {
  return (
    <>
      <div className="mb-4">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sync your visits across devices and suggest resets when sectors get refreshed.
        </p>
      </div>
      <SignInForm next={next} />
    </>
  );
}
