-- Fix: infinite recursion detected in policy for relation "group_members".
--
-- Cause: the SELECT policy on group_members had a subquery against
-- group_members itself, which re-triggers the same policy → recursion.
--
-- Solution: use SECURITY DEFINER helper functions that read the tables
-- with the function owner's privileges, bypassing RLS for the internal
-- membership check. Policies then call these functions instead of
-- embedding recursive subqueries.
--
-- Run this once in Supabase Studio -> SQL Editor.

-- ============================================================
-- Helper functions (SECURITY DEFINER) to avoid recursive RLS
-- ============================================================
create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = gid and gm.user_id = uid
  );
$$;

create or replace function public.is_group_creator(gid uuid, uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.groups g
    where g.id = gid and g.created_by = uid
  );
$$;

grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_group_creator(uuid, uuid) to authenticated;

-- ============================================================
-- GROUP MEMBERS - replace recursive SELECT policy
-- ============================================================
alter table if exists public.group_members enable row level security;

drop policy if exists "group_members_select_same_group" on public.group_members;
create policy "group_members_select_same_group"
  on public.group_members
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_group_member(group_id, auth.uid())
    or public.is_group_creator(group_id, auth.uid())
  );

-- ============================================================
-- GROUP WORKOUT PHOTOS - replace subqueries with helper function
-- ============================================================
alter table if exists public.group_workout_photos enable row level security;

drop policy if exists "group_photos_insert_self_member" on public.group_workout_photos;
create policy "group_photos_insert_self_member"
  on public.group_workout_photos
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.is_group_member(group_id, auth.uid())
  );

drop policy if exists "group_photos_select_member" on public.group_workout_photos;
create policy "group_photos_select_member"
  on public.group_workout_photos
  for select
  to authenticated
  using (
    public.is_group_member(group_id, auth.uid())
  );

-- ============================================================
-- GROUP MEMBERS DELETE policy from 0003 also had a groups subquery
-- which is fine (different table), but rewrite via helper for clarity.
-- ============================================================
drop policy if exists "group_members_delete_self_or_creator" on public.group_members;
create policy "group_members_delete_self_or_creator"
  on public.group_members
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_group_creator(group_id, auth.uid())
  );
