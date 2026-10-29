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
  id?: string;
  owner_user_id: string;
  entry_type: EntryType;
  title: string | null;
  body: string;
  occurred_at: string;
  occurred_timezone: string;
  occurred_precision: 'exact';
};

export async function listEntries(client: SupabaseClient): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('entries')
      .select('id, entry_type, title, body, occurred_at, occurred_timezone, occurred_precision, created_at, updated_at')
      .order('occurred_at', { ascending: false }).order('id').range(offset, offset + 499);
    if (error) throw error;
    entries.push(...(data ?? []) as Entry[]);
    if (!data || data.length < 500) return entries;
  }
}

export async function createEntry(client: SupabaseClient, draft: EntryDraft): Promise<Entry> {
  const { data, error } = await client
    .from('entries')
    .insert(draft)
    .select('id, entry_type, title, body, occurred_at, occurred_timezone, occurred_precision, created_at, updated_at')
    .single();

  if (error?.code === '23505' && draft.id) {
    const result = await client.from('entries')
      .select('id, entry_type, title, body, occurred_at, occurred_timezone, occurred_precision, created_at, updated_at')
      .eq('id', draft.id).single();
    if (!result.error && result.data.body === draft.body && result.data.title === draft.title && result.data.entry_type === draft.entry_type) return result.data as Entry;
  }
  if (error) throw error;
  return data as Entry;
}

export async function deleteEntry(client: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await client.from('entries').delete().eq('id', id).select('id').single();
  if (error) throw error;
  if (!data) throw new Error('Registro não encontrado ou sem permissão.');
}
