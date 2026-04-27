-- Allow only the group creator to delete the group and all related data.
-- Run this once in Supabase Studio -> SQL Editor.

-- GROUPS: only creator can delete
alter table if exists public.groups enable row level security;

drop policy if exists "groups_delete_creator" on public.groups;
create policy "groups_delete_creator"
  on public.groups
  for delete
  using (auth.uid() = created_by);

-- GROUP MEMBERS: creator can delete any member row in their group,
-- and members can delete their own row (to leave).
alter table if exists public.group_members enable row level security;

drop policy if exists "group_members_delete_self_or_creator" on public.group_members;
create policy "group_members_delete_self_or_creator"
  on public.group_members
  for delete
  using (
    auth.uid() = user_id
    or auth.uid() in (
      select g.created_by from public.groups g where g.id = group_id
    )
  );

-- GROUP WORKOUT PHOTOS: creator can delete any row in their group,
-- members can delete their own rows.
alter table if exists public.group_workout_photos enable row level security;

drop policy if exists "group_photos_delete_self_or_creator" on public.group_workout_photos;
create policy "group_photos_delete_self_or_creator"
  on public.group_workout_photos
  for delete
  using (
    auth.uid() = user_id
    or auth.uid() in (
      select g.created_by from public.groups g where g.id = group_id
    )
  );
