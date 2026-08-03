-- M1 lets the user pick a high-latitude rule, but the data model in the build
-- spec (§7) has no column for it. Without one, anyone north of roughly 48°
-- loses their choice the moment they sign in on another device.

create type high_latitude_rule as enum (
  'auto',
  'middle_of_the_night',
  'seventh_of_the_night',
  'twilight_angle'
);

alter table profiles
  add column high_latitude_rule high_latitude_rule not null default 'auto';
