-- Additive, keeps existing owner RLS policies. No access to the PDU database.
alter table public.entries
  add column source jsonb,
  add column source_key text,
  add constraint entries_pdu_source_check check (
    (source is null and source_key is null) or
    (source is not null and source_key is not null and coalesce(
      jsonb_typeof(source) = 'object' and
      source->>'app' = 'pdu' and source->>'version' = '1' and
      jsonb_typeof(source->'readingId') = 'string' and
      source->>'readingId' ~ '^[a-zA-Z0-9_-]{1,120}$' and
      source_key = 'pdu:' || (source->>'readingId') and
      jsonb_typeof(source->'interpretation') = 'string' and
      char_length(btrim(source->>'interpretation')) between 1 and 20000 and
      jsonb_typeof(source->'cards') = 'array' and
      jsonb_array_length(case when jsonb_typeof(source->'cards') = 'array' then source->'cards' else '[]'::jsonb end) between 1 and 22 and
      octet_length(source::text) <= 100000,
    false))
  );

create unique index entries_owner_source_key_idx
  on public.entries(owner_user_id, source_key);
comment on column public.entries.source is
  'User-confirmed PDU reading snapshot. Not an entitlement or identity proof.';
