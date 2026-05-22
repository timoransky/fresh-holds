---
name: Fresh Holds
description: Bratislava bouldering freshness, ranked. The Climber's Sticker Sheet.
colors:
  brand: "oklch(55.4% 0.046 257.417)"
  brand-shadow: "oklch(37.2% 0.044 257.287)"
  background: "oklch(0.99 0.004 90)"
  foreground: "oklch(0.18 0.02 270)"
  card: "oklch(1 0.002 90)"
  card-foreground: "oklch(0.18 0.02 270)"
  primary: "oklch(0.18 0.02 270)"
  primary-foreground: "oklch(0.99 0.004 90)"
  secondary: "oklch(0.95 0.012 90)"
  muted: "oklch(0.95 0.012 90)"
  muted-foreground: "oklch(0.45 0.02 270)"
  accent: "oklch(0.92 0.04 60)"
  border: "oklch(0.88 0.015 90)"
  ring: "oklch(0.45 0.02 270)"
  destructive: "oklch(0.577 0.245 27.325)"
  success-bg: "oklch(0.97 0.04 145)"
  success-fg: "oklch(0.45 0.13 145)"
  hot-bg: "oklch(0.93 0.08 30)"
  hot-fg: "oklch(0.38 0.18 30)"
  hot-ring: "oklch(0.55 0.20 30)"
  worth-bg: "oklch(0.94 0.13 92)"
  worth-fg: "oklch(0.36 0.10 70)"
  worth-ring: "oklch(0.62 0.16 80)"
  slim-bg: "oklch(0.93 0.07 165)"
  slim-fg: "oklch(0.36 0.10 165)"
  slim-ring: "oklch(0.58 0.13 165)"
  stale-bg: "oklch(0.93 0.025 285)"
  stale-fg: "oklch(0.42 0.04 285)"
  stale-ring: "oklch(0.65 0.05 285)"
  unknown-bg: "transparent"
  unknown-fg: "oklch(0.5 0 0)"
  unknown-ring: "oklch(0.78 0 0)"
typography:
  display:
    fontFamily: "Baloo 2, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Baloo 2, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Baloo 2, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  tier-label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  mono-numeric:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tnum"
  micro-label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  sm: "0.525rem"
  md: "0.7rem"
  lg: "0.875rem"
  xl: "1.225rem"
  "2xl": "1.575rem"
  "3xl": "1.925rem"
  "4xl": "2.275rem"
  pill: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  "2xl": "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.background}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2.25rem"
  button-primary-hover:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.background}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2.25rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2.25rem"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.background}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2.25rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
  card-tinted:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.3xl}"
    padding: "1rem"
  badge-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    height: "1.25rem"
  badge-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-fg}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    height: "1.25rem"
  brand-badge:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.75rem"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0.25rem 0.75rem"
    height: "2.25rem"
  tier-badge-hot:
    backgroundColor: "{colors.hot-bg}"
    textColor: "{colors.hot-fg}"
    rounded: "{rounded.2xl}"
    padding: "0.625rem 0.75rem 0.625rem 0.625rem"
  tier-badge-worth:
    backgroundColor: "{colors.worth-bg}"
    textColor: "{colors.worth-fg}"
    rounded: "{rounded.2xl}"
    padding: "0.625rem 0.75rem 0.625rem 0.625rem"
  tier-badge-slim:
    backgroundColor: "{colors.slim-bg}"
    textColor: "{colors.slim-fg}"
    rounded: "{rounded.2xl}"
    padding: "0.625rem 0.75rem 0.625rem 0.625rem"
  tier-badge-stale:
    backgroundColor: "{colors.stale-bg}"
    textColor: "{colors.stale-fg}"
    rounded: "{rounded.2xl}"
    padding: "0.625rem 0.75rem 0.625rem 0.625rem"
  tier-badge-unknown:
    backgroundColor: "{colors.unknown-bg}"
    textColor: "{colors.unknown-fg}"
    rounded: "{rounded.2xl}"
    padding: "0.625rem 0.75rem 0.625rem 0.625rem"
---

# Design System: Fresh Holds

## 1. Overview

**Creative North Star: "The Climber's Sticker Sheet"**

