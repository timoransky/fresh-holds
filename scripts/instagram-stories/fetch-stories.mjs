#!/usr/bin/env node
// Fetch Instagram stories for the configured gym handles via an Apify actor
// and emit normalized story items as JSON on stdout. The extraction step
// (an agent) then downloads each media URL, reads it, and decides whether it
// describes a reset.
//
// This script does NOT interpret stories — it only pulls raw material.
//
// Required env:
//   APIFY_TOKEN      Apify API token (Settings → Integrations).
//   APIFY_ACTOR_ID   Actor id/slug, e.g. "apify~instagram-scraper" or a
//                    story-specific actor. Use "~" between user and actor.
//
// Optional env:
//   APIFY_INPUT_JSON Extra actor input as JSON, merged over the default input.
//                    Use this to pass the actor's IG login/session fields and
//                    any actor-specific options. `usernames` is injected
//                    automatically unless you set it here.
//   IG_STORY_MAX_AGE_HOURS  Drop stories older than this (default 30).
//
// Usage:
//   node scripts/instagram-stories/fetch-stories.mjs > stories.json
//   node scripts/instagram-stories/fetch-stories.mjs --handles spotbouldering

import { scrapableHandles } from "./config.mjs";

const token = process.env.APIFY_TOKEN;
const actorId = process.env.APIFY_ACTOR_ID;

if (!token || !actorId) {
  console.error(
    "Missing APIFY_TOKEN and/or APIFY_ACTOR_ID.\n" +
      "See docs/instagram-stories-pilot.md → Setup.",
  );
  process.exit(1);
}

const argHandles = getArg("--handles");
const handleMap = scrapableHandles(); // Map<handle, gymSlug[]>
const handles = argHandles
  ? argHandles.split(",").map((h) => h.trim().toLowerCase())
  : [...handleMap.keys()];

if (handles.length === 0) {
  console.error("No scrapable handles configured. Add instagram_handle values in config.mjs.");
  process.exit(1);
}

const maxAgeHours = Number(process.env.IG_STORY_MAX_AGE_HOURS ?? 30);

// Build actor input. `usernames` is what igview-owner/instagram-story-viewer
// requires; extend/override via APIFY_INPUT_JSON for actors that need extra or
// differently-named fields.
let input = { usernames: handles };
if (process.env.APIFY_INPUT_JSON) {
  try {
    input = { ...input, ...JSON.parse(process.env.APIFY_INPUT_JSON) };
    if (!input.usernames) input.usernames = handles;
  } catch (e) {
    console.error(`APIFY_INPUT_JSON is not valid JSON: ${e.message}`);
    process.exit(1);
  }
}

const endpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(
  actorId,
)}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

let items;
try {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`Apify run failed: ${res.status} ${res.statusText}\n${body.slice(0, 500)}`);
    process.exit(1);
  }
  items = await res.json();
} catch (e) {
  console.error(`Could not reach Apify: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(items)) {
  console.error("Unexpected Apify response (expected an array of dataset items).");
  process.exit(1);
}

const now = Date.now();
const normalized = items
  .map((it) => normalize(it, handleMap))
  .filter((s) => s && s.mediaUrl)
  .filter((s) => {
    if (!s.takenAt) return true; // keep if we can't tell its age
    const ageH = (now - Date.parse(s.takenAt)) / 3_600_000;
    return Number.isNaN(ageH) || ageH <= maxAgeHours;
  });

process.stdout.write(JSON.stringify(normalized, null, 2) + "\n");
console.error(
  `Fetched ${items.length} raw item(s); ${normalized.length} story(ies) within ${maxAgeHours}h with media.`,
);

// --- helpers -----------------------------------------------------------------

function normalize(it, handleMap) {
  if (!it || typeof it !== "object") return null;

  const handle = String(
    it.ownerUsername ?? it.username ?? it.owner?.username ?? it.user?.username ?? "",
  )
    .toLowerCase()
    .replace(/^@/, "");

  const takenAtRaw = it.timestamp ?? it.takenAt ?? it.takenAtTimestamp ?? it.taken_at ?? null;
  const takenAt = toIso(takenAtRaw);

  // Prefer a still image (viewable); fall back to video/any url. Instagram
  // stories are often video — the extractor can still read the poster frame.
  const mediaUrl =
    it.displayUrl ??
    it.imageUrl ??
    it.image_url ??
    it.url ??
    it.videoUrl ??
    it.video_url ??
    (Array.isArray(it.images) ? it.images[0] : null) ??
    null;

  return {
    handle,
    gymSlugCandidates: handle ? handleMap.get(handle) ?? [] : [],
    storyId: String(it.id ?? it.storyId ?? it.shortCode ?? it.pk ?? mediaUrl ?? ""),
    takenAt,
    caption: it.caption ?? it.text ?? it.accessibilityCaption ?? null,
    mediaType: it.videoUrl || it.video_url || it.type === "Video" ? "video" : "image",
    mediaUrl,
    videoUrl: it.videoUrl ?? it.video_url ?? null,
    permalink: it.url ?? it.permalink ?? null,
    raw: it, // keep everything so nothing is lost if field names differ
  };
}

function toIso(v) {
  if (v == null) return null;
  if (typeof v === "number") {
    // seconds vs ms
    const ms = v < 1e12 ? v * 1000 : v;
    return new Date(ms).toISOString();
  }
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function getArg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}
