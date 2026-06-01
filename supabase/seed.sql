-- Fresh Holds seed data — idempotent.
-- Run after 0001_initial.sql.

begin;

-- City -----------------------------------------------------------------------
insert into cities (name, slug, country_code) values
  ('Bratislava', 'bratislava', 'SK')
on conflict (slug) do nothing;

-- Gyms -----------------------------------------------------------------------
-- Upsert so re-running the seed updates names / neighborhoods / order.
insert into gyms (city_id, name, slug, neighborhood, website_url, instagram_handle, iclub_slug, display_order) values
  ((select id from cities where slug = 'bratislava'), 'Spot',       'spot',                  'Devínska Nová Ves', 'https://spot.sk',       'spotbouldering', 'spot-climbing-gym-ba', 1),
  ((select id from cities where slug = 'bratislava'), 'Block Dock - Rača',      'block-dock-raca',       'Rača',              'https://blockdock.sk',  'blockdock',      'blockdock-ba',         2),
  ((select id from cities where slug = 'bratislava'), 'Block Dock - Petržalka', 'block-dock-petrzalka',  'Petržalka',         'https://blockdock.sk',  'blockdock',      'blockdock-ba',         3),
  ((select id from cities where slug = 'bratislava'), 'K2',         'k2',                    'Petržalka',          null,                   null,             'k2-ba',                4),
  ((select id from cities where slug = 'bratislava'), 'Vertigo',    'vertigo',               'Trenčianska',        null,                   null,             'vertigo-ba',           5)
on conflict (slug) do update set
  name             = excluded.name,
  neighborhood     = excluded.neighborhood,
  website_url      = excluded.website_url,
  instagram_handle = excluded.instagram_handle,
  iclub_slug       = excluded.iclub_slug,
  display_order    = excluded.display_order;

-- Drop the legacy 'block-dock' slug from a prior seed run, if present.
delete from gyms where slug = 'block-dock';

-- Sections + resets — wipe and re-insert so the seed is idempotent.
delete from sections where gym_id in (
  select id from gyms where slug in (
    'spot','block-dock-raca','block-dock-petrzalka','k2','vertigo'
  )
);

-- Spot (6 sections) ----------------------------------------------------------
with g as (select id from gyms where slug = 'spot')
insert into sections (gym_id, name, display_order) values
  ((select id from g), 'Cave', 1),
  ((select id from g), 'Slab', 2),
  ((select id from g), 'Roof', 3),
  ((select id from g), 'Top',  4),
  ((select id from g), 'Comp', 5),
  ((select id from g), 'Kids', 6);

-- Block Dock Rača (5 sections) -----------------------------------------------
with g as (select id from gyms where slug = 'block-dock-raca')
insert into sections (gym_id, name, display_order) values
  ((select id from g), 'Yellow', 1),
  ((select id from g), 'Cave',   2),
  ((select id from g), 'Slab',   3),
  ((select id from g), 'Wall',   4),
  ((select id from g), 'Arête',  5);

-- Block Dock Petržalka (8 sections) ------------------------------------------
with g as (select id from gyms where slug = 'block-dock-petrzalka')
insert into sections (gym_id, name, display_order) values
  ((select id from g), 'Akira',       1),
  ((select id from g), 'Výklenok',    2),
  ((select id from g), 'Hueco',       3),
  ((select id from g), 'Tattoine',    4),
  ((select id from g), 'Sumo',        5),
  ((select id from g), 'Duna',        6),
  ((select id from g), 'Pandora',     7),
  ((select id from g), 'Kaer Morhen', 8);

-- K2 (4 sections) ------------------------------------------------------------
with g as (select id from gyms where slug = 'k2')
insert into sections (gym_id, name, display_order) values
  ((select id from g), 'Boulder',  1),
  ((select id from g), 'Overhang', 2),
  ((select id from g), 'Slab',     3),
  ((select id from g), 'Training', 4);

-- Vertigo (3 sections) -------------------------------------------------------
with g as (select id from gyms where slug = 'vertigo')
insert into sections (gym_id, name, display_order) values
  ((select id from g), 'Main',     1),
  ((select id from g), 'Boulder',  2),
  ((select id from g), 'Training', 3);

-- Resets — one per section, deterministic spread relative to current_date.
-- Block Dock Petržalka offsets preserve the spacing of the original date list
-- (Výklenok newest, Pandora oldest), anchored at -1 day.
insert into resets (section_id, reset_on)
select s.id, current_date - (offsets.days_ago || ' days')::interval
from (values
  ('spot',                  'Cave',         2),
  ('spot',                  'Slab',        18),
  ('spot',                  'Roof',         5),
  ('spot',                  'Top',         11),
  ('spot',                  'Comp',         1),
  ('spot',                  'Kids',        20),
  ('block-dock-raca',       'Yellow',       4),
  ('block-dock-raca',       'Cave',        15),
  ('block-dock-raca',       'Slab',         8),
  ('block-dock-raca',       'Wall',         3),
  ('block-dock-raca',       'Arête',       22),
  ('block-dock-petrzalka',  'Výklenok',     1),
  ('block-dock-petrzalka',  'Duna',         8),
  ('block-dock-petrzalka',  'Kaer Morhen', 15),
  ('block-dock-petrzalka',  'Akira',       24),
  ('block-dock-petrzalka',  'Tattoine',    36),
  ('block-dock-petrzalka',  'Hueco',       43),
  ('block-dock-petrzalka',  'Sumo',        50),
  ('block-dock-petrzalka',  'Pandora',     57),
  ('k2',                    'Boulder',      6),
  ('k2',                    'Overhang',    14),
  ('k2',                    'Slab',         9),
  ('k2',                    'Training',    24),
  ('vertigo',               'Main',        12),
  ('vertigo',               'Boulder',     19),
  ('vertigo',               'Training',    25)
) as offsets(gym_slug, section_name, days_ago)
join gyms     g on g.slug = offsets.gym_slug
join sections s on s.gym_id = g.id and s.name = offsets.section_name;

commit;