Fresh Holds looks like a friendly bulletin board for a local gym. The screen is a soft off-white card stock, dotted with a faint pinpoint pattern, onto which the day's gym recommendations are stuck like five colorful, slightly-rotated stickers. Each sticker (the *tier badge*) wears its mood plainly: an emoji, a casual climber phrase ("sending hot", "slim pickings"), and a stacked drop shadow that pretends to be a die-cut edge. Hover any control and it lifts a single pixel off the board. Press it and it presses back in.

The voice is climber-native and casual. The product is a verdict, not a dashboard, so the loudest element on any screen is the **tier label** ("sending hot" in lowercase extra-bold). Numbers are intentionally smaller and monospace-tabular, in the role of supporting evidence. Cards lean on warm tinted surfaces (a hint of the tier color), a 2px colored stroke-shadow that reads as a pressed sticker edge, and a soft deep ambient shadow underneath. Nothing here looks like SaaS, like a fitness tracker, or like an outdoors-brand template. It looks like its own thing: a gym-buddy app made by someone who climbs.

**Key Characteristics:**
- A small palette of warm neutrals on a 0.99-lightness off-white, with **five tier color systems** (coral, amber, sage, lavender-slate, unknown-cloud) carrying the product's main signal.
- **Pressed-sticker depth**: every surface has a flat 2px colored stroke-shadow ("sticker edge") plus a soft `0 12px 32px -12px` ambient shadow underneath. No raised drop-shadows, no glassmorphism except the dialog overlay.
- **Squircle corners everywhere** via the custom `squircle-*` utilities (`corner-shape: squircle`), graded across 7 steps from `sm` to `4xl`.
- **Tilted, bobbing tier badges** in the -2°/+1.5°/-1°/+2°/-1.5° range. Hero badges animate with the `badge-bob` keyframe under `motion-safe`.
- **Heading typography** in Baloo 2 (`font-heading`), bold and tightly tracked. Body in Geist; numerics in Geist Mono with tabular figures.
- **Tier color is never carried alone**: every tier also has a unique emoji, a unique label phrase, and a unique rotation. Color-blind safe by structural redundancy, not by accident.

## 2. Colors

A warm off-white canvas, a muted slate-blue brand for action, and five semantic tier palettes. Pure black and pure white are forbidden.

### Primary

- **Brand Slate** (`oklch(55.4% 0.046 257.417)`): The action color. Used on the primary button face. Carries the brand's quiet, instrumental confidence — the action is reliable, not loud.
- **Brand Shadow** (`oklch(37.2% 0.044 257.287)`): Darker partner. Used as the 2px stacked drop-shadow under the primary button and as the canonical *stroke-shadow* color for outline buttons. The brand's "pressed sticker edge."

### Tertiary (the Tier Palette — the product's main signal)

Each tier has a `bg` (warm tinted surface), `fg` (text on the badge), and `ring` (stroke + stacked shadow color). Never quote these by hue alone — always pair with the tier's label and emoji.

- **Sending Hot Coral** (`bg oklch(0.93 0.08 30)` · `fg oklch(0.38 0.18 30)` · `ring oklch(0.55 0.20 30)`): HOT tier — the gym is freshest for this user. Hero placement, bobbing animation, emoji 🔥, label `sending hot`, rotation `-2°`.
- **Worth-A-Climb Amber** (`bg oklch(0.94 0.13 92)` · `fg oklch(0.36 0.10 70)` · `ring oklch(0.62 0.16 80)`): WORTH tier. Emoji 💪, label `worth a climb`, rotation `+1.5°`.
- **Slim Sage** (`bg oklch(0.93 0.07 165)` · `fg oklch(0.36 0.10 165)` · `ring oklch(0.58 0.13 165)`): SLIM tier. Emoji 🥱, label `slim pickings`, rotation `-1°`.
- **Stale Slate** (`bg oklch(0.93 0.025 285)` · `fg oklch(0.42 0.04 285)` · `ring oklch(0.65 0.05 285)`): STALE tier. Emoji 💤, label `all stale`, rotation `+2°`.
- **Unknown Cloud** (`bg transparent` · `fg oklch(0.5 0 0)` · `ring oklch(0.78 0 0)`): UNKNOWN tier — no reset data. Renders with a **dashed** border and no stacked shadow. Emoji ❓, label `no data yet`, rotation `-1.5°`. This is the only tier without color; the dashed stroke is the honest "we don't know" cue.

