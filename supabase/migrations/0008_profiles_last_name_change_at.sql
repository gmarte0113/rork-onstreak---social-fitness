-- Track when a user last changed their display name to enforce a cooldown.
alter table if exists public.profiles
  add column if not exists last_name_change_at timestamptz;
