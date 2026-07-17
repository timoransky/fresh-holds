#!/usr/bin/env node
// Insert reset *submissions* (status='pending') from extracted story data.
// Rows land in the same moderation queue as human suggestions and only reach
// the trusted `resets` table when an admin approves them in /admin.
//
// Writes with the Supabase service-role key, which bypasses RLS (so the
// per-user 5-pending cap doesn't apply) — that's why this must NEVER run in
// the browser or ship in the app bundle. It's an operational script only.
//
// Dry-run by default: it prints what it WOULD do. Pass --commit to insert.
//
// Required env:
//   SUPABASE_URL                 e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    Project Settings → API → service_role
//   SUBMITTER_PROFILE_ID         profiles.id to attribute rows to (your admin
//                                profile id for the pilot). Satisfies the
//                                submitted_by FK.
//
// Input: a JSON array on stdin, or --file <path>. Each item:
//   {
//     "gym_slug":       "spot",            // must exist in the DB
//     "section_name":   "Cave",            // must match a section of that gym
//     "reset_on":       "2026-07-17",      // YYYY-MM-DD, not in the future
//     "boulders_reset": 12,                // optional, positive int or null
//     "notes":          "New set on Cave", // optional, shown in /admin + UI
//     "source_ref":     "ig:spot_climbing_gym:<storyId>", // optional, for logs
//     "confidence":     0.9,               // optional 0..1, gated by --min-confidence
//     "image_url":      "https://.../story.jpg" // optional; uploaded to the
//                                          // reset-photos bucket so the admin
//                                          // sees it in /admin, like a user photo
//   }
//
// Usage:
//   node scripts/instagram-stories/submit-resets.mjs --file resets.json
//   cat resets.json | node scripts/instagram-stories/submit-resets.mjs --commit

import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const submitter = process.env.SUBMITTER_PROFILE_ID;

if (!url || !serviceKey || !submitter) {
  console.error(
    "Missing one of SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUBMITTER_PROFILE_ID.\n" +
      "See docs/instagram-stories-pilot.md → Setup.",
  );
  process.exit(1);
}

const commit = process.argv.includes("--commit");
const minConfidence = Number(getArg("--min-confidence") ?? 0.6);
const PHOTO_BUCKET = "reset-photos";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayISO = new Date().toISOString().slice(0, 10);

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
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const summary = { inserted: 0, wouldInsert: 0, skippedLowConf: 0, skippedDuplicate: 0, invalid: 0 };

for (const [i, item] of items.entries()) {
  const label = `[${i}] ${item?.gym_slug ?? "?"}/${item?.section_name ?? "?"} @ ${item?.reset_on ?? "?"}`;

  // --- validate ---
  if (!item?.gym_slug || !item?.section_name || !ISO_DATE_RE.test(item?.reset_on ?? "")) {
    console.log(`SKIP  ${label} — invalid (need gym_slug, section_name, reset_on=YYYY-MM-DD)`);
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
  if (typeof item.confidence === "number" && item.confidence < minConfidence) {
    console.log(`SKIP  ${label} — confidence ${item.confidence} < ${minConfidence}`);
    summary.skippedLowConf++;
    continue;
  }

  // --- resolve section_id by (gym_slug, section_name) ---
  const { data: section, error: secErr } = await supabase
    .from("sections")
    .select("id, name, gyms!inner(slug)")
    .eq("gyms.slug", item.gym_slug)
    .eq("name", item.section_name)
    .maybeSingle();

  if (secErr) {
    console.log(`ERR   ${label} — section lookup failed: ${secErr.message}`);
    summary.invalid++;
    continue;
  }
  if (!section) {
    console.log(`SKIP  ${label} — no section "${item.section_name}" for gym "${item.gym_slug}"`);
    summary.invalid++;
    continue;
  }

  // --- dedupe: is there already a reset OR pending/approved submission for
  //     this (section, date)? Keeps daily re-runs from piling up. ---
  const [{ count: resetCount }, { count: subCount }] = await Promise.all([
    supabase
      .from("resets")
      .select("id", { count: "exact", head: true })
      .eq("section_id", section.id)
      .eq("reset_on", item.reset_on),
    supabase
      .from("reset_submissions")
      .select("id", { count: "exact", head: true })
      .eq("section_id", section.id)
      .eq("reset_on", item.reset_on)
      .in("status", ["pending", "approved"]),
  ]);

  if ((resetCount ?? 0) > 0 || (subCount ?? 0) > 0) {
    console.log(`SKIP  ${label} — already exists (reset or pending/approved submission)`);
    summary.skippedDuplicate++;
    continue;
  }

  const notes = typeof item.notes === "string" && item.notes.trim() ? item.notes.trim() : null;

  const hasPhoto = typeof item.image_url === "string" && item.image_url.startsWith("http");

  if (!commit) {
    console.log(
      `DRY   ${label} — would insert (boulders=${boulders ?? "—"}, notes=${JSON.stringify(notes)}, ` +
        `photo=${hasPhoto ? "yes" : "no"}, src=${item.source_ref ?? "—"})`,
    );
    summary.wouldInsert++;
    continue;
  }

  // Upload the story frame so the admin reviews it with the image attached,
  // exactly like a user's "suggest a reset" photo. Non-fatal on failure — a
  // submission without a photo is still useful.
  let photoPath = null;
  if (hasPhoto) {
    photoPath = await uploadPhoto(item.image_url);
    if (!photoPath) console.log(`WARN  ${label} — photo upload failed, submitting without it`);
  }

  const { error: insErr } = await supabase.from("reset_submissions").insert({
    section_id: section.id,
    reset_on: item.reset_on,
    notes,
    boulders_reset: boulders,
    submitted_by: submitter,
    status: "pending",
    photo_path: photoPath,
  });

  if (insErr) {
    console.log(`ERR   ${label} — insert failed: ${insErr.message}`);
    summary.invalid++;
    continue;
  }
  console.log(`OK    ${label} — submitted (photo=${photoPath ? "yes" : "no"}, src=${item.source_ref ?? "—"})`);
  summary.inserted++;
}

console.log(
  `\n${commit ? "COMMIT" : "DRY-RUN"} summary: ` +
    `${commit ? summary.inserted + " inserted" : summary.wouldInsert + " would insert"}, ` +
    `${summary.skippedDuplicate} duplicate, ${summary.skippedLowConf} low-confidence, ${summary.invalid} invalid.`,
);
if (!commit) console.log("Re-run with --commit to actually submit.");

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
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
