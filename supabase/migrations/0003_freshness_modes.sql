-- Two reset models per gym:
--   'sections' (default): one reset row per section that got reset (Block Dock).
--   'count':              one reset row per batch announcement, with a boulder count (Spot).
-- Count-mode gyms still have one section row so resets can attach somewhere.
-- No denominator is stored — sort + tier are derived from how recent / how many fresh
-- resets a user has seen since their last visit, not from gym totals.

alter table gyms
  add column freshness_mode text not null default 'sections'
    check (freshness_mode in ('sections', 'count'));

alter table resets
  add column boulders_reset integer
    check (boulders_reset is null or boulders_reset > 0);
