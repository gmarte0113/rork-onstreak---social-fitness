-- Group chat messages table with RLS so members of a group can read/write messages.
create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null,
  user_name text,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists group_messages_group_id_created_at_idx
  on public.group_messages (group_id, created_at);

alter table if exists public.group_messages enable row level security;

-- INSERT: members of a group can post messages as themselves.
drop policy if exists "group_messages_insert_self_member" on public.group_messages;
create policy "group_messages_insert_self_member"
  on public.group_messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and group_id in (
      select gm.group_id from public.group_members gm where gm.user_id = auth.uid()
    )
  );

-- SELECT: members of a group can read messages.
drop policy if exists "group_messages_select_member" on public.group_messages;
create policy "group_messages_select_member"
  on public.group_messages
  for select
  to authenticated
  using (
    group_id in (
      select gm.group_id from public.group_members gm where gm.user_id = auth.uid()
    )
  );

-- DELETE: a user can delete their own messages.
drop policy if exists "group_messages_delete_self" on public.group_messages;
create policy "group_messages_delete_self"
  on public.group_messages
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Realtime publication so clients receive live INSERTs.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.group_messages;
    exception
      when duplicate_object then null;
    end;
  end if;
end$$;
