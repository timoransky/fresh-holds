# Instagram-stories → reset submissions (pilot)

A daily job reads the active gyms' Instagram **stories**, and for any that
announce a reset, files a `reset_submissions` row (status `pending`) with the
story frame attached. An admin then approves or rejects it in `/admin`, exactly
like a human "suggest a reset". Nothing reaches the trusted `resets` table
without a human in the loop.

This is a **pilot** run from a scheduled Claude Code Routine — the reading and
extraction are done by the agent, so there's no `ANTHROPIC_API_KEY` and no app
change. If it proves reliable, it can graduate to an in-app cron (see the last
section).

## Why it's shaped this way

- **Submissions, not resets.** The freshness signal is only as good as the
  `resets` table, and scraping is noisy. Routing through `reset_submissions`
  reuses the existing moderation UI and keeps the trusted table clean
  (`supabase/migrations/0005_reset_submissions.sql`).
- **Least-privilege bot user, not service-role.** The job signs in as a
  dedicated Supabase auth user and writes through normal RLS as an ordinary
  `authenticated` user. It can only insert its own **pending** submissions
  (capped at 5 pending) and upload a photo to its own folder — it cannot
  approve, update, delete, write `resets`, or read other users' data. No
  service-role key is used anywhere, so a leaked secret can at worst file
  pending suggestions an admin will reject. Migration `0010` closes an
  `is_admin` self-escalation hole so the bot user can't be promoted to admin.
- **The DB is the source of truth.** Gym handles and sections are read from
  Supabase at runtime — no hardcoded gym config to keep in sync. Add a gym's
  `instagram_handle` and it's scraped next run; no code change.
- **Stories are hard mode.** They vanish in 24h and are normally login-walled.
  The chosen actor (`igview-owner/instagram-story-viewer`) reads public
  accounts' stories without *you* supplying an Instagram login, which removes
  the burner-account hassle — but it's still ToS-gray and can break. See risks.

## Coverage

Handles come from the `gyms` table (active rows with a non-null
`instagram_handle`). Today:

| Gym | Handle | Scraped? |
|---|---|---|
| Spot | `@spot_climbing_gym` | ✅ |
| Block Dock – Rača | `@blockdock` | ✅ (shared handle) |
| Block Dock – Petržalka | `@blockdock` | ✅ (shared handle) |
| K2 | — | ❌ no handle |
| Vertigo | — | ❌ no handle |

Block Dock runs both locations from one handle, so a `@blockdock` story can't be
attributed to a location by handle alone — the extractor reads the content to
pick Rača vs Petržalka and **skips** when it can't tell. To cover K2/Vertigo,
just set their `instagram_handle` in the `gyms` table.

## Pipeline

```
fetch-stories.mjs ──> stories.json ──> agent reads each image + caption
   (handles from DB,                     │
    Apify actor)                         ├─ reset? gym? section? date? count? confidence
                                         ▼
                              submit-resets.mjs (bot login, dedup, photo, dry-run first)
                                         ▼
                              reset_submissions (pending) ──> /admin approve ──> resets
```

- `fetch-stories.mjs` — reads active gym handles from the DB, calls the Apify
  actor, emits normalized story items (handle, candidate gym slugs, `takenAt`,
  caption, media URL). Interprets nothing. `--handles a,b` overrides the DB for
  ad-hoc testing (Apify-only, no DB needed).
- `submit-resets.mjs` — validates, resolves `section_id` from the DB, **dedupes**
  against existing resets + pending/approved submissions for the same
  `(section, date)`, uploads the story frame to the `reset-photos` bucket, and
  inserts `pending` rows. Dry-run by default; `--commit` to write.
- `routine-prompt.md` — the message the scheduled Routine fires.

## Setup (one-time)

1. **Apify** — create an account and copy an **API token** (Settings →
   Integrations → API tokens). The pilot defaults to the
   `igview-owner/instagram-story-viewer` actor, which needs no Instagram login.
2. **Run migration `0010`** (`supabase db push`, or paste it in the SQL editor).
   It closes the `is_admin` self-escalation hole the bot design relies on.
3. **Create the bot user** — Supabase dashboard → Authentication → Add user.
   Give it an email (e.g. `ig-bot@yourdomain`) and a password, and tick **Auto
   Confirm User**. Make sure the Email provider's password sign-in is enabled
   (Authentication → Providers → Email). Do **not** make it an admin. That's it —
   under existing RLS it can only file its own pending submissions.
