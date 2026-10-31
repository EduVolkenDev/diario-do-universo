import type { SupabaseClient } from '@supabase/supabase-js';
import { friendlyDataError } from '../lib/journey';
import { importPduReading } from '../lib/pdu-import';
import { isTransferMessage, parsePduReading, trustedPduOrigins, type PduReading } from '../lib/pdu-transfer';
import type { Entry } from '../lib/entries';

const cacheKey = 'du:pdu-preview:v1';
const lifetime = 30 * 60 * 1000;

export function setupPduImport(options: {
  client: SupabaseClient | null;
  openAuth: () => void;
  saved: (entry: Entry) => void;
}) {
  const panel = document.querySelector<HTMLElement>('#pdu-import');
  if (!panel) {
    const banner = document.querySelector<HTMLElement>('#pdu-pending');
    let boundOwner: string | null = null;
    let previousOwner: string | null = null;
    let expiry: number | undefined;
    const discard = () => { window.clearTimeout(expiry); try { window.sessionStorage.removeItem(cacheKey); } catch { /* Unavailable. */ } if (banner) banner.hidden = true; };
    try {
      const raw = window.sessionStorage.getItem(cacheKey);
      if (raw && raw.length <= 120000) {
        const cached = JSON.parse(raw);
        if (parsePduReading(cached.reading) && Number.isFinite(cached.receivedAt) && cached.receivedAt <= Date.now() && Date.now() - cached.receivedAt < lifetime) {
          if (banner) banner.hidden = false;
          boundOwner = typeof cached.owner === 'string' ? cached.owner : null;
          expiry = window.setTimeout(discard, lifetime - (Date.now() - cached.receivedAt));
        } else discard();
      }
    } catch { discard(); }
    document.querySelector('#pdu-pending-discard')?.addEventListener('click', discard);
    return { handleOwner(next: string | null) {
      if ((previousOwner && previousOwner !== next) || (boundOwner && next && boundOwner !== next)) discard();
      previousOwner = next;
    } };
  }
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.querySelector<T>(id)!;
  const status = $('#pdu-import-status');
  const preview = $('#pdu-import-preview');
  const actions = $('#pdu-import-actions');
  const note = $<HTMLTextAreaElement>('#pdu-import-note');
  const save = $<HTMLButtonElement>('#pdu-import-save');
  const cancel = $<HTMLButtonElement>('#pdu-import-cancel');
  let reading: PduReading | null = null;
  let receivedAt = 0;
  let owner: string | null = null;
  let boundOwner: string | null = null;
  let epoch = 0;
  let busy = false;
  let received = false;
  let existingId: string | null = null;
  const origins = trustedPduOrigins(panel.dataset.pduOrigin, panel.dataset.development === 'true');
  const nonce = new URLSearchParams(window.location.hash.slice(1)).get('pdu') ?? '';
  const opener = window.opener;
  let handshake: number | undefined;
  let expiry: number | undefined;

  function expire() {
    if (!reading) return;
    if (busy) { expiry = window.setTimeout(expire, 1000); return; }
    clear();
    status.textContent = 'A prévia expirou. Envie novamente a leitura pelo PDU.';
  }
  function scheduleExpiry() {
    window.clearTimeout(expiry);
    expiry = window.setTimeout(expire, Math.max(0, lifetime - (Date.now() - receivedAt)));
  }

  function clearCache() { try { window.sessionStorage.removeItem(cacheKey); } catch { /* Unavailable storage. */ } }
  function persist() {
    if (!reading) return;
    try { window.sessionStorage.setItem(cacheKey, JSON.stringify({reading, receivedAt, note:note.value, owner:boundOwner})); }
    catch { status.textContent = 'Prévia recebida. Mantenha esta aba aberta: este navegador não permite preservar a prévia durante um redirecionamento de login.'; }
  }
  function controls() {
    save.disabled = busy || !reading || !!existingId;
    cancel.disabled = busy;
    note.disabled = busy;
    save.textContent = busy ? 'Guardando leitura…' : existingId ? 'Leitura já guardada' : owner ? 'Confirmar e guardar leitura' : 'Entrar para guardar';
  }
  function clear() {
    window.clearTimeout(expiry);
    reading = null;
    existingId = null;
    note.value = '';
    received = true;
    preview.replaceChildren();
    preview.hidden = actions.hidden = true;
    clearCache();
    controls();
  }
  function show() {
    if (!reading) return;
    preview.replaceChildren();
    const title = document.createElement('h2');
    title.textContent = reading.question || reading.spreadLabel;
    const date = document.createElement('p');
    date.className = 'field-hint';
    date.textContent = `${reading.spreadLabel} · ${new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:reading.timezone}).format(new Date(reading.occurredAt))}`;
    const cards = document.createElement('ul');
    cards.className = 'pdu-reading-cards';
    for (const card of reading.cards) {
      const item = document.createElement('li');
      item.textContent = `${card.position} · ${card.name}${card.reversed ? ' (reversa)' : ''}`;
      cards.append(item);
    }
    const details = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Conferir o texto da leitura';
    const text = document.createElement('p'); text.textContent = reading.interpretation;
    details.append(summary, text);
    preview.append(title, date, cards, details);
    preview.hidden = actions.hidden = false;
    status.textContent = 'Confira a leitura e escolha o que deseja guardar na sua conta do Diário.';
    controls();
  }

  try {
    const raw = window.sessionStorage.getItem(cacheKey);
    if (raw && raw.length <= 120000) {
      const cached = JSON.parse(raw);
      const parsed = parsePduReading(cached.reading);
      if (parsed && Number.isFinite(cached.receivedAt) && cached.receivedAt <= Date.now() && Date.now() - cached.receivedAt < lifetime && typeof cached.note === 'string' && cached.note.length <= 5000) {
        reading = parsed; receivedAt = cached.receivedAt; note.value = cached.note; received = true;
        boundOwner = typeof cached.owner === 'string' ? cached.owner : null;
        show(); scheduleExpiry();
      } else clearCache();
    } else if (raw) clearCache();
  } catch { clearCache(); }

  window.addEventListener('message', event => {
    if (!isTransferMessage(event, opener, nonce, origins)) return;
    if (received) return;
    const parsed = parsePduReading(event.data.reading);
    if (!parsed) { status.textContent = 'Não foi possível conferir essa leitura. Volte ao PDU e envie novamente.'; return; }
    received = true;
    reading = parsed;
    boundOwner = owner;
    receivedAt = Date.now();
    if (handshake !== undefined) window.clearInterval(handshake);
    show(); persist(); scheduleExpiry();
    opener.postMessage({type:'du:pdu-received',nonce}, event.origin);
  });

  if (!received && opener && /^[a-f0-9]{32}$/.test(nonce)) {
    let attempts = 0;
    const request = () => {
      for (const origin of origins) opener.postMessage({type:'du:pdu-ready',nonce}, origin);
      attempts++;
      if (attempts >= 20) {
        window.clearInterval(handshake);
        if (!reading) status.textContent = 'A leitura não chegou. Volte à aba do PDU e toque em Guardar no Diário novamente.';
      }
    };
    request();
    handshake = window.setInterval(request, 750);
  } else if (!received) {
    status.textContent = 'Abra uma leitura no Palavras do Universo e escolha Guardar no Diário para conferir a prévia aqui.';
  }
  note.addEventListener('input', persist);
  cancel.addEventListener('click', () => {
    if (note.value.trim() && !window.confirm('Descartar esta prévia e a reflexão ainda não guardada?')) return;
    if (handshake !== undefined) window.clearInterval(handshake);
    clear();
    status.textContent = 'Prévia descartada. A leitura original continua no PDU.';
  });
  save.addEventListener('click', async () => {
    if (!reading || busy || existingId || !options.client) return;
    if (Date.now() - receivedAt >= lifetime) { clear(); status.textContent = 'A prévia expirou. Envie novamente a leitura pelo PDU.'; return; }
    if (!owner) { options.openAuth(); return; }
    const capturedOwner = owner;
    const capturedEpoch = epoch;
    busy = true; controls();
    status.textContent = 'Guardando na sua conta do Diário…';
    try {
      const {data, error} = await options.client.auth.getUser();
      if (error || data.user?.id !== capturedOwner || owner !== capturedOwner) throw new Error('Sessão alterada.');
      const result = await importPduReading(options.client, capturedOwner, reading, note.value);
      if (epoch !== capturedEpoch) return;
      options.saved(result.entry);
      if (result.duplicate && note.value.trim()) {
        existingId = result.entry.id;
        persist();
        status.textContent = 'Esta leitura já está guardada. Sua nova anotação continua nesta prévia e não foi adicionada ao registro. Abra o histórico para acrescentá-la como uma evolução.';
      } else {
        clear();
        status.textContent = result.duplicate ? 'Esta leitura já está guardada. Abra o histórico para acrescentar novas percepções; o registro anterior foi preservado.' : 'Leitura guardada. Ela agora faz parte do seu caminho e poderá voltar pela Revisita.';
      }
      const open = $<HTMLAnchorElement>('#pdu-import-open');
      open.href = `#entry-${result.entry.id}`;
      open.hidden = false;
      open.focus();
    } catch (error) {
      if (epoch === capturedEpoch) status.textContent = friendlyDataError(error, 'Não foi possível guardar a leitura. Sua prévia continua aqui; tente novamente.');
    } finally { if (epoch === capturedEpoch) { busy = false; controls(); } }
  });

  return {
    handleOwner(next: string | null) {
      if ((owner && owner !== next) || (boundOwner && next && boundOwner !== next)) {
        epoch++; busy = false; clear();
        $('#pdu-import-open').hidden = true;
        status.textContent = 'A conta mudou e a prévia foi descartada. Envie a leitura novamente para guardar em outra conta.';
      }
      owner = next;
      if (reading && next) { boundOwner = next; persist(); }
      controls();
    },
  };
}
