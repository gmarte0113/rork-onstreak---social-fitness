-- Creates an RPC that lets an authenticated user delete their own auth.users row.
-- Run this once in Supabase Studio -> SQL Editor.
--
-- The client (expo/providers/AppProvider.tsx -> deleteAccount) calls:
--   supabase.rpc("delete_current_user")
-- If this function is missing, account deletion fails with:
--   "Your data was cleared but we couldn't fully delete your account on the server."

create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Best-effort cleanup of app data (RLS-safe; ignore errors if tables differ).
  begin
    delete from public.weight_logs where user_id = uid;
  exception when undefined_table then null;
  end;

  begin
    delete from public.progress_photos where user_id = uid;
  exception when undefined_table then null;
  end;

  begin
    delete from public.profiles where user_id = uid;
  exception when undefined_table then null;
  end;

  begin
    delete from public.group_members where user_id = uid;
  exception when undefined_table then null;
  end;

  -- Finally remove the auth user. Requires SECURITY DEFINER + postgres owner.
  delete from auth.users where id = uid;
end;
$$;

-- Ensure the function is owned by postgres so it can touch auth.users.
alter function public.delete_current_user() owner to postgres;

revoke all on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;
