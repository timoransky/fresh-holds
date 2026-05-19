-- The "own submissions insert" policy from 0005 counts the user's pending
-- rows in a subquery against reset_submissions itself, which re-evaluates
-- the same policy and trips Postgres's recursion guard ("infinite
-- recursion detected in policy for relation reset_submissions"). Move the
-- count into a SECURITY DEFINER helper that runs without RLS.

create or replace function current_user_pending_submission_count()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from reset_submissions
  where submitted_by = auth.uid() and status = 'pending';
$$;

revoke all on function current_user_pending_submission_count() from public;
grant execute on function current_user_pending_submission_count() to authenticated;

drop policy if exists "own submissions insert" on reset_submissions;

create policy "own submissions insert" on reset_submissions
  for insert with check (
    auth.uid() = submitted_by
    and status = 'pending'
    and current_user_pending_submission_count() < 5
  );
