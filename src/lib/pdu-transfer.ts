export type PduReading = {
  version: 1;
  app: 'pdu';
  readingId: string;
  occurredAt: string;
  timezone: string;
  locale: 'pt-BR' | 'en';
  question: string;
  spreadLabel: string;
  interpretation: string;
  cards: Array<{ name: string; position: string; reversed: boolean }>;
};

const text = (value: unknown, max: number, allowEmpty = false): value is string =>
  typeof value === 'string' && value.length <= max && (allowEmpty || !!value.trim());

export function parsePduReading(value: unknown): PduReading | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || item.app !== 'pdu' || !text(item.readingId, 120) || !/^[a-zA-Z0-9_-]+$/.test(item.readingId)) return null;
  if (!text(item.occurredAt, 40) || !Number.isFinite(Date.parse(item.occurredAt)) || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(item.occurredAt)) return null;
  if (!text(item.timezone, 80) || !['pt-BR', 'en'].includes(String(item.locale))) return null;
  try { new Intl.DateTimeFormat('pt-BR', {timeZone: item.timezone}); } catch { return null; }
  if (!text(item.question, 2000, true) || !text(item.spreadLabel, 160) || !text(item.interpretation, 20000)) return null;
  if (!Array.isArray(item.cards) || item.cards.length < 1 || item.cards.length > 22) return null;
  const cards: PduReading['cards'] = [];
  for (const card of item.cards) {
    if (!card || !text(card.name, 160) || !text(card.position, 160) || typeof card.reversed !== 'boolean') return null;
    cards.push({ name: card.name, position: card.position, reversed: card.reversed });
  }
  const result: PduReading = {
    version: 1, app: 'pdu', readingId: item.readingId, occurredAt: item.occurredAt,
    timezone: item.timezone, locale: item.locale as PduReading['locale'],
    question: item.question.trim(), spreadLabel: item.spreadLabel.trim(),
    interpretation: item.interpretation.trim(), cards,
  };
  return new TextEncoder().encode(JSON.stringify(result)).length <= 90000 ? result : null;
}

export function sourceKey(reading: PduReading) { return `pdu:${reading.readingId}`; }

export function trustedPduOrigins(extra?: string, development = false): string[] {
  const origins = ['https://palavrasdouniverso.com', 'https://www.palavrasdouniverso.com'];
  if (development && extra) {
    try {
      const url = new URL(extra);
      if (['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:' && url.origin === extra) origins.push(extra);
    } catch { /* Invalid development origins are not trusted. */ }
  }
  return origins;
}

export function isTransferMessage(event: {origin: string; source: unknown; data: unknown}, opener: unknown, nonce: string, origins: string[]) {
  if (!opener || event.source !== opener || !origins.includes(event.origin)) return false;
  const data = event.data as Record<string, unknown> | null;
  return !!data && data.type === 'du:pdu-reading' && data.nonce === nonce && /^[a-f0-9]{32}$/.test(nonce);
}
