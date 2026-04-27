-- Fresh Holds initial schema
-- Run in the Supabase SQL Editor (or via `supabase db push`).

create extension if not exists pgcrypto;

create table cities (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  country_code text not null default 'SK',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table gyms (
  id                uuid primary key default gen_random_uuid(),
  city_id           uuid references cities(id) on delete set null,
  name              text not null,
  slug              text not null unique,
  neighborhood      text,
  website_url       text,
  instagram_handle  text,
  is_active         boolean not null default true,
  display_order     integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table sections (
  id            uuid primary key default gen_random_uuid(),
  gym_id        uuid not null references gyms(id) on delete cascade,
  name          text not null,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table resets (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references sections(id) on delete cascade,
  reset_on    date not null,
  notes       text,
  logged_by   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index gyms_city_id_idx     on gyms(city_id);
create index sections_gym_id_idx  on sections(gym_id);
create index resets_section_id_idx on resets(section_id);
create index resets_reset_on_desc_idx on resets(reset_on desc);

alter table cities   enable row level security;
alter table gyms     enable row level security;
alter table sections enable row level security;
alter table resets   enable row level security;

create policy "allow public read" on cities   for select using (true);
create policy "allow public read" on gyms     for select using (true);
create policy "allow public read" on sections for select using (true);
create policy "allow public read" on resets   for select using (true);
