export function GymListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          freshest for you today
        </h2>
        <div className="h-44 rounded-3xl squircle-4xl bg-foreground/5 animate-pulse" />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          also worth a look
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 items-start">
          <div className="h-40 sm:h-37 rounded-3xl squircle-4xl bg-foreground/5 animate-pulse" />
          <div className="h-40 sm:h-37 rounded-3xl squircle-4xl bg-foreground/5 animate-pulse" />
        </div>
      </section>
    </div>
  );
}
