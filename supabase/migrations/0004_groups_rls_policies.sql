-- Enable RLS and add missing policies for groups and group_members.
-- Run this once in Supabase Studio -> SQL Editor.

-- ============================================================
-- GROUPS
-- ============================================================
alter table if exists public.groups enable row level security;

-- INSERT: any authenticated user can create a group, as long as
-- they set themselves as the creator.
drop policy if exists "groups_insert_authenticated" on public.groups;
create policy "groups_insert_authenticated"
  on public.groups
  for insert
  to authenticated
  with check (auth.uid() = created_by);

-- SELECT: allow reading groups (needed for code lookup when joining,
-- and for listing groups the user belongs to).
drop policy if exists "groups_select_all" on public.groups;
create policy "groups_select_all"
  on public.groups
  for select
  to authenticated
  using (true);

-- UPDATE: creator can update their own group (icon, streak, etc.).
drop policy if exists "groups_update_creator" on public.groups;
create policy "groups_update_creator"
  on public.groups
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- DELETE policy already exists in 0003, but re-assert for safety.
drop policy if exists "groups_delete_creator" on public.groups;
create policy "groups_delete_creator"
  on public.groups
  for delete
  to authenticated
  using (auth.uid() = created_by);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
alter table if exists public.group_members enable row level security;

-- INSERT: a user can insert themselves as a member (join flow, and
-- creator adding themselves when creating a group).
drop policy if exists "group_members_insert_self" on public.group_members;
create policy "group_members_insert_self"
  on public.group_members
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- SELECT: members of a group can see other members of that group.
drop policy if exists "group_members_select_same_group" on public.group_members;
create policy "group_members_select_same_group"
  on public.group_members
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or group_id in (
      select gm.group_id from public.group_members gm where gm.user_id = auth.uid()
    )
    or auth.uid() in (
      select g.created_by from public.groups g where g.id = group_id
    )
  );

-- UPDATE: a member can update only their own row (completion, streak, etc.).
drop policy if exists "group_members_update_self" on public.group_members;
create policy "group_members_update_self"
  on public.group_members
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- GROUP WORKOUT PHOTOS
-- ============================================================
alter table if exists public.group_workout_photos enable row level security;

-- INSERT: users can insert photos as themselves into groups they belong to.
drop policy if exists "group_photos_insert_self_member" on public.group_workout_photos;
create policy "group_photos_insert_self_member"
  on public.group_workout_photos
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and group_id in (
      select gm.group_id from public.group_members gm where gm.user_id = auth.uid()
    )
  );

-- SELECT: members of a group can see photos in that group.
drop policy if exists "group_photos_select_member" on public.group_workout_photos;
create policy "group_photos_select_member"
  on public.group_workout_photos
  for select
  to authenticated
  using (
    group_id in (
      select gm.group_id from public.group_members gm where gm.user_id = auth.uid()
    )
  );
