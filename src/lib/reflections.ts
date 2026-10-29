import type { SupabaseClient } from '@supabase/supabase-js';
import { validateReflection, type Reflection, type ReflectionKind } from './journey';

const fields = 'id, entry_id, position, kind, body, created_at';

export async function listReflections(client: SupabaseClient): Promise<Reflection[]> {
  const reflections: Reflection[] = [];
  // Do not silently truncate a person's history at the API's default row limit.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('entry_reflections').select(fields)
      .order('position').range(offset, offset + 499);
    if (error) throw error;
    reflections.push(...(data ?? []) as Reflection[]);
    if (!data || data.length < 500) return reflections;
  }
}

export async function addReflection(client: SupabaseClient, draft: {
  id: string; entry_id: string; kind: ReflectionKind; body: string;
}): Promise<Reflection> {
  const problem = validateReflection(draft.kind, draft.body);
  if (problem) throw new Error(problem);
  const { data, error } = await client.from('entry_reflections')
    .insert({ ...draft, body: draft.body.trim() }).select(fields).single();
  if (!error) return data as Reflection;
  // A network timeout can happen after the server accepted a write. Retry the
  // same draft ID, not a new event. RLS also protects this recovery read.
  if (error.code === '23505') {
    const existing = await client.from('entry_reflections').select(fields).eq('id', draft.id).single();
    if (!existing.error && existing.data.entry_id === draft.entry_id &&
        existing.data.kind === draft.kind && existing.data.body === draft.body.trim()) {
      return existing.data as Reflection;
    }
  }
  throw error;
}
