# Product

## Register

product

## Users

Bratislava boulderers who climb at more than one gym in town (The Spot, K2, Hangár, and friends) and want to pick the one with the most new climbing for them right now. They're already on their way: on the bus, on a couch deciding whether to leave the couch, or standing outside one gym debating whether to ride to another. The useful question is rarely "which gym is closest" — it's "which gym is freshest since I was last there."

The audience is local. Most are Slovak speakers; the product is currently EN-only but the voice should not feel imported.

## Product Purpose

Fresh Holds turns a city's bouldering reset schedules into a single, glanceable recommendation. It blends *how much you've been climbing lately* with *how much has been set since you were last there* into a novelty score, then binds that score to a tier label so users read a verdict, not a number.

It works without an account. localStorage is the canonical visit log; sign-in is purely opt-in for cross-device sync. The home page is offline-capable and installable as a PWA, because a non-trivial number of visits happen on the way to the gym.

Success: a user opens the app, sees the top card, and goes. They don't read documentation. They don't tune anything. They don't sign in.

## Brand Personality

Friendly, playful, approachable.

Reflected in: Baloo 2 as the heading font (round, warm, a touch of personality), Geist for body (clean, modern, no nonsense), the soft off-white background with subtle dot pattern instead of pure white, the squircle corner-shape utility, and the small bobbing/pop-in animations that punctuate a hot recommendation. The voice is climber-native — tier names like "sending hot" or "slim pickings" are part of the product, not decoration.

The tone is a gym buddy who already checked all the gyms for you — not a coach, not a tracker, not an oracle.

## Anti-references

This must NOT look like:

- **Generic SaaS dashboard.** No hero-metric cards, no gradient accents, no analytics-tool layout.
- **Fitness-app aesthetic.** No athletic stock photography, no neon gradients, no gamified XP/levels. This is not Strava and it is not trying to be.
- **Outdoorsy-brand template.** No earth tones, no kraft-paper textures, no "rugged adventure" stock visuals. Avoid Patagonia-by-numbers.
- **Corporate utility.** No Material/iOS-HIG-by-default cards. No default radii, no default greys, no "ship it and move on" anonymity.

## Design Principles

### Read a recommendation, not numbers.

The math (visit gap × substance → novelty score) is diagnostic, not user-facing. Cards lead with a tier label, a verdict in plain language. Raw counts and dates are supporting detail, not the headline. When there's no reset data, say so honestly — the UI shows "no reset data," not a fabricated middle tier.

This principle shapes hierarchy, typography weight, and what gets a big number vs. a small annotation.

## Accessibility & Inclusion

- **WCAG 2.1 AA** for color contrast, focus visibility, and keyboard reachability. Radix primitives via shadcn cover the structural side.
- **Light-only**, by design (see `viewport.colorScheme: "light"` in the root layout). The use case skews outdoor/in-transit, not dim-room.
- **`prefers-reduced-motion`** must be respected for the badge-bob, pop-in, and any future card-expand transitions.
- **Color-blind safety is non-negotiable.** The tier system (HOT / WORTH / SLIM / STALE / UNKNOWN) carries semantic weight; it must communicate via shape, icon, or label *in addition to* color. No tier should be distinguishable by hue alone.
