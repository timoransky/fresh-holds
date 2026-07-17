#!/usr/bin/env node
// Fetch Instagram stories for the active gyms via an Apify actor and emit
// normalized story items as JSON on stdout. The extraction step (an agent) then
// downloads each media URL, reads it, and decides whether it describes a reset.
// This script interprets nothing.
//
// The handle list comes from the DATABASE — active gyms with a non-null
// instagram_handle — so it stays in sync automatically (no hardcoded gym
// config). Pass --handles to override for ad-hoc testing, which skips the DB
// entirely and needs only the Apify token.
//
// Required env:
//   APIFY_TOKEN                              Apify API token.
//   A public Supabase key + URL              (SUPABASE_ANON_KEY /
//     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_URL /
//     NEXT_PUBLIC_SUPABASE_URL) — only when NOT using --handles. Gyms are
//     public-read, so the anon key is enough; no service-role key needed.
//
// Optional env:
//   APIFY_ACTOR_ID      default: igview-owner~instagram-story-viewer
//   APIFY_INPUT_JSON    extra actor input merged over { usernames }.
//   IG_STORY_MAX_AGE_HOURS   drop stories older than this (default 30).
//
// Usage:
//   node scripts/instagram-stories/fetch-stories.mjs > stories.json
//   node scripts/instagram-stories/fetch-stories.mjs --handles spot_climbing_gym

const token = process.env.APIFY_TOKEN;
if (!token) {
  console.error("Missing APIFY_TOKEN. See docs/instagram-stories-pilot.md → Setup.");
  process.exit(1);
}

const actorId = process.env.APIFY_ACTOR_ID || "igview-owner~instagram-story-viewer";
const maxAgeHours = Number(process.env.IG_STORY_MAX_AGE_HOURS ?? 30);

// handleMap: Map<handle, gymSlug[]> — one handle can map to several gyms
// (e.g. Block Dock runs both locations from @blockdock).
const argHandles = getArg("--handles");
const handleMap = argHandles
  ? new Map(argHandles.split(",").map((h) => [normHandle(h), []]))
  : await handlesFromDb();

const handles = [...handleMap.keys()];
if (handles.length === 0) {
  console.error("No active gyms with an instagram_handle (and no --handles given).");
  process.exit(1);
}

// igview-owner/instagram-story-viewer requires only `usernames`; extend via
// APIFY_INPUT_JSON for actors that need extra or differently-named fields.
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

// Some actors return one dataset item per story; others (e.g. seemuapps) return
// one item per user with a nested `stories` array. Flatten both to story level,
// carrying the parent username down so each story knows its handle.
const storyItems = items.flatMap((it) => {
  if (it && Array.isArray(it.stories)) {
    return it.stories.map((st) => ({
      ...st,
      ownerUsername: st.ownerUsername ?? st.username ?? it.username ?? it.ownerUsername,
    }));
  }
  return [it];
});

const now = Date.now();
const normalized = storyItems
  .map((it) => normalize(it, handleMap))
  .filter((s) => s && s.mediaUrl)
  .filter((s) => {
    if (!s.takenAt) return true; // keep if we can't tell its age
    const ageH = (now - Date.parse(s.takenAt)) / 3_600_000;
    return Number.isNaN(ageH) || ageH <= maxAgeHours;
  });

process.stdout.write(JSON.stringify(normalized, null, 2) + "\n");
console.error(
  `Handles: ${handles.join(", ")}. ${items.length} dataset item(s) → ${storyItems.length} story(ies); ` +
    `${normalized.length} kept (within ${maxAgeHours}h, with media).`,
);

// --- helpers -----------------------------------------------------------------

async function handlesFromDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing Supabase creds to read the gym list (a public key + URL), " +
        "or pass --handles for an ad-hoc fetch.",
    );
    process.exit(1);
  }
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("gyms")
    .select("slug, instagram_handle")
    .eq("is_active", true)
    .not("instagram_handle", "is", null);
  if (error) {
    console.error(`Could not read gyms: ${error.message}`);
    process.exit(1);
  }
  const map = new Map();
  for (const g of data ?? []) {
    const h = normHandle(g.instagram_handle);
    if (!h) continue;
    if (!map.has(h)) map.set(h, []);
    map.get(h).push(g.slug);
  }
  return map;
}

function normHandle(h) {
  return String(h ?? "").trim().toLowerCase().replace(/^@/, "");
}

function normalize(it, handleMap) {
  if (!it || typeof it !== "object") return null;

  const handle = normHandle(
    it.ownerUsername ?? it.username ?? it.owner_username ?? it.owner?.username ?? it.user?.username ?? "",
  );

  const takenAtRaw =
    it.timestamp ?? it.takenAt ?? it.takenAtISO ?? it.takenAtTimestamp ?? it.taken_at ?? null;
  const takenAt = toIso(takenAtRaw);

  const mediaUrl = pickMediaUrl(it);

  const mediaType =
    typeof it.mediaType === "string"
      ? it.mediaType.toLowerCase()
      : it.videoUrl || it.video_url || it.type === "Video" || /\.mp4(\?|$)/i.test(mediaUrl ?? "")
        ? "video"
        : "image";

  return {
    handle,
    gymSlugCandidates: handle ? handleMap.get(handle) ?? [] : [],
    storyId: String(it.id ?? it.storyId ?? it.shortCode ?? it.pk ?? mediaUrl ?? ""),
    takenAt,
    caption: it.caption ?? it.text ?? it.accessibilityCaption ?? null,
    mediaType,
    mediaUrl,
    videoUrl: it.videoUrl ?? it.video_url ?? (mediaType === "video" ? mediaUrl : null),
    permalink: it.url ?? it.permalink ?? null,
    raw: it, // keep everything so nothing is lost if field names differ
  };
}

// Find the story's media URL. Try well-known keys first (a still image is
// preferred — it's viewable), then fall back to any media-looking URL on a
// media-ish key, so a new actor with different field names still works. Skips
// profile/avatar/thumbnail keys so we don't grab the poster's avatar.
function pickMediaUrl(it) {
  const known =
    it.displayUrl ??
    it.imageUrl ??
    it.image_url ??
    it.image ??
    firstUrl(it.images) ??
    firstUrl(it.allImages) ??
    it.videoUrl ??
    it.video_url ??
    it.video ??
    firstUrl(it.allVideos) ??
    it.url;
  if (isUrl(known)) return known;

  for (const [k, v] of Object.entries(it)) {
    if (/profile|avatar|thumb/i.test(k)) continue;
    if (/image|video|media|display|photo|src|url/i.test(k)) {
      if (isUrl(v)) return v;
      const f = firstUrl(v);
      if (f) return f;
    }
  }
  return null;
}

function isUrl(v) {
  return typeof v === "string" && /^https?:\/\//.test(v);
}

function firstUrl(v) {
  return Array.isArray(v) ? v.find(isUrl) ?? null : null;
}

function toIso(v) {
  if (v == null) return null;
  if (typeof v === "number") {
    const ms = v < 1e12 ? v * 1000 : v; // seconds vs ms
    return new Date(ms).toISOString();
  }
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function getArg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}
