import { Suspense } from "react";
import { cookies } from "next/headers";
import { getRankedGyms } from "@/lib/db/ranking";
import { getCurrentUser } from "@/lib/auth";
import { todayISO } from "@/lib/date";
import { VISITS_COOKIE } from "@/lib/visit-log";
import { GymList } from "@/components/GymList";
import { HeaderAuth } from "@/components/HeaderAuth";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AdminMenuLink } from "@/components/user/AdminMenuLink";
import { SuggestResetMenuDialogSlot } from "@/components/user/SuggestResetMenuDialogSlot";
import { VisitHistoryMenuDialogSlot } from "@/components/user/VisitHistoryMenuDialogSlot";

export default async function Home() {
  const [cookieStore, user] = await Promise.all([cookies(), getCurrentUser()]);
  const visitsCookieRaw = cookieStore.get(VISITS_COOKIE)?.value ?? "";
  const { gyms, ranking } = await getRankedGyms(visitsCookieRaw, todayISO());

  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-4 py-6 sm:pt-10 sm:pb-14 overflow-hidden">
      <header className="mb-10 sm:mb-14">
        <div className="flex items-center justify-between gap-2">
          {/* Slot div keeps HeaderAuth flush right when OfflineIndicator returns null (online). */}
          <div>
            <OfflineIndicator />
          </div>
          <Suspense fallback={<HeaderAuthFallback />}>
            <HeaderAuthSection />
          </Suspense>
        </div>
        <h1 className="mt-6 sm:mt-10 font-heading text-balance text-4xl font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl motion-safe:animate-[fade-up-in_550ms_cubic-bezier(0.22,1,0.36,1)_60ms_both]">
          where are the <span className="text-brand">fresh holds</span> right now?
        </h1>
        <p className="mt-6 max-w-prose text-base text-balance text-muted-foreground sm:text-lg motion-safe:animate-[fade-up-in_550ms_cubic-bezier(0.22,1,0.36,1)_180ms_both]">
          Log your visits to get the best recommendation for your next climbing session in{" "}
          <strong className="font-semibold text-foreground">Bratislava</strong>, based on the recent
          gym resets. Sorted by what&rsquo;s new since you were last there.
        </p>
      </header>

      {gyms.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-foreground/20 bg-background/60 p-6 text-sm text-muted-foreground">
          No gyms yet.
        </p>
      ) : (
        <GymList gyms={gyms} authed={Boolean(user)} initialRanking={ranking} />
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

async function HeaderAuthSection() {
  return (
    <HeaderAuth
      suggestResetDialogSlot={
        <Suspense fallback={null}>
          <SuggestResetMenuDialogSlot />
        </Suspense>
      }
      visitHistoryDialogSlot={
        <Suspense fallback={null}>
          <VisitHistoryMenuDialogSlot authed />
        </Suspense>
      }
      adminLinkSlot={
        <Suspense fallback={null}>
          <AdminMenuLink />
        </Suspense>
      }
    />
  );
}

function HeaderAuthFallback() {
  return <div className="h-8"></div>;
}
