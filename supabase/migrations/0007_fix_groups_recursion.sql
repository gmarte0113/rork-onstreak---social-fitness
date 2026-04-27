-- Fix: infinite recursion detected in policy for relation "groups".
--
-- Cause: a policy on public.groups references another table (e.g.
-- group_members) whose own policy in turn references public.groups,
-- creating a cycle. This breaks every query on groups, including
-- INSERT ... RETURNING used by createGroupRemote.
--
-- Solution: drop every existing policy on public.groups and recreate
-- them with simple, non-recursive rules. Creator-based checks use the
-- groups.created_by column directly (no subquery needed). Membership
-- reads go through SECURITY DEFINER helper functions that bypass RLS.
--
-- Run this once in Supabase Studio -> SQL Editor.

-- ============================================================
-- 1. Drop ALL existing policies on public.groups
-- ============================================================
do $$
declare
  r record;
begin
  for r in
    select polname
    from pg_policy
    where polrelid = 'public.groups'::regclass
  loop
    execute format('drop policy if exists %I on public.groups', r.polname);
  end loop;
end$$;

alter table if exists public.groups enable row level security;

-- ============================================================
-- 2. Recreate non-recursive policies on public.groups
-- ============================================================

-- SELECT: allow all authenticated users to read groups.
-- Needed for code lookup when joining, and for listing own groups.
create policy "groups_select_all"
  on public.groups
  for select
  to authenticated
  using (true);

-- INSERT: any authenticated user can create a group, as long as
-- they set themselves as the creator.
create policy "groups_insert_authenticated"
  on public.groups
  for insert
  to authenticated
  with check (auth.uid() = created_by);

-- UPDATE: only the creator can update the group.
create policy "groups_update_creator"
  on public.groups
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- DELETE: only the creator can delete the group.
create policy "groups_delete_creator"
  on public.groups
  for delete
  to authenticated
  using (auth.uid() = created_by);

-- ============================================================
-- 3. Re-assert non-recursive group_members SELECT policy.
-- (Safety net in case 0005 was not applied or was overwritten.)
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
