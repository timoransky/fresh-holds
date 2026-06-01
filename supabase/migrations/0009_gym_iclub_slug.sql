-- Add iclub_slug for deep-linking into online.iclub.sk's per-gym login page.
-- iclub identifies each gym by a kebab-case slug used in two equivalent URL
-- forms: ?client=<slug> (read by clients.js) and /klient/<slug>/#/... (used
-- by iclub's own post-auth redirect). We use the path form so users land
-- directly on the login screen for that gym, skipping the buried gym picker.

alter table gyms add column iclub_slug text;

update gyms set iclub_slug = 'spot-climbing-gym-ba' where slug = 'spot';
update gyms set iclub_slug = 'blockdock-ba'         where slug = 'block-dock-raca';
update gyms set iclub_slug = 'blockdock-ba'         where slug = 'block-dock-petrzalka';
update gyms set iclub_slug = 'k2-ba'                where slug = 'k2';
update gyms set iclub_slug = 'vertigo-ba'           where slug = 'vertigo';
