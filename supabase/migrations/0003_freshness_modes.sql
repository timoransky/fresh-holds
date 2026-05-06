-- Two reset models per gym:
--   'sections' (default): freshness = fresh sections / total sections (Block Dock).
--   'count':              freshness = fresh boulders / total_boulders (Spot, batch resets).
-- Count-mode gyms still have one section row so resets can attach somewhere.

alter table gyms
  add column freshness_mode text not null default 'sections'
    check (freshness_mode in ('sections', 'count')),
  add column total_boulders integer
    check (total_boulders is null or total_boulders > 0);

alter table gyms
  add constraint gyms_count_mode_requires_total
  check (freshness_mode <> 'count' or total_boulders is not null);

alter table resets
  add column boulders_reset integer
    check (boulders_reset is null or boulders_reset > 0);
