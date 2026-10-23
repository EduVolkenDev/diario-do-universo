import type { SupabaseClient } from '@supabase/supabase-js';

export const entryLabels = {
  symbol: 'Símbolo',
  dream: 'Sonho',
  number: 'Número',
  animal: 'Animal',
  color: 'Cor',
  word: 'Palavra',
} as const;

export type EntryType = keyof typeof entryLabels;

export type Entry = {
  id: string;
  entry_type: EntryType;
  title: string | null;
  body: string;
  occurred_at: string;
  occurred_timezone: string;
  occurred_precision: 'exact' | 'approximate' | 'unknown';
  created_at: string;
  updated_at: string;
};

export type EntryDraft = {
  owner_user_id: string;
  entry_type: EntryType;
  title: string | null;
  body: string;
  occurred_at: string;
  occurred_timezone: string;
  occurred_precision: 'exact';
};

export async function listEntries(client: SupabaseClient): Promise<Entry[]> {
  const { data, error } = await client
    .from('entries')
    .select('id, entry_type, title, body, occurred_at, occurred_timezone, occurred_precision, created_at, updated_at')
    .order('occurred_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Entry[];
}

export async function createEntry(client: SupabaseClient, draft: EntryDraft): Promise<Entry> {
  const { data, error } = await client
    .from('entries')
    .insert(draft)
    .select('id, entry_type, title, body, occurred_at, occurred_timezone, occurred_precision, created_at, updated_at')
    .single();

  if (error) throw error;
  return data as Entry;
}

export async function deleteEntry(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('entries').delete().eq('id', id);
  if (error) throw error;
}
