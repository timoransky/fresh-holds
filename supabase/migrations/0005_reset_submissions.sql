-- User-submitted reset suggestions. Kept separate from `resets` so the
-- trusted freshness signal stays clean; on approval an admin copies the
-- row 1:1 into `resets`.

create type submission_status as enum ('pending', 'approved', 'rejected');

create table reset_submissions (
  id              uuid primary key default gen_random_uuid(),
  section_id      uuid not null references sections(id) on delete cascade,
  reset_on        date not null,
  notes           text,
  boulders_reset  integer check (boulders_reset is null or boulders_reset > 0),
  submitted_by    uuid not null references profiles(id) on delete cascade,
  status          submission_status not null default 'pending',
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  reset_id        uuid references resets(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index reset_submissions_status_idx on reset_submissions(status, created_at desc);
create index reset_submissions_user_idx   on reset_submissions(submitted_by, created_at desc);

alter table reset_submissions enable row level security;

create policy "own submissions read" on reset_submissions
  for select using (auth.uid() = submitted_by);

-- Cap pending submissions per user at 5 to keep abuse surface small.
create policy "own submissions insert" on reset_submissions
  for insert with check (
    auth.uid() = submitted_by
    and status = 'pending'
    and (
      select count(*) from reset_submissions
      where submitted_by = auth.uid() and status = 'pending'
    ) < 5
  );

create policy "admin submissions read" on reset_submissions
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin submissions update" on reset_submissions
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
