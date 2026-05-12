import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInPanel } from "@/components/SignInPanel";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default function LoginPage({ searchParams }: Props) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Suspense fallback={<SignInPanelFallback />}>
          <LoginContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginContent({ searchParams }: Props) {
  const { next } = await searchParams;
  return <SignInPanel next={next ?? "/"} />;
}

function SignInPanelFallback() {
  return <div aria-hidden className="h-64 rounded-2xl bg-foreground/5" />;
}
