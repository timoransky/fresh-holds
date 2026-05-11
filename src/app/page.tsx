import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { getCurrentUser } from "@/lib/auth";
import { GymList } from "@/components/GymList";
import { HeaderAuth } from "@/components/HeaderAuth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [gyms, user] = await Promise.all([getActiveGymsWithSections(), getCurrentUser()]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-4 py-10 sm:py-14 overflow-hidden">
      <header className="mb-10 sm:mb-14">
        <div className="flex justify-end">
          <HeaderAuth gyms={gyms} />
        </div>
        <h1 className="mt-6 font-heading text-balance text-4xl font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl">
          where are the <span className=" text-brand">fresh holds</span> right now?
        </h1>
        <p className="mt-6 max-w-prose text-base text-balance text-muted-foreground sm:text-lg">
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
