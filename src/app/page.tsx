import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { GymList } from "@/components/GymList";

export const dynamic = "force-dynamic";

export default async function Home() {
  const gyms = await getActiveGymsWithSections();

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
      <h1 className="text-3xl sm:text-4xl font-semibold text-neutral-900 mt-2">
        Where should you climb?
      </h1>
      <p className="text-neutral-600 mt-2">
        Sorted by what&rsquo;s freshest since you were last there.
      </p>

      <div className="mt-8">
        {gyms.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No gyms yet. Run the migration and seed in Supabase to get started.
          </p>
        ) : (
          <GymList gyms={gyms} />
        )}
      </div>

      <footer className="text-xs text-neutral-400 mt-12 text-center">
        Reset data logged manually · Visits saved on this device only
      </footer>
    </main>
  );
}
