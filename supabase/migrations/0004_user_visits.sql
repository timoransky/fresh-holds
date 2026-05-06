-- Per-user visit log. Authed users get cross-device sync; anonymous users
-- continue to use localStorage only. Keyed by gym_slug (not gym_id) so a
-- user's history survives gym renames/deletions.

create table visits (
  user_id    uuid not null references auth.users(id) on delete cascade,
  gym_slug   text not null,
  visited_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, gym_slug, visited_on)
);

create index visits_user_idx on visits(user_id);

alter table visits enable row level security;

create policy "own visits read"   on visits for select using (auth.uid() = user_id);
create policy "own visits insert" on visits for insert with check (auth.uid() = user_id);
create policy "own visits delete" on visits for delete using (auth.uid() = user_id);
