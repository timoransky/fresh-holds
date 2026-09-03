-- Confidence rides ALONG with a scraped submission instead of gating it, and a
-- submission may name a gym without a sector. See ADR-0006.
--
-- The Instagram-stories bot used to drop any read it wasn't sure about, so the
-- admin never learned a borderline story existed — and a missed story can't be
-- backfilled (they vanish in ~24h). Now every plausible read is filed with a
-- low/medium/high stamp and the admin is the filter.

create type submission_confidence as enum ('low', 'medium', 'high');

-- Null = a human suggestion (a person doesn't rate their own certainty).
alter table reset_submissions
  add column confidence submission_confidence;

-- The gym is always known even when the wall isn't ("6 new jokers in Spot"
-- names no sector), so section_id becomes optional and gym_id carries the
-- attribution. The admin picks the sector when approving.
alter table reset_submissions
  add column gym_id uuid references gyms(id) on delete cascade;

alter table reset_submissions
  alter column section_id drop not null;

update reset_submissions rs
   set gym_id = s.gym_id
  from sections s
 where s.id = rs.section_id;

alter table reset_submissions
  alter column gym_id set not null;

create index reset_submissions_gym_date_idx on reset_submissions(gym_id, reset_on);

-- Keep gym_id honest in the DB rather than in every writer: whenever a section
-- is given, the gym is derived from it (so a mismatched pair can't exist, and
-- the app's `suggestReset` needs no change to satisfy the NOT NULL). BEFORE
-- triggers run ahead of constraint checks, so this fills the column in time.
-- Scoped to the columns it cares about, so the status-only update in
-- approveSubmission doesn't fire it.
create or replace function reset_submissions_fill_gym()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.section_id is not null then
    select gym_id into new.gym_id from sections where id = new.section_id;
  end if;
  if new.gym_id is null then
    raise exception 'reset_submissions needs a gym_id when section_id is null';
  end if;
  return new;
end;
$$;

create trigger reset_submissions_fill_gym_trg
  before insert or update of section_id, gym_id on reset_submissions
  for each row execute function reset_submissions_fill_gym();

-- Ungated filing means more pending rows per run, and the bot's insert loop
-- aborts on the RLS rejection the cap produces. Raise it 5 -> 20. Recreated
-- from 0007 (the SECURITY DEFINER count dodges the RLS recursion guard).
drop policy if exists "own submissions insert" on reset_submissions;

create policy "own submissions insert" on reset_submissions
  for insert with check (
    auth.uid() = submitted_by
    and status = 'pending'
    and current_user_pending_submission_count() < 20
  );
