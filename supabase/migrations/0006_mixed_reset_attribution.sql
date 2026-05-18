-- A reset is tied to a gym; attaching it to a named section is optional, and
-- counting boulders is optional. This replaces the per-gym `freshness_mode`
-- toggle with per-row attribution, so a single gym can mix detailed sector
-- resets with "new boulders across the gym" social posts.

alter table resets
  add column gym_id uuid references gyms(id) on delete cascade;

update resets r
  set gym_id = s.gym_id
  from sections s
  where r.section_id = s.id;

alter table resets
  alter column gym_id set not null,
  alter column section_id drop not null;

create index resets_gym_id_idx on resets(gym_id);

alter table reset_submissions
  add column gym_id uuid references gyms(id) on delete cascade;

update reset_submissions rs
  set gym_id = s.gym_id
  from sections s
  where rs.section_id = s.id;

alter table reset_submissions
  alter column gym_id set not null,
  alter column section_id drop not null;

create index reset_submissions_gym_id_idx on reset_submissions(gym_id);

-- Migrate count-mode gyms: their dummy section's resets become gym-wide
-- (section_id = null), then the now-orphan dummy section is removed.
update resets set section_id = null
where section_id in (
  select s.id from sections s
  join gyms g on g.id = s.gym_id
  where g.freshness_mode = 'count'
);

update reset_submissions set section_id = null
where section_id in (
  select s.id from sections s
  join gyms g on g.id = s.gym_id
  where g.freshness_mode = 'count'
);

delete from sections
where gym_id in (select id from gyms where freshness_mode = 'count');

alter table gyms drop column freshness_mode;
