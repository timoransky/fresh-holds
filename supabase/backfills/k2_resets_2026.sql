-- K2 (Lezecká stena K2 – Bratislava) — gym setup + real route-set history
-- ============================================================================
-- Adds/corrects the K2 gym row and backfills its route sets ("resets") from the
-- gym's PUBLIC INSTAGRAM FEED, @lezeckastenak2, Feb–Jul 2026.
--
-- K2 is a rope gym (1500 m² rope + 200 m² boulder, 15.5 m) and sets by sector
-- roughly monthly, announced as regular feed POSTS (not stories). This is a
-- one-time backfill so K2 lands with realistic history instead of starting blank.
--
-- How the data was gathered (reproducible):
--   Apify actor  apify/instagram-scraper
--   input        { "directUrls": ["https://www.instagram.com/lezeckastenak2/"],
--                  "resultsType": "posts", "resultsLimit": 60,
--                  "onlyPostsNewerThan": "2026-02-01" }
--   Each `logged_by` below is the source post's Instagram shortcode
--   (https://www.instagram.com/p/<shortcode>/) for traceability.
--
-- Run it in the Supabase SQL editor (admin / dashboard path — the same trusted
-- route as a manual reset entry). Idempotent: it REBUILDS K2's sections and
-- resets from scratch, so run it before K2 accrues any human-curated resets you
-- want to keep.
-- ============================================================================

begin;

-- 1) Gym metadata -------------------------------------------------------------
-- K2 may already exist as a placeholder; correct its details either way.
-- Booking is via lezeckastena.isportsystem.sk, NOT iclub, so iclub_slug is null
-- (an iclub deep-link would 404 for K2).
insert into gyms
  (city_id, name, slug, neighborhood, website_url, instagram_handle, iclub_slug, display_order)
values
  ((select id from cities where slug = 'bratislava'),
   'K2', 'k2', 'Ružinov',
   'https://www.lezeckastena.sk', 'lezeckastenak2', null, 4)
on conflict (slug) do update set
  name             = excluded.name,
  neighborhood     = excluded.neighborhood,
  website_url      = excluded.website_url,
  instagram_handle = excluded.instagram_handle,
  iclub_slug       = excluded.iclub_slug;

-- 2) Sections -----------------------------------------------------------------
-- Wipe K2's existing sections (cascades to their resets) and insert the real
-- sectors K2 sets by: the named rope-hall sub-walls (Kaskády, Galéria, Monster),
-- the auto-belay lines (Samoisty), a general main-hall bucket for sets that
-- don't name a sub-sector (Hala), and the boulder area (Boulder).
delete from sections where gym_id = (select id from gyms where slug = 'k2');

with g as (select id from gyms where slug = 'k2')
insert into sections (gym_id, name, display_order) values
  ((select id from g), 'Kaskády',  1),
  ((select id from g), 'Galéria',  2),
  ((select id from g), 'Monster',  3),
  ((select id from g), 'Samoisty', 4),
  ((select id from g), 'Hala',     5),
  ((select id from g), 'Boulder',  6);

-- 3) Resets -------------------------------------------------------------------
-- Real dates from @lezeckastenak2 feed posts. `boulders_reset` carries the
-- announced route count when the post stated one (display-only — never scored),
-- `notes` is a short public-facing line, `logged_by` is the source IG shortcode.
-- Posts that named two sectors (e.g. "10x samoist, 13x top-rope a lead") are
-- split into one row per sector.
insert into resets (section_id, reset_on, notes, boulders_reset, logged_by)
select s.id, r.reset_on::date, r.notes, r.boulders_reset, r.logged_by
from (values
  ('Samoisty', '2026-02-01', 'New auto-belay lines for beginners and intermediates', null::int, 'ig:DUNaE2Gj39G'),
  ('Kaskády',  '2026-02-10', 'New routes on the Kaskády sector, grades 6- to 8',      null,      'ig:DUlOYzCFz_0'),
  ('Hala',     '2026-03-03', '30 new routes across the hall, grades 5 to 8-',          30,       'ig:DVbRQj0DcEz'),
  ('Hala',     '2026-03-16', 'Fresh batch of Toprope and Lead routes',                 null,     'ig:DV81yoyjdFa'),
  ('Monster',  '2026-05-06', '51 new routes on the Monster profile',                   51,       'ig:DX_qgSolzNT'),
  ('Samoisty', '2026-05-15', '10 new auto-belay routes',                               10,       'ig:DYXEI7cDQWh'),
  ('Hala',     '2026-05-15', '13 new Toprope and Lead routes',                         13,       'ig:DYXEI7cDQWh'),
  ('Hala',     '2026-05-25', '15 new routes, roof and gentle overhang',                15,       'ig:DYwtb_sDTqS'),
  ('Samoisty', '2026-07-13', 'New auto-belay and toprope routes',                      null,     'ig:Dau9XBfDcwp'),
  ('Galéria',  '2026-07-14', 'New Toprope and Lead routes on the Galéria',             null,     'ig:DaxWm9ZlZbO'),
  ('Hala',     '2026-07-21', 'A few new technique-focused routes',                     null,     'ig:DbDmSV5kqO5')
) as r(section_name, reset_on, notes, boulders_reset, logged_by)
join gyms     g on g.slug = 'k2'
join sections s on s.gym_id = g.id and s.name = r.section_name;

commit;
