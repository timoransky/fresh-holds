import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { GymList } from "@/components/GymList";

export const dynamic = "force-dynamic";

export default async function Home() {
  const gyms = await getActiveGymsWithSections();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-4 py-10 sm:py-14">
      <header className="mb-10 sm:mb-14">
        <span className="inline-block rounded-full border-2 border-foreground/80 bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
          fresh holds · bratislava
        </span>
        <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-6xl">
          where&rsquo;s the freshest <span className="italic">climbing</span> right now?
        </h1>
        <p className="mt-3 max-w-prose text-base text-muted-foreground sm:text-lg">
          Sorted by what&rsquo;s new since you were last there. Tap{" "}
          <span className="font-semibold text-foreground">i climbed here</span> after a session and
          the list re-shuffles for next time.
        </p>
      </header>

      {gyms.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-foreground/20 bg-background/60 p-6 text-sm text-muted-foreground">
          No gyms yet. Run the migration and seed in Supabase to get started.
        </p>
      ) : (
        <GymList gyms={gyms} />
      )}

      <footer className="mt-16 flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-background/70 px-3 py-1 font-medium">
          made for sending in bratislava 🧗
        </span>
        <span>resets logged manually · visits saved on this device only</span>
      </footer>
    </main>
  );
}
