# Instagram-stories → reset submissions (pilot)

A daily job reads the active gyms' Instagram **stories**, and for any that
announce a reset, files a `reset_submissions` row (status `pending`). An admin
then approves or rejects it in `/admin`, exactly like a human "suggest a reset".
Nothing reaches the trusted `resets` table without a human in the loop.

This is a **pilot** run from a scheduled Claude Code Routine — the reading and
extraction are done by the agent, so there's no `ANTHROPIC_API_KEY` and no app
change. If it proves reliable, it can graduate to an in-app cron (see the last
section).

## Why it's shaped this way

- **Submissions, not resets.** The freshness signal is only as good as the
  `resets` table, and scraping is noisy. Routing through `reset_submissions`
  reuses the existing moderation UI and keeps the trusted table clean
  (`supabase/migrations/0005_reset_submissions.sql`).
- **Service-role writes.** RLS caps *users* at 5 pending submissions; a bot
  would hit that instantly. Writing with the service-role key bypasses RLS, so
  no cap and no fake auth user is needed — we just attribute rows to an existing
  admin `profiles.id` (the `submitted_by` FK is non-null).
- **Stories are hard mode.** They're not publicly readable and vanish in 24h.
  See the risk note below. Posts/reels would be more reliable, but this pilot
  does stories per the request.

## Coverage (from `supabase/seed.sql`)

| Gym | Handle | Scraped? |
|---|---|---|
| Spot | `@spotbouldering` | ✅ |
| Block Dock – Rača | `@blockdock` | ✅ (shared handle) |
| Block Dock – Petržalka | `@blockdock` | ✅ (shared handle) |
| K2 | — | ❌ no handle |
| Vertigo | — | ❌ no handle |

Block Dock runs both locations from one handle, so a story from `@blockdock`
can't be attributed to a location by handle alone — the extractor reads the
content and uses `locationHints` in `config.mjs`, and **skips** when it can't
tell. To cover K2/Vertigo, add their `instagram_handle` in the seed and DB, then
add them to `config.mjs`.

## Pipeline

```
fetch-stories.mjs ──> stories.json ──> agent reads each image + caption
   (Apify actor)                          │
                                          ├─ reset? gym? section? date? count? confidence
                                          ▼
                              submit-resets.mjs (service role, dedup, dry-run first)
                                          ▼
                              reset_submissions (pending) ──> /admin approve ──> resets
```

- `config.mjs` — gym → handle → sections mapping. Section names must match the
  seed exactly; the submit script resolves them by name.
- `fetch-stories.mjs` — calls the Apify actor, emits normalized story items
  (handle, candidate gym slugs, `takenAt`, caption, media URL). Interprets
  nothing.
- `submit-resets.mjs` — validates, resolves `section_id`, **dedupes** against
  existing resets + pending/approved submissions for the same `(section, date)`,
  and inserts `pending` rows. Dry-run by default; `--commit` to write.
- `routine-prompt.md` — the message the scheduled Routine fires.

## Setup (one-time)

1. **Apify** — create an account, copy the **API token** (Settings →
   Integrations), and choose a story-capable Instagram actor. Note its actor id
   (form `user~actor-name`) and what its input needs for authentication.
2. **Burner Instagram account** — stories require a logged-in session. Use a
   **dedicated** account (never a personal one — it can get flagged), have it
   follow Spot and Block Dock, and get whatever the actor needs (login fields or
   session cookies).
3. **Supabase** — from Project Settings → API, grab the project URL and the
   **service_role** key. Find your admin `profiles.id`
   (`select id from profiles where is_admin;`).
4. **Environment variables** — set these as secrets in the Claude Code
   environment config (NOT committed — `.env*` is gitignored, and the
   service-role key must never ship in the app):

   | Var | Purpose |
   |---|---|
   | `APIFY_TOKEN` | Apify API token |
   | `APIFY_ACTOR_ID` | e.g. `apify~instagram-scraper` |
   | `APIFY_INPUT_JSON` | actor-specific input incl. the IG login/session fields |
   | `SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | service-role key (secret) |
   | `SUBMITTER_PROFILE_ID` | your admin `profiles.id` |

5. **Confirm reachability** — from a session in this environment,
   `curl -sS -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/"` should not
   return a proxy `502`/`403`. Apify, Instagram, and its CDN are already
   reachable here; if the Supabase host is blocked, an admin adds it to the
   environment's allowed domains
   (https://code.claude.com/docs/en/claude-code-on-the-web).

## Running it manually (to test before scheduling)

```bash
node scripts/instagram-stories/fetch-stories.mjs > /tmp/stories.json
# inspect /tmp/stories.json, then hand the media to the agent for extraction
node scripts/instagram-stories/submit-resets.mjs --file /tmp/resets.json          # dry-run
node scripts/instagram-stories/submit-resets.mjs --file /tmp/resets.json --commit # write
```

## Scheduling

A Claude Code Routine fires `routine-prompt.md` on your chosen days (a cron
expression — e.g. weekdays only, or daily). Because stories only live ~24h, a
missed day means missed stories; pick days that match when the gyms actually
post. The trigger is created once the secrets are in and a manual run looks
good.

## Known risks & limits

- **ToS / bans.** Automated story access violates Instagram's terms; the burner
  account can be rate-limited or banned. If it keeps dying, switch to scraping
  public posts/reels (no login) instead.
- **Ephemerality.** Stories vanish in 24h — this can't backfill.
- **Ambiguity.** Vague stories ("nové bouldre!") with no visible sector are
  skipped, because a submission needs a `section_id`.
- **Actor drift.** Instagram changes break scrapers; expect occasional actor
  swaps. `fetch-stories.mjs` normalizes several common field names and keeps the
  `raw` item so nothing is silently lost.

## Graduating to an in-app cron (later)

Once the extraction prompt is proven, move it into the app: a Vercel Cron (or
Supabase `pg_cron` + Edge Function) hits an API route daily that calls Apify,
calls the Claude API to extract, and inserts submissions — same tables, same
approval flow, no Claude Code session required. That path adds a metered
`ANTHROPIC_API_KEY` cost, which is why the pilot stays in a Routine first. When
it does move in-app, add a `source_ref` column to `reset_submissions` for
durable dedup instead of the `(section, date)` heuristic used here.
