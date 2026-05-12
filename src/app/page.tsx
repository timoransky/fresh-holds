import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { getCurrentUser } from "@/lib/auth";
import { GymList } from "@/components/GymList";
import { HeaderAuth } from "@/components/HeaderAuth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [gyms, user] = await Promise.all([getActiveGymsWithSections(), getCurrentUser()]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-4 py-6 sm:pt-10 sm:pb-14 overflow-hidden">
      <header className="relative mb-10 sm:mb-14">
        <div className="relative z-10 flex justify-end">
          <HeaderAuth gyms={gyms} />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <img
            src="/images/blue-hold.svg"
            alt=""
            className="absolute top-0.5 left-0.5 w-8 -rotate-30 opacity-80 sm:bottom-auto sm:left-auto sm:right-36 sm:top-8 sm:w-14"
          />
          <img
            src="/images/yellow-hold.svg"
            alt=""
            className="absolute top-24 right-2 hidden w-14 rotate-12 opacity-80 sm:block"
          />
          <img
            src="/images/red-hold.svg"
            alt=""
            className="absolute bottom-4 right-22 hidden w-16 -rotate-9 opacity-80 sm:block"
          />
        </div>
        <h1 className="relative z-10 mt-6 sm:mt-10 font-heading text-balance text-4xl font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl">
          where are the <span className="text-brand">fresh holds</span> right now?
        </h1>
        <p className="relative z-10 mt-6 max-w-prose text-base text-balance text-muted-foreground sm:text-lg">
          Log your visits to get the best recommendation for your next climbing session based on the
          recent gym resets. Sorted by what&rsquo;s new since you were last there.
        </p>
      </header>

      {gyms.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-foreground/20 bg-background/60 p-6 text-sm text-muted-foreground">
          No gyms yet.
        </p>
      ) : (
        <GymList gyms={gyms} authed={Boolean(user)} />
      )}

      <footer className="mt-16 flex flex-row justify-center flex-wrap items-center gap-2 text-center text-xs text-muted-foreground">
        <span>resets logged manually</span>
        <span> - </span>
        <span>
          created with 🫀 by{" "}
          <a href="https://janci.dev" className="text-brand hover:text-brand-shadow">
            janci.dev
          </a>
        </span>
      </footer>
    </main>
  );
}
