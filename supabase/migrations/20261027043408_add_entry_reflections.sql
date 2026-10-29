-- Apply after 20261020000100_create_diario_entries.sql in the DIARIO project.
-- Append-only: a later reflection corrects or reopens a previous conclusion.
create table public.entry_reflections (
  id uuid primary key,
  entry_id uuid not null references public.entries(id) on delete cascade,
  position integer generated always as identity unique,
  kind text not null check (kind in ('evolution', 'conclusion', 'learning', 'reopened')),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  created_at timestamptz not null default now()
);

create index entry_reflections_entry_position_idx
  on public.entry_reflections(entry_id, position);

alter table public.entry_reflections enable row level security;
revoke all on public.entry_reflections from anon, authenticated;
grant select on public.entry_reflections to authenticated;
grant insert (id, entry_id, kind, body) on public.entry_reflections to authenticated;

create policy "Owners can read their reflections"
  on public.entry_reflections for select to authenticated
  using (exists (
    select 1 from public.entries e
    where e.id = entry_reflections.entry_id
      and e.owner_user_id = (select auth.uid())
  ));

create policy "Owners can add reflections to their entries"
  on public.entry_reflections for insert to authenticated
  with check (exists (
    select 1 from public.entries e
    where e.id = entry_reflections.entry_id
      and e.owner_user_id = (select auth.uid())
  ));

comment on table public.entry_reflections is
  'Private entry timeline. No updates/deletes; deleting the parent erases its history.';
