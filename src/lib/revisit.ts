import type { Entry } from './entries';
import { journeyOf, type Reflection, type JourneyStatus } from './journey';

const day = 86_400_000;
export type Revisit = { entry: Entry; status: JourneyStatus; daysSince: number; prompt: string };

export function revisitCandidates(entries: readonly Entry[], reflections: readonly Reflection[], now = new Date()): Revisit[] {
  const groups = new Map<string, Reflection[]>();
  for (const reflection of reflections) {
    const group = groups.get(reflection.entry_id) ?? [];
    group.push(reflection);
    groups.set(reflection.entry_id, group);
  }
  const candidates: Revisit[] = [];
  for (const entry of entries) {
    const history = groups.get(entry.id) ?? [];
    const { status } = journeyOf(history);
    // Use actual saved activity: backdating a new signal must not immediately
    // turn it into an old, neglected record. Future/invalid dates are excluded.
    const timestamps = [entry.created_at, entry.updated_at, ...history.map(item => item.created_at)].map(value => new Date(value).getTime());
    if (timestamps.some(value => !Number.isFinite(value))) continue;
    const daysSince = Math.floor((now.getTime() - Math.max(...timestamps)) / day);
    if (daysSince < 7) continue;
    const prompt = status === 'learned' ? 'Onde esse aprendizado encontrou lugar na sua vida?' : status === 'concluded' ? 'Essa conclusão ainda faz sentido para você hoje?' : history.length ? 'O que mudou desde a sua última reflexão?' : 'O que você percebe hoje que não percebia naquele momento?';
    candidates.push({ entry, status, daysSince, prompt });
  }
  const order = (status: JourneyStatus) => status === 'open' ? 0 : 1;
  return candidates.sort((a, b) => order(a.status) - order(b.status) || b.daysSince - a.daysSince || a.entry.id.localeCompare(b.entry.id));
}

export function dailyRevisit(candidates: readonly Revisit[], localDay: string): Revisit | undefined {
  if (!candidates.length) return undefined;
  const preferred = candidates.filter(item => item.status === candidates[0].status);
  let hash = 0;
  for (const character of localDay) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return preferred[hash % preferred.length];
}
