import type { SupabaseClient } from '@supabase/supabase-js';
import { entryFields, type Entry } from './entries';
import { parsePduReading, sourceKey, type PduReading } from './pdu-transfer';

export async function importPduReading(client: SupabaseClient, ownerId: string, reading: PduReading, note: string) {
  const source = parsePduReading(reading);
  if (!source || note.length > 5000) throw new Error('Prévia inválida. Envie a leitura novamente pelo PDU.');
  const key = sourceKey(source);
  const { data, error } = await client.from('entries').insert({
    owner_user_id: ownerId, entry_type: 'symbol',
    title: (source.question || `Leitura · ${source.spreadLabel}`).slice(0, 160),
    body: source.interpretation + (note.trim() ? `\n\nMeu olhar ao guardar\n${note.trim()}` : ''),
    occurred_at: source.occurredAt, occurred_timezone: source.timezone, occurred_precision: 'exact',
    source, source_key: key,
  }).select(entryFields).single();
  if (!error) return { entry: data as Entry, duplicate: false };
  if (error.code === '23505') {
    const existing = await client.from('entries').select(entryFields)
      .eq('owner_user_id', ownerId).eq('source_key', key).single();
    if (!existing.error && existing.data) return { entry: existing.data as Entry, duplicate: true };
  }
  throw error;
}
