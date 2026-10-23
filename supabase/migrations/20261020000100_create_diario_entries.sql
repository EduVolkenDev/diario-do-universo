create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  entry_type text not null check (entry_type in ('symbol', 'dream', 'number', 'animal', 'color', 'word')),
  title text,
  body text not null check (char_length(trim(body)) > 0),
  occurred_at timestamptz not null default now(),
  occurred_timezone text not null default 'UTC',
  occurred_precision text not null default 'exact' check (occurred_precision in ('exact', 'approximate', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.entries is 'Private Diário do Universo entries, owned by one independent Supabase user.';
comment on column public.entries.owner_user_id is 'The independent Diário account that owns this entry; never inferred from PDU.';

create index if not exists entries_owner_created_at_idx
  on public.entries (owner_user_id, created_at desc);

create index if not exists entries_owner_type_idx
  on public.entries (owner_user_id, entry_type);

alter table public.entries enable row level security;

revoke all on table public.entries from anon;
grant select, insert, update, delete on table public.entries to authenticated;

drop policy if exists "entries_select_own" on public.entries;
create policy "entries_select_own"
  on public.entries for select
  to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own"
  on public.entries for insert
  to authenticated
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists "entries_update_own" on public.entries;
create policy "entries_update_own"
  on public.entries for update
  to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists "entries_delete_own" on public.entries;
create policy "entries_delete_own"
  on public.entries for delete
  to authenticated
  using ((select auth.uid()) = owner_user_id);
