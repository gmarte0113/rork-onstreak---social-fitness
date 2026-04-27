-- Add created_by column to groups table to track the creator
alter table if exists public.groups
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Backfill existing rows with owner_id if available
update public.groups
set created_by = owner_id
where created_by is null;

create index if not exists groups_created_by_idx on public.groups (created_by);