4. **Environment variables** — set these in the Claude Code environment config
   (NOT committed — `.env*` is gitignored). The bot password is the only
   sensitive new value, and its blast radius is "can file pending suggestions":

   | Var | Required? | Purpose |
   |---|---|---|
   | `APIFY_TOKEN` | ✅ | Apify API token |
   | `SUPABASE_BOT_EMAIL` | ✅ | the bot user's email |
   | `SUPABASE_BOT_PASSWORD` | ✅ | the bot user's password |
   | `SUPABASE_URL` | only if `NEXT_PUBLIC_SUPABASE_URL` isn't set | project URL |
   | `SUPABASE_ANON_KEY` | only if `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` isn't set | public anon key |
   | `APIFY_ACTOR_ID` | optional | defaults to `igview-owner~instagram-story-viewer` |
   | `APIFY_INPUT_JSON` | optional | extra actor input, if you swap actors |

   No service-role key — by design.

5. **Confirm reachability** — from a session in this environment,
   `curl -sS -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/"` should not
   return a proxy `502`/`403`. Apify, Instagram, and its CDN are already
   reachable here; if the Supabase host is blocked, an admin adds it to the
   environment's allowed domains
   (https://code.claude.com/docs/en/claude-code-on-the-web).

## Running it manually (to test before scheduling)

```bash
# Full run reads handles from the DB (needs Supabase creds):
node scripts/instagram-stories/fetch-stories.mjs > /tmp/stories.json
# Or fetch one handle without the DB (Apify only):
node scripts/instagram-stories/fetch-stories.mjs --handles spot_climbing_gym > /tmp/stories.json

# inspect /tmp/stories.json, then hand the media to the agent for extraction
node scripts/instagram-stories/submit-resets.mjs --file /tmp/resets.json          # dry-run
node scripts/instagram-stories/submit-resets.mjs --file /tmp/resets.json --commit # write
```

## Scheduling

The pilot runs as a **Claude Code Routine** set to **start a fresh session on
each firing** (not a session-only cron — those die when the session ends). Each
day the Routine spins up a new session in this environment, which already has
the two secrets set, runs `routine-prompt.md`, files any submissions, and exits.
Nothing needs to stay running between firings, and no app/Claude-API cost is
involved.

Two prerequisites before the trigger is created:

1. **Setup done** — migration `0010` applied, the bot user created, and the env
   vars set (`APIFY_TOKEN`, `SUPABASE_BOT_EMAIL`, `SUPABASE_BOT_PASSWORD`, plus a
   Supabase URL + public key).
2. **The pilot code is on the default branch** so a fresh session's clone has
   it. (The prompt's step 0 falls back to checking out the feature branch if the
   scripts are ever missing.)

Because stories only live ~24h, a missed day means missed stories — pick days
that match when the gyms actually post. A missed run can't backfill.

## Known risks & limits

- **ToS / reliability.** Automated story access is against Instagram's terms.
  The chosen actor uses its own account pool so *you* don't supply a login, but
  that also makes runs occasionally flaky/empty and the actor may break when
  Instagram changes. If it degrades, swap actors (set `APIFY_ACTOR_ID` /
  `APIFY_INPUT_JSON`) or fall back to scraping public posts/reels.
- **Ephemerality.** Stories vanish in 24h — this can't backfill.
- **Ambiguity.** Vague stories ("nové bouldre!") with no visible sector are
  skipped, because a submission needs a `section_id`. Most days a gym's stories
  are reposts/vibe content and the job files nothing — that's expected.
- **Actor drift.** `fetch-stories.mjs` normalizes several common field names and
  keeps the `raw` item so nothing is silently lost when a field is renamed.

## Graduating to an in-app cron (later)

Once the extraction prompt is proven, move it into the app: a Vercel Cron (or
Supabase `pg_cron` + Edge Function) hits an API route daily that calls Apify,
calls the Claude API to extract, and inserts submissions — same tables, same
approval flow, no Claude Code session required. That path adds a metered
`ANTHROPIC_API_KEY` cost, which is why the pilot stays in a Routine first. When
it does move in-app, add a `source_ref` column to `reset_submissions` for
durable dedup instead of the `(section, date)` heuristic used here.
