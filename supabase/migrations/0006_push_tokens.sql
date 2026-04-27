-- Add expo_push_token to profiles for push notifications (e.g. nudges).
-- Run this once in Supabase Studio -> SQL Editor.

alter table if exists public.profiles
  add column if not exists expo_push_token text;

create index if not exists profiles_expo_push_token_idx
  on public.profiles (expo_push_token);

-- Allow the owner to upsert their own profile row (needed because
-- the client upserts profile with the push token after login).
alter table if exists public.profiles enable row level security;

drop policy if exists "profiles_upsert_self" on public.profiles;
create policy "profiles_upsert_self"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- SECURITY DEFINER RPC to fetch a push token for a target user, but
-- only if the caller and target share at least one group. This prevents
-- leaking tokens to strangers.
create or replace function public.get_user_push_token(target_user_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  tok text;
  shares_group boolean;
begin
  if auth.uid() is null then
    return null;
  end if;

  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid()
      and b.user_id = target_user_id
  )
  into shares_group;

  if not shares_group then
    return null;
  end if;

  select expo_push_token
  into tok
  from public.profiles
  where user_id = target_user_id;

  return tok;
end;
$$;

grant execute on function public.get_user_push_token(uuid) to authenticated;