### Neutral

- **Off-White Paper** (`oklch(0.99 0.004 90)`): Body background. Carries a fixed subtle dot pattern at 40px tile, 12% opacity ink (`#1a1a2e`), making the surface feel like a printed pinboard instead of a pristine card.
- **Card Cream** (`oklch(1 0.002 90)`): Surface for elevated cards. Slightly lighter than the body to read as "stuck on top."
- **Ink** (`oklch(0.18 0.02 270)`): Primary text. Tinted slightly toward the brand's slate-blue hue (never `#000`).
- **Muted Ink** (`oklch(0.45 0.02 270)`): Secondary text, table cell text, helper copy.
- **Border Cream** (`oklch(0.88 0.015 90)`): Default border for inputs, separators, dividers.
- **Secondary / Muted Surface** (`oklch(0.95 0.012 90)`): Used for ghost-state hover and chip backgrounds.

### Status

- **Destructive** (`oklch(0.577 0.245 27.325)`): Errors, destructive actions. Used on transparent tints (`destructive/10` background, `destructive/30` border).
- **Success Sage** (`bg oklch(0.97 0.04 145)` · `fg oklch(0.45 0.13 145)`): Approved-state badges and alerts. The `StatusDot` "fresh" pip uses a brighter `emerald-500`; this is a known drift — see Do's & Don'ts.

### Named Rules

**The Five-Sticker Rule.** Only the five tier palettes carry product meaning. New colors do not get added to communicate state — extend the tier semantic instead. If a state doesn't map to a tier, it doesn't deserve a hue: use muted neutrals plus an icon or label.

**The No-Pure-Anything Rule.** No `#000`, no `#fff`, no flat greys. Every neutral is tinted toward the warm off-white hue (chroma 0.002–0.015) so the page reads as paper, not screen. The dot-pattern background reinforces this.

**The Color-Plus-Shape Rule.** No tier is communicated by hue alone. Every tier carries an emoji, a label phrase, a rotation, and (except UNKNOWN) a colored stroke. Color blindness must not erase the verdict.

## 3. Typography

**Display Font:** Baloo 2 (with `ui-sans-serif, system-ui, sans-serif` fallback), exposed as `font-heading`. Weights 600/700/800.
**Body Font:** Geist (with Geist Fallback, then `ui-sans-serif`), exposed as `font-sans`.
**Numeric Font:** Geist Mono (`font-mono`), used for tier badge counts with `tabular-nums`.

**Character:** Baloo 2 is round, warm, and slightly playful — it carries the gym-buddy voice in headings without tipping into novelty. Geist below it stays neutral and crisp, so body copy never competes with the warmth above. Geist Mono numerics anchor the badge numbers; tabular figures prevent layout jitter as scores change.

### Hierarchy

- **Display** (Baloo 2, 700, `clamp(1.75rem, 4vw, 2.25rem)`, 1.1, `-0.015em`): Hero gym name on the top card. Always `text-balance`, `tracking-tight`, `leading-tight`. Lowercase tier labels do not get this treatment — only proper nouns.
- **Headline** (Baloo 2, 700, 1.5rem, 1.15): Compact gym card names, dialog titles in some surfaces.
- **Title** (Baloo 2, 500, 1rem, 1.4): Card titles inside the shadcn `Card` shell. Note the *medium* weight here, not bold — body cards stay calm.
- **Tier Label** (Geist, 800, 1rem, 1, `-0.015em`, **lowercase**): The verdict word on tier badges ("sending hot"). Lowercase is part of the voice — never capitalize.
- **Body** (Geist, 400, 0.875rem, 1.5): Default body text, table rows, helper copy. Cap line length at 65–75ch in any prose context.
- **Mono Numeric** (Geist Mono, 600, 1.25rem, 1, tabular): The big number on tier badges. Pairs with a small descriptor like `fresh sectors`. Numbers never get heading weight or treatment — they are evidence, not the headline.
- **Micro Label** (Geist, 500, 0.625rem, `0.08em` tracking, **uppercase**): Table column headers, the brand badge text. The brand badge pushes tracking to `0.2em` and weight to 700, but the structural intent is the same: a small structural marker, not narrative copy.

