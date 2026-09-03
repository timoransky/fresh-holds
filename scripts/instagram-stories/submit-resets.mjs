#!/usr/bin/env node
// Insert reset *submissions* (status='pending') from extracted story data.
// Rows land in the same moderation queue as human suggestions and only reach
// the trusted `resets` table when an admin approves them in /admin.
//
// Confidence is DATA, not a gate (ADR-0006). Every plausible read is filed with
// a low/medium/high stamp and the admin decides — a false positive costs one
// click to reject, a false negative is gone forever (stories vanish in ~24h).
// Pass --min-confidence only for a deliberate manual run.
//
// A submission may also arrive WITHOUT a sector: when a story says "6 new
// boulders" but names no wall, we file it against the gym and the admin picks
// the sector on approval. Better a sectionless row than a missed reset.
//
// Signs in as a DEDICATED, LEAST-PRIVILEGE bot user (email + password) and
// writes through normal RLS as an ordinary `authenticated` user. That user can
// only insert its own pending submissions (capped at 20 pending) and upload a
// photo to its own folder — it cannot approve, update, delete, write `resets`,
// or read other users' data. No service-role key is used, so a leaked secret
// can at worst file pending suggestions an admin will reject.
//
// Dry-run by default: it prints what it WOULD do. Pass --commit to insert.
//
// Required env:
//   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL              project URL.
//   SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   public anon key.
//   SUPABASE_BOT_EMAIL, SUPABASE_BOT_PASSWORD             the bot user's login.
//
// The submitter is the bot user itself (submitted_by = its own uid).
//
// Input: a JSON array on stdin, or --file <path>. Each item:
//   {
//     "gym_slug":       "spot",            // must exist in the DB
//     "section_name":   "Cave",            // OPTIONAL; omit if the story
//                                          // doesn't name/show a sector
//     "reset_on":       "2026-07-17",      // YYYY-MM-DD, not in the future
//     "boulders_reset": 12,                // optional, positive int or null
//     "notes":          "New set on Cave", // optional, shown in /admin + UI
//     "source_ref":     "ig:spot_climbing_gym:<storyId>", // optional, for logs
//     "confidence":     "low",             // low | medium | high (see the
//                                          // rubric in routine-prompt.md)
//     "image_url":      "https://.../story.jpg" // optional; uploaded to the
//                                          // reset-photos bucket so the admin
//                                          // sees it in /admin, like a user photo
//   }
//
// Usage:
//   node scripts/instagram-stories/submit-resets.mjs --file resets.json
//   cat resets.json | node scripts/instagram-stories/submit-resets.mjs --commit

import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const botEmail = process.env.SUPABASE_BOT_EMAIL;
const botPassword = process.env.SUPABASE_BOT_PASSWORD;

if (!url || !anonKey || !botEmail || !botPassword) {
  console.error(
    "Missing one of: a Supabase URL (SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL), " +
      "a public key (SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), " +
      "SUPABASE_BOT_EMAIL, SUPABASE_BOT_PASSWORD.\n" +
      "See docs/instagram-stories-pilot.md → Setup.",
  );
  process.exit(1);
}

const commit = process.argv.includes("--commit");
const PHOTO_BUCKET = "reset-photos";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CONFIDENCE_RANK = { low: 1, medium: 2, high: 3 };
const todayISO = new Date().toISOString().slice(0, 10);

// Opt-in only. Unset = no floor, which is the point: the agent no longer
// decides what's worth a human's glance.
const minConfidenceArg = getArg("--min-confidence")?.toLowerCase() ?? null;
if (minConfidenceArg && !(minConfidenceArg in CONFIDENCE_RANK)) {
  console.error(`--min-confidence must be one of low, medium, high (got "${minConfidenceArg}").`);
  process.exit(1);
}
const minRank = minConfidenceArg ? CONFIDENCE_RANK[minConfidenceArg] : 0;

