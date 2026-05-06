import type { Metadata } from "next";
import { SignInForm } from "@/components/SignInForm";

export const metadata: Metadata = {
  title: "Sign in · Fresh Holds",
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <span className="inline-block rounded-full border-2 border-foreground/80 bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
            fresh holds
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sync your visits across devices and suggest resets when sectors get refreshed.
          </p>
        </div>

        <SignInForm next={next ?? "/"} />
      </div>
    </main>
  );
}