### Named Rules

**The Lowercase Verdict Rule.** Tier labels are lowercase. Always. "sending hot", not "Sending Hot", and definitely not "SENDING HOT". The lowercase is the climber-native voice in typography form.

**The Verdict-Loudest Rule.** On any surface that carries a tier, the tier label is the largest semantic element. Numeric scores, dates, and counts are smaller and quieter. The product translates math into a verdict; typography enforces it.

**The Heading-Belongs-To-Names Rule.** `font-heading` (Baloo 2) is reserved for proper nouns and tier titles — gym names, dialog titles, card titles. UI labels, table headers, button text, and helper copy stay in Geist.

## 4. Elevation

Fresh Holds uses the **Pressed Sticker** model: surfaces appear stuck to the page, not floating above it. Every elevated surface combines a flat colored stroke-shadow (the "sticker edge") with a soft ambient shadow underneath (the "underglow"). Hover translates the surface up by 2px and deepens the stroke-shadow to 4px. Press translates down to 1px. There are no traditional raised drop-shadows, no glassmorphism (except the dialog overlay), and no neumorphism.

### Shadow Vocabulary

- **Sticker Edge — rest** (`box-shadow: 0 2px 0 0 var(--surface-stroke)`): The default flat shadow under any pressable surface. The color is the surface's own stroke color (brand-shadow for buttons, tier-ring for tier badges, surface-stroke for cards). No blur, no spread.
- **Sticker Edge — lifted** (`box-shadow: 0 4px 0 0 var(--surface-stroke)`): The hover/focus state. The surface translates Y by `-2px` simultaneously, so the visual gap doubles.
- **Sticker Edge — pressed** (`box-shadow: 0 1px 0 0 var(--surface-stroke)`): The active/pressed state. Surface translates Y by `+1px`.
- **Card Underglow** (`box-shadow: 0 12px 32px -12px var(--surface-shadow)`): The soft ambient shadow under cards. Always stacked *with* the Sticker Edge, never alone. The surface-shadow color is a low-chroma version of the surface's tier hue.
- **Tier Badge Lift** (`box-shadow: 0 3px 0 0 var(--tier-ring)` on hero, `0 2px 0 0 var(--tier-ring)` on compact): Hero tier badges get a deeper sticker edge to read as more die-cut. The UNKNOWN tier explicitly has `shadow-none` and a dashed border — the "we don't know" cue is the absence of the edge.
- **Dialog Overlay** (`bg-black/30 backdrop-blur-xs`): The only sanctioned glassmorphism. A thin blur on the page behind a modal, never on a card or component.

### Named Rules

**The Pressed-Sticker Rule.** Surfaces sit on the page. They do not float above it. Drop shadows of the form `0 N px Mpx rgba(0,0,0,…)` (the SaaS hover-card shadow) are forbidden. If you need depth, use the Sticker Edge + Card Underglow combination.

**The Lift-Don't-Glow Rule.** Hover state moves the surface (translateY + deeper edge), never adds a glow or a halo. Focus state does the same. The motion is the affordance; color halos are not the system's language.

**The Unknown-Is-Dashed Rule.** When the system genuinely doesn't know (UNKNOWN tier, the no-data card), the visual language must show it. No solid stroke, no stacked shadow — a dashed border and a flat surface. Confidence has weight; uncertainty has none.

## 5. Components

### Buttons

- **Shape:** Squircle (`squircle-xl` default), lg radius (`0.875rem`).
- **Primary:** `bg-brand` face, `border-brand-shadow` stroke, `text-background` (off-white). The 2px stacked drop shadow uses `--color-brand-shadow`. The shadow pattern lifts to 4px on hover/focus, drops to 1px on active — paired with `translateY(-2px)` / `translateY(+1px)` respectively.
- **Outline:** `bg-background` face, stroke uses `--surface-stroke` (falls back to `--color-brand-shadow`). Same lift mechanic as Primary. `aria-expanded:bg-muted` so the same button serves as a popover trigger and clearly reads "open."
- **Secondary:** Quiet pill on `bg-secondary`, no lift mechanic — these are de-emphasized actions.
- **Ghost:** Transparent at rest, `hover:bg-background/60`. Used inside menus and dialogs.
- **Destructive:** Tinted only — `bg-destructive/10`, `text-destructive`. Never a saturated red background.
- **Sizes:** `xs (24px)`, `sm (32px)`, `default (36px)`, `lg (40px)`, plus matching `icon-*` square variants.
- **Icon-link pattern:** External-link buttons (Maps / website / Instagram in `GymExternalLinks`) use `variant="outline" size="icon-sm" className="rounded-full"` — a circular outline icon button. This is repeated 3× and is a candidate for extraction as an `IconLink` primitive.