const raw = getArg("--file") ? readFileSync(getArg("--file"), "utf8") : readFileSync(0, "utf8");
let items;
try {
  items = JSON.parse(raw);
} catch (e) {
  console.error(`Input is not valid JSON: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(items)) {
  console.error("Input must be a JSON array of extracted resets.");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

// Sign in as the bot. All subsequent queries run as this authenticated user,
// bound by RLS — so `submitted_by` is its own uid and it can do nothing else.
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
  email: botEmail,
  password: botPassword,
});
if (authErr || !auth?.user) {
  console.error(`Bot sign-in failed: ${authErr?.message ?? "no user returned"}`);
  process.exit(1);
}
const submitter = auth.user.id;

const summary = {
  inserted: 0,
  wouldInsert: 0,
  skippedBelowFloor: 0,
  skippedDuplicate: 0,
  invalid: 0,
  unfiled: 0,
  byConfidence: { low: 0, medium: 0, high: 0 },
};

for (const [i, item] of items.entries()) {
  const label = `[${i}] ${item?.gym_slug ?? "?"}/${item?.section_name ?? "—"} @ ${item?.reset_on ?? "?"}`;

  // --- validate ---
  if (!item?.gym_slug || !ISO_DATE_RE.test(item?.reset_on ?? "")) {
    console.log(`SKIP  ${label} — invalid (need gym_slug and reset_on=YYYY-MM-DD)`);
    summary.invalid++;
    continue;
  }
  if (item.reset_on > todayISO) {
    console.log(`SKIP  ${label} — reset_on is in the future`);
    summary.invalid++;
    continue;
  }
  let boulders = null;
  if (item.boulders_reset != null && item.boulders_reset !== "") {
    boulders = Number(item.boulders_reset);
    if (!Number.isInteger(boulders) || boulders <= 0) {
      console.log(`SKIP  ${label} — boulders_reset must be a positive whole number`);
      summary.invalid++;
      continue;
    }
  }

  const conf = normalizeConfidence(item.confidence);
  if (conf.note) console.log(`WARN  ${label} — ${conf.note}, treating as "${conf.value}"`);
  let confidence = conf.value;

  // --- resolve the gym and its sections in one go (the section list is also
  //     what the gym-wide reset dedupe needs) ---
  const { data: gym, error: gymErr } = await supabase
    .from("gyms")
    .select("id, sections(id, name)")
    .eq("slug", item.gym_slug)
    .maybeSingle();

  if (gymErr) {
    console.log(`ERR   ${label} — gym lookup failed: ${gymErr.message}`);
    summary.invalid++;
    continue;
  }
  if (!gym) {
    console.log(`SKIP  ${label} — no gym with slug "${item.gym_slug}"`);
    summary.invalid++;
    continue;
  }

  const gymSections = gym.sections ?? [];
  const wantedSection =
    typeof item.section_name === "string" && item.section_name.trim() ? item.section_name.trim() : null;

  let sectionId = null;
  if (wantedSection) {
    sectionId = gymSections.find((s) => s.name === wantedSection)?.id ?? null;
    if (!sectionId) {
      // A wall name that doesn't exist is itself a low-confidence signal. File
      // it against the gym instead of dropping a real reset on a bad label.
      console.log(
        `WARN  ${label} — no section "${wantedSection}" for "${item.gym_slug}"; ` +
          "filing without a sector at low confidence",
      );
      confidence = "low";
    }
  }

  if (minRank && CONFIDENCE_RANK[confidence] < minRank) {
    console.log(`SKIP  ${label} — confidence ${confidence} below --min-confidence ${minConfidenceArg}`);
    summary.skippedBelowFloor++;
    continue;
  }

  // --- dedupe, so daily re-runs don't pile up ---
  const duplicate = await findDuplicate({
    gymId: gym.id,
    sectionId,
    sectionIds: gymSections.map((s) => s.id),
    resetOn: item.reset_on,
  });
  if (duplicate === "error") {
    summary.invalid++;
    continue;
  }
  if (duplicate) {
    console.log(`SKIP  ${label} — already exists (${duplicate})`);
    summary.skippedDuplicate++;
    continue;
  }

  const notes = typeof item.notes === "string" && item.notes.trim() ? item.notes.trim() : null;

  const hasPhoto = typeof item.image_url === "string" && item.image_url.startsWith("http");

  if (!commit) {
    console.log(
      `DRY   ${label} — would insert (confidence=${confidence}, sector=${sectionId ? wantedSection : "—"}, ` +
        `boulders=${boulders ?? "—"}, notes=${JSON.stringify(notes)}, ` +
        `photo=${hasPhoto ? "yes" : "no"}, src=${item.source_ref ?? "—"})`,
    );
    summary.wouldInsert++;
    summary.byConfidence[confidence]++;
    continue;
  }

  // Upload the story frame so the admin reviews it with the image attached,
  // exactly like a user's "suggest a reset" photo. Non-fatal on failure — a
  // submission without a photo is still useful. It matters more now: with no
  // sector on some rows, the photo is what the admin judges from.
  let photoPath = null;
  if (hasPhoto) {
    photoPath = await uploadPhoto(item.image_url);
    if (!photoPath) console.log(`WARN  ${label} — photo upload failed, submitting without it`);
  }

  const { error: insErr } = await supabase.from("reset_submissions").insert({
    gym_id: gym.id,
    section_id: sectionId,
    reset_on: item.reset_on,
    notes,
    boulders_reset: boulders,
    submitted_by: submitter,
    status: "pending",
    confidence,
    photo_path: photoPath,
  });

  if (insErr) {
    if (insErr.code === "42501") {
      summary.unfiled = items.length - i;
      console.log(
        `ERR   ${label} — RLS rejected the insert. Most likely the pending queue ` +
          `is full (20) — clear it in /admin. ${summary.unfiled} record(s) unfiled. Stopping.`,
      );
      break;
    }
    console.log(`ERR   ${label} — insert failed: ${insErr.message}`);
    summary.invalid++;
    continue;
  }
  console.log(
    `OK    ${label} — submitted (confidence=${confidence}, sector=${sectionId ? wantedSection : "—"}, ` +
      `photo=${photoPath ? "yes" : "no"}, src=${item.source_ref ?? "—"})`,
  );
  summary.inserted++;
  summary.byConfidence[confidence]++;
}

const filed = commit ? summary.inserted : summary.wouldInsert;
console.log(
  `\n${commit ? "COMMIT" : "DRY-RUN"} summary: ` +
    `${filed} ${commit ? "inserted" : "would insert"} ` +
    `(${summary.byConfidence.high} high, ${summary.byConfidence.medium} medium, ${summary.byConfidence.low} low), ` +
    `${summary.skippedDuplicate} duplicate, ${summary.invalid} invalid` +
    (summary.skippedBelowFloor ? `, ${summary.skippedBelowFloor} below --min-confidence` : "") +
    (summary.unfiled ? `, ${summary.unfiled} unfiled (queue full)` : "") +
    ".",
);
if (!commit) console.log("Re-run with --commit to actually submit.");

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}

// low | medium | high. Never throws away a record: anything unreadable becomes
// "low" with a warning, and a legacy 0..1 number is bucketed.
function normalizeConfidence(value) {
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v in CONFIDENCE_RANK) return { value: v };
    const n = Number(v);
    if (v !== "" && Number.isFinite(n)) {
      return { value: bucketNumeric(n), note: `numeric confidence ${v}` };
    }
    return { value: "low", note: `unrecognized confidence ${JSON.stringify(value)}` };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { value: bucketNumeric(value), note: `numeric confidence ${value}` };
  }
  if (value == null) return { value: "low", note: "no confidence given" };
  return { value: "low", note: `unrecognized confidence ${JSON.stringify(value)}` };
}

function bucketNumeric(n) {
  if (n >= 0.8) return "high";
  if (n >= 0.5) return "medium";
  return "low";
}

// Returns a human reason string when this (gym, date) is already covered,
// null when it's new, or "error" when a lookup failed.
//
// A sectionless record claims the whole day for the gym, so ANY submission or
// reset for that gym/date absorbs it. A sector-level record only collides with
// its own sector — two walls can be set on the same day — plus a sectionless
// submission already sitting in the queue for that date.
async function findDuplicate({ gymId, sectionId, sectionIds, resetOn }) {
  const submissions = supabase
    .from("reset_submissions")
    .select("id", { count: "exact", head: true })
    .eq("gym_id", gymId)
    .eq("reset_on", resetOn);

  // Match resets by an explicit section-id list rather than a filter on an
  // embedded `sections` resource: if that filter ever failed to apply, the
  // count would cover EVERY gym's resets for that date and silently swallow
  // real ones — the failure mode this whole change exists to avoid.
  // A gym with no sections can't have resets, and `in.()` on an empty list is
  // not a query PostgREST likes.
  const targetSections = sectionId ? [sectionId] : sectionIds;
  const resets = targetSections.length
    ? supabase
        .from("resets")
        .select("id", { count: "exact", head: true })
        .in("section_id", targetSections)
        .eq("reset_on", resetOn)
    : Promise.resolve({ count: 0, error: null });

  // Any status, including 'rejected': re-filing a date a human already turned
  // down is noise, and low-confidence rows get rejected routinely.
  const [subRes, resetRes] = await Promise.all([
    sectionId ? submissions.is("section_id", null) : submissions,
    resets,
  ]);

  if (subRes.error || resetRes.error) {
    console.log(`ERR   dedupe lookup failed: ${(subRes.error ?? resetRes.error).message}`);
    return "error";
  }

  if ((resetRes.count ?? 0) > 0) {
    return sectionId
      ? "a reset is already logged for that sector/date"
      : "a reset is already logged for that gym/date";
  }
  if ((subRes.count ?? 0) > 0) {
    return sectionId
      ? "a sectorless submission for that gym/date is already in the queue"
      : "a submission for that gym/date already exists";
  }

  if (!sectionId) return null;

  // Sector-level also needs its own (section, date) submission check, which the
  // gym-wide query above deliberately narrowed away.
  const { count, error } = await supabase
    .from("reset_submissions")
    .select("id", { count: "exact", head: true })
    .eq("section_id", sectionId)
    .eq("reset_on", resetOn);

  if (error) {
    console.log(`ERR   dedupe lookup failed: ${error.message}`);
    return "error";
  }
  return (count ?? 0) > 0 ? "a submission for that sector/date already exists" : null;
}

// Download the story frame and put it in the private reset-photos bucket under
// submissions/<submitter>/... (same folder convention as the app's user
// uploads). Returns the object path, or null on any failure.
async function uploadPhoto(imageUrl) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const bytes = new Uint8Array(await res.arrayBuffer());
    const path = `submissions/${submitter}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, bytes, { contentType, upsert: false });
    return error ? null : path;
  } catch {
    return null;
  }
}
