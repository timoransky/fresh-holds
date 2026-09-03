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
   branch isn't merged: run `git fetch origin main && git checkout main`.
   Run `npm install` if `node_modules` is absent.

1. **Fetch stories.** Run:
   `node scripts/instagram-stories/fetch-stories.mjs > /tmp/stories.json`
   If it exits non-zero, report the error and stop (usually a missing/expired
   Apify token or IG session — don't retry blindly).

2. **Read each story.** For every item in `/tmp/stories.json`, download its
   `mediaUrl` to the scratchpad and open it with the Read tool so you can see
   the image (captions on stories are often empty — the info is usually burned
   into the picture, frequently in Slovak). Combine what you see with `caption`.

3. **File, don't judge.** Your job is to surface candidates, not to decide
   what's worth an admin's time. Every submission lands as `pending` in
   `/admin`, where rejecting takes one click — but a story you skip is gone for
   good, because stories vanish in ~24h and nothing can backfill them. So:

   **Extract a record whenever a story shows any evidence of new climbing**,
   however weak, and let `confidence` carry your doubt.

   Only three reasons to skip, all structural — never "I'm not sure enough":
   - **Can't tell which gym.** `@blockdock` runs both `block-dock-raca` and
     `block-dock-petrzalka`; read the content for "Rača"/"Račianska" vs
     "Petržalka" in the visuals or text. If you can't tell, skip — a wrong gym
     is the one mistake the admin can't fix on approval.
   - **No plausible date** for when the setting happened.
   - **Plainly not about new boulders** — send brags, comps and leagues, events,
     shop/gear, coaching, opening hours, generic vibe clips with no claim of new
     routes.

   Fields per record:
   - `gym_slug` — from the story's `gymSlugCandidates`.
   - `section_name` — **optional.** Use a real sector name (the submit script
     validates it against that gym's sections) when the story names or clearly
     shows one. If it doesn't, **omit the field and drop one tier of
     confidence** — the admin picks the sector when approving. Never invent a
     wall name; a gym-level submission is fine and some gyms set across the
     whole place at once.
   - `reset_on` — the date the set happened. Use the story's own date/`takenAt`
     unless the text says otherwise (e.g. "reset yesterday"). Never future.
   - `boulders_reset` — a positive integer if stated, else null.
   - `notes` — one short, clean human line (e.g. "New set on the Cave"). No
     provenance tags, no confidence talk, no emoji dump — this is copied into
     `resets.notes` on approval and may end up in public UI copy.
   - `source_ref` — `ig:<handle>:<storyId>` so runs are traceable in the log.
   - `image_url` — the story's `mediaUrl`, so the frame is uploaded and the
     admin reviews the submission with the photo attached. This matters most on
     the low-confidence rows — the photo is what they judge from.
   - `confidence` — `"low"`, `"medium"` or `"high"`:
     - **high** — the gym's own post explicitly announces a set/reset, and the
       sector is named or unmistakable.
     - **medium** — clearly new climbing, but something is inferred: sector read
       off the visuals, date shifted by the text, count unclear.
     - **low** — plausible but ambiguous: a repost of someone else's clip, no
       sector named, a wildcard/"joker"-style rotation rather than a full reset,
       or reset-ness inferred from a photo of fresh unbrushed holds.

   Worked example (a real miss this rule exists to prevent): Spot reposted a
   customer clip captioned *"6 nových žolíkov v Spote"* — 6 new "joker"
   problems. It's a repost, it names no sector, and it reads as a rotating
   wildcard feature rather than a reset announcement. **File it anyway:**
   `{"gym_slug": "spot", "reset_on": "<story date>", "boulders_reset": 6,
   "notes": "6 new joker problems", "confidence": "low"}` — no `section_name`.
   Six new problems is new climbing; the admin decides the rest.

4. **Submit.** Write the records as a JSON array to `/tmp/resets.json`, then:
   - Dry-run first: `node scripts/instagram-stories/submit-resets.mjs --file /tmp/resets.json`
   - Review the dry-run output. If it looks right, commit:
     `node scripts/instagram-stories/submit-resets.mjs --file /tmp/resets.json --commit`
   The script dedupes against existing resets and submissions for the same
   gym/date, so re-running the same day is safe. Don't pass
   `--min-confidence` — the whole point is that low-confidence reads reach the
   admin.

5. **Report back** a short summary: how many stories seen; how many became
   submissions, broken down high/medium/low; how many were skipped and which of
   the three structural reasons applied. Call out anything you filed at `low`
   so a human knows to look at the photo. Do NOT approve anything — approval is
   the admin's job in /admin.

Constraints:
- Don't touch the `resets` table directly. Everything goes through
  `reset_submissions` (pending) for human approval.
- Confidence is data on the row, not a gate — see
  `docs/adr/0006-confidence-on-the-submission.md`. If you catch yourself
  skipping because you're unsure, file it as `low` instead.
- Do not commit anything to git or open PRs — this is a data task, not a code
  change.