### Tier Badges (signature component)

- **Shape:** `rounded-2xl` + `squircle-3xl` on hero, `squircle-2xl` on compact. **2px solid border** in the tier ring color.
- **Color:** `bg-(--tier-bg) text-(--tier-fg) border-(--tier-ring)`. Tokens are wired in via CSS custom properties from `tierBadgeStyle(tier)`.
- **Stacked shadow:** `0 3px 0 0 var(--tier-ring)` (hero) or `0 2px 0 0 var(--tier-ring)` (compact). UNKNOWN tier gets `shadow-none` and `border-dashed`.
- **Rotation:** `transform: rotate(var(--rot))` where `--rot` is the tier's own rotation (-2° to +2°). The bobbing animation respects rotation by composing `rotate(var(--rot)) translateY(...)` in the keyframe.
- **Animation:** Hero badges animate `badge-bob 3.6s ease-in-out infinite` under `motion-safe`. Compact badges do not bob.
- **Position:** Absolutely positioned at `-top-7 -right-7` (compact) / `-top-8 -right-8` (hero) inside the parent card — the badge overlaps the card edge to read as "stuck on."
- **Content:** Emoji (text-2xl on hero) + lowercase tier label (font-extrabold) + mono-numeric count + descriptor ("fresh sectors").

### Cards

- **Corner Style:** `squircle-2xl` + `rounded-xl` on the shadcn `Card`; `squircle-4xl` + `rounded-3xl` on the domain `GymCard`. Always squircle, always large radius — never default.
- **Background:** `bg-card` (off-white card cream) on the shadcn primitive. The domain `GymCard` overrides with `bg-(--surface-tint)` — a 70%-alpha tier-color tint that gives the card its mood.
- **Border:** The shadcn `Card` uses `ring-1 ring-foreground/10` (subtle). The `GymCard` and `GymNoDataCard` use `border-2 border-(--surface-stroke)` — a stronger sticker stroke.
- **Shadow Strategy:** Sticker Edge + Card Underglow combination (see Elevation). The shadcn primitive uses `shadow-xs` and the ring at rest — the domain cards always use the full stacked pattern.
- **Internal Padding:** `py-6 px-6` default (24px), `gap-6` between child slots. The `GymCard` uses `p-4 sm:p-5` and the no-data list item uses `p-4 sm:px-5` — different from the shadcn primitive because they're a different composition.
- **Card body image rule:** First-child `<img>` rounds the top corners, last-child `<img>` rounds the bottom. The padding adjusts (`pt-0`) when an image is the leading child.

### Inputs

- **Style:** `squircle-xl` + `rounded-lg` (`0.875rem`), `border` in `border-input` (off-white border cream), `bg-background`, `h-9` (36px). No lift mechanic on inputs — they are surfaces to write on, not press.
- **Focus:** `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` — a 3px tinted halo, no border color shift to the brand color. This is the one place a halo is permitted.
- **Error / Disabled:** `aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20`; `disabled:opacity-50 disabled:cursor-not-allowed`.
- **Mobile:** Base size is `text-base` (16px) to prevent iOS zoom; `md:text-sm` (14px) at desktop.
- **Date input override:** iOS Safari's native date chrome is stripped (`-webkit-appearance: none`) so the value can shrink to fit narrow viewports.

### Drawer (Vaul bottom sheet — signature)

- **Shape:** `rounded-t-[var(--radius-3xl)]` (`1.925rem`) on the top corners only. The full bottom-sheet shape.
- **Handle:** A pill at the top — `bg-muted mx-auto mt-4 h-2 w-[100px] rounded-full`. The grab affordance.
- **Background scale:** `shouldScaleBackground` is true by default — the underlying page scales down behind the open drawer (the native Vaul behavior). This is the one accepted "lift the rest of the world" interaction.
- **Used for:** Suggest-Reset flow, visit-history calendar, sign-in panel on mobile.

