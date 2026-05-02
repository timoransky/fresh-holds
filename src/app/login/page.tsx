import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Sign in · Fresh Holds",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <span className="inline-block rounded-full border-2 border-foreground/80 bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
            fresh holds
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Sign in</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
