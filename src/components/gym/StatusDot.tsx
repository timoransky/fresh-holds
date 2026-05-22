type Props = {
  state: "fresh" | "stale" | "none";
};

export function StatusDot({ state }: Props) {
  if (state === "fresh") {
    return (
      <span
        aria-label="fresh since your last visit"
        className="inline-block size-1.5 rounded-full bg-fresh"
      />
    );
  }
  if (state === "stale") {
    return (
      <span
        aria-label="already climbed"
        className="inline-block size-1.5 rounded-full border border-muted-foreground/50"
      />
    );
  }
  return (
    <span
      aria-label="no reset data"
      className="inline-block size-1 rounded-full bg-muted-foreground/30"
    />
  );
}
