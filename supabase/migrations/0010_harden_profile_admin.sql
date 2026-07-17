-- Prevent privilege self-escalation via profiles updates.
--
-- The original policy (0002) let any authenticated user update their own
-- profile row with no column restriction:
--
--   create policy "allow own update" on profiles for update using (auth.uid() = id);
--
-- so a signed-in user could run `update profiles set is_admin = true` on
-- themselves and become an admin. Re-scope the policy so the row RESULTING from
-- a self-update must keep is_admin = false. Admins are toggled out-of-band (the
-- Supabase dashboard / service role), which bypasses RLS and is unaffected.
--
-- This matters for the Instagram-stories bot (docs/instagram-stories-pilot.md):
-- the bot is a plain authenticated user, and this is what stops a leaked bot
-- password from being escalated to admin.

drop policy "allow own update" on profiles;

create policy "allow own update" on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id and is_admin = false);
