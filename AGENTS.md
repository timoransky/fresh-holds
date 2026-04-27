<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Fresh Holds

A Next.js 16 (App Router) + Supabase app that helps Bratislava boulderers see which gym is freshest since their last visit. Server components fetch gyms/sections/resets in one query via `@supabase/ssr`; visit history lives in `localStorage` only — no auth, no admin UI. RLS policies allow public read on all four tables (`cities`, `gyms`, `sections`, `resets`); resets are logged manually in the Supabase dashboard. Tailwind v4 with Geist, light-only.
