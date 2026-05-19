-- Freshness mode used to be a per-gym binary ('sections' vs 'count'). In practice
-- announcements are mixed: sometimes a reset has a boulder count, sometimes only
-- a sector hint, sometimes neither. The label is now derived per-gym at render
-- time from whatever data each reset carries (boulders_reset on resets stays as
-- a nullable count, sections continue to attach resets).

alter table gyms drop column freshness_mode;