### Dialog

- **Overlay:** `bg-black/30 backdrop-blur-xs` — the only sanctioned glassmorphism in the system.
- **Content:** `bg-background rounded-xl border shadow-lg overflow-hidden`. Centered with `top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`.
- **Title:** `text-foreground font-semibold text-lg leading-none` — does NOT use `font-heading`. Dialog titles stay in Geist semibold; this is deliberate (dialogs feel functional, not narrative).
- **Description:** `text-muted-foreground text-sm`.

### Status Dot (table cell)

A 1.5px pip in three states: `fresh` (filled emerald), `stale` (1px outline ring in muted-foreground/50), `none` (smaller, muted-foreground/30 fill). Used in the reset table to mark sections fresh vs. climbed-since-reset.

### Brand Badge

A small pill marker: `border-2 border-foreground/80`, `bg-background`, `text-foreground`, `text-[10px] font-bold uppercase tracking-[0.2em]`. Used as a structural badge ("BETA", "BRATISLAVA"). Wider letter-spacing and heavier weight than the standard Micro Label.

## 6. Do's and Don'ts

### Do:

- **Do use the Sticker Edge + Underglow combination** (`box-shadow: 0 2px 0 0 var(--surface-stroke), 0 12px 32px -12px var(--surface-shadow)`) on any new card or elevated surface.
- **Do tilt and bob tier badges** when introducing a new tier or tier-adjacent badge. The rotation is part of the language — don't render them straight.
- **Do reach for `font-heading` (Baloo 2) only on proper nouns and verdicts**, not on UI labels or helper copy.
- **Do wire tier color via the `tier-bg / tier-fg / tier-ring` token triplet** from `src/lib/tier.ts`. Never hand-pick a new tier hue at the component level.
- **Do show uncertainty as the dashed border + flat surface** (the UNKNOWN tier treatment) — make the absence of confidence look like an intentional absence.
- **Do prefer the `squircle-*` utilities** over default `rounded-*` everywhere. Both must always be present together: `squircle-3xl rounded-2xl`, never one without the other (so non-supporting browsers still get the rounded fallback).
- **Do keep tier labels lowercase**, in `font-extrabold` (Geist 800), with the climber-native phrasing. No title case, no all caps.

### Don't:

- **Don't render a Generic SaaS dashboard.** No hero-metric cards, no gradient text, no `background-clip: text` accents, no faux-glass cards. Fresh Holds is not Mixpanel.
- **Don't render a Fitness-app aesthetic.** No neon gradients, no athletic stock imagery, no gamified XP bars, no streaks/levels. This is not Strava.
- **Don't render an Outdoorsy-brand template.** No kraft paper, no earth-tone moss/clay/rust palette, no rugged sans-serif + slab pairing. This is not Patagonia.
- **Don't render Corporate utility.** No Material/iOS-HIG default radii, no platform-default greys, no anonymous filled buttons.
- **Don't use `#000`, `#fff`, or flat untinted greys.** Every neutral is tinted toward the warm off-white hue.
- **Don't use side-stripe borders** (`border-left > 1px` as a colored accent). Use full borders, surface tints, or the tier system.
- **Don't use gradient text.** Solid colors only; emphasis comes from weight and size.
- **Don't use glassmorphism on cards.** The dialog overlay is the only `backdrop-blur` in the system.
- **Don't introduce a new semantic color outside the five tiers + destructive + success.** If a state matters, map it to an existing tier; if it doesn't fit, use muted neutrals with a label.
- **Don't make tier badges work as color-only signals.** Always pair color with the tier's emoji and lowercase label phrase.
- **Don't replace the Pressed-Sticker shadow with a generic drop-shadow.** No `shadow-md`, no `shadow-lg` on product surfaces (the only exception is `shadow-lg` on the modal dialog, which is page-floating chrome).
- **Don't capitalize verdict words** or restate them in title case. The lowercase is the voice.
- **Don't use em dashes** in UI copy. Commas, colons, periods, parentheses. Also not `--`.
