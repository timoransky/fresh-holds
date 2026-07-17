# Routine prompt — Instagram-stories → reset submissions

This is the message the daily scheduled Routine fires. It's written as a
standalone instruction because each firing may start a fresh session. Keep it
in sync with the scripts in this folder.

---

You are running the Fresh Holds Instagram-stories reset pilot. Work only in the
`fresh-holds` repo. Do this end to end, then stop:

0. **Check your tools.** This runs in a fresh session. Secrets in the
   environment: `APIFY_TOKEN`, and the bot login `SUPABASE_BOT_EMAIL` +
   `SUPABASE_BOT_PASSWORD` (the project URL and public key come from the app's
   `NEXT_PUBLIC_SUPABASE_*` vars). The scripts read gym handles/sections from
   the DB and write as the least-privilege bot user — no service-role key.
   Make sure the pilot scripts exist (`scripts/instagram-stories/`); if not, the
   branch isn't merged: run `git fetch origin main && git checkout main` (or
   check out `claude/apify-instagram-gym-scraper-h5ju2w`). Run `npm install` if
   `node_modules` is absent.

1. **Fetch stories.** Run:
   `node scripts/instagram-stories/fetch-stories.mjs > /tmp/stories.json`
   If it exits non-zero, report the error and stop (usually a missing/expired
   Apify token or IG session — don't retry blindly).

2. **Read each story.** For every item in `/tmp/stories.json`, download its
   `mediaUrl` to the scratchpad and open it with the Read tool so you can see
   the image (captions on stories are often empty — the info is usually burned
   into the picture, frequently in Slovak). Combine what you see with `caption`.

3. **Decide, per story, whether it announces a reset** (new boulders set on a
   section). Extract a structured record only when you're reasonably sure:
   - `gym_slug` — from the story's `gymSlugCandidates`. If a handle maps to more
     than one gym (Block Dock runs both `block-dock-raca` and
     `block-dock-petrzalka` from `@blockdock`), read the content to pick the
     location — look for "Rača"/"Račianska" vs "Petržalka" in the visuals or
     text. **If you can't tell which location, skip it** — a wrong location is
     worse than a missed reset.
   - `section_name` — must match one of that gym's section names. The submit
     script validates this against the DB, so use the real sector name; if the
     story doesn't name/show a specific sector, skip it (submissions require a
     section).
   - `reset_on` — the date the set happened. Use the story's own date/`takenAt`
     unless the text says otherwise (e.g. "reset yesterday"). Never future.
   - `boulders_reset` — a positive integer if stated, else null.
   - `notes` — one short, clean human line (e.g. "New set on the Cave"). No
     provenance tags, no emoji dump — this may end up in public UI copy.
   - `source_ref` — `ig:<handle>:<storyId>` so runs are traceable in the log.
   - `image_url` — the story's `mediaUrl`, so the frame is uploaded and the
     admin reviews the submission with the photo attached.
   - `confidence` — 0..1. Be honest; borderline reads should score low.

4. **Submit.** Write the records as a JSON array to `/tmp/resets.json`, then:
   - Dry-run first: `node scripts/instagram-stories/submit-resets.mjs --file /tmp/resets.json`
   - Review the dry-run output. If it looks right, commit:
     `node scripts/instagram-stories/submit-resets.mjs --file /tmp/resets.json --commit`
   The script dedupes against existing resets/submissions, so re-running the
   same day is safe.

5. **Report back** a short summary: how many stories seen, how many became
   submissions, how many skipped and why. Mention anything ambiguous you
   skipped so a human can eyeball it. Do NOT approve anything — approval is the
   admin's job in /admin.

Constraints:
- Don't touch the `resets` table directly. Everything goes through
  `reset_submissions` (pending) for human approval.
- If confidence is low or the location is ambiguous, skip and say so.
- Do not commit anything to git or open PRs — this is a data task, not a code
  change.
