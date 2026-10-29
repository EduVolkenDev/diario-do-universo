import { createEntry, deleteEntry, entryLabels, listEntries, type Entry, type EntryType } from '../lib/entries';
import { supabase } from '../lib/supabase-browser';
import { addReflection, listReflections } from '../lib/reflections';
import { friendlyDataError, type Reflection } from '../lib/journey';
import { createJourneyView } from './journey';

const title = document.querySelector<HTMLInputElement>('#title');
const body = document.querySelector<HTMLTextAreaElement>('#body');
const occurredAt = document.querySelector<HTMLInputElement>('#occurred-at');
const save = document.querySelector<HTMLButtonElement>('#save');
const notice = document.querySelector<HTMLElement>('#notice');
const authPanel = document.querySelector<HTMLElement>('#auth-panel');
const authToggle = document.querySelector<HTMLButtonElement>('#auth-toggle');
const authForm = document.querySelector<HTMLFormElement>('#auth-form');
const authEmail = document.querySelector<HTMLInputElement>('#auth-email');
const authPassword = document.querySelector<HTMLInputElement>('#auth-password');
const authSubmit = document.querySelector<HTMLButtonElement>('#auth-submit');
const signup = document.querySelector<HTMLButtonElement>('#signup');
const oauthGoogle = document.querySelector<HTMLButtonElement>('#oauth-google');
const oauthFacebook = document.querySelector<HTMLButtonElement>('#oauth-facebook');
const oauthApple = document.querySelector<HTMLButtonElement>('#oauth-apple');
const passkeySignin = document.querySelector<HTMLButtonElement>('#passkey-signin');
const signout = document.querySelector<HTMLButtonElement>('#signout');
const registerPasskey = document.querySelector<HTMLButtonElement>('#register-passkey');
const authNotice = document.querySelector<HTMLElement>('#auth-notice');
const signedIn = document.querySelector<HTMLElement>('.signed-in');
const signedInLabel = document.querySelector<HTMLElement>('#signed-in-label');
const sessionBadge = document.querySelector<HTMLElement>('#session-badge');
const welcomePanel = document.querySelector<HTMLElement>('#welcome-panel');
const garden = document.querySelector<HTMLElement>('#garden');
const gardenStars = document.querySelector<HTMLElement>('#garden-stars');
const gardenEmpty = document.querySelector<HTMLElement>('#garden-empty');
const gardenStart = document.querySelector<HTMLButtonElement>('#garden-start');
const gardenCount = document.querySelector<HTMLElement>('#garden-count');
const gardenPeriod = document.querySelector<HTMLSelectElement>('#garden-period');
const gardenInsights = document.querySelector<HTMLElement>('#garden-insights');

let selectedType: EntryType = 'symbol';
let entries: Entry[] = [];
let gardenTypeFilter: EntryType | 'all' = 'all';
let ownerId: string | null = null;
let reflections: Reflection[] = [];
let loading = false;
let entriesError = '';
let reflectionsError = '';
let requestVersion = 0;
let savingEntry = false;
let entryRetry: { signature: string; id: string; occurredAt: string } | null = null;
const journeyView = createJourneyView({
  save: draft => {
    if (!supabase || !ownerId) throw new Error('Entre para guardar.');
    return addReflection(supabase, draft);
  },
  saved: reflection => {
    reflections = [...reflections.filter(item => item.id !== reflection.id), reflection];
    render();
  },
  remove: removeEntry,
  retry: () => void refreshEntries(),
});

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function showNotice(message: string, target = notice) {
  if (target) target.textContent = message;
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function render() {
  journeyView.update({ ownerId, entries, reflections, loading, entriesError, reflectionsError });
  renderGarden();
}

function renderGarden() {
  if (!garden || !gardenStars || !gardenEmpty || !gardenCount || !gardenInsights) return;
  gardenStars.replaceChildren();
  const periodDays = gardenPeriod?.value === 'all' ? null : Number(gardenPeriod?.value);
  const periodStart = periodDays ? Date.now() - periodDays * 24 * 60 * 60 * 1000 : null;
  const visibleEntries = entries.filter((entry) => {
    const matchesType = gardenTypeFilter === 'all' || entry.entry_type === gardenTypeFilter;
    const matchesPeriod = periodStart === null || new Date(entry.occurred_at).getTime() >= periodStart;
    return matchesType && matchesPeriod;
  });
  gardenEmpty.hidden = visibleEntries.length > 0;
  const unavailable = loading || !!entriesError;
  garden.classList.toggle('has-signals', visibleEntries.length > 0);
  gardenCount.textContent = unavailable ? 'Aguardando registros' : `${visibleEntries.length} ${visibleEntries.length === 1 ? 'sinal' : 'sinais'}`;
  const emptyTitle = document.querySelector('#garden-empty-title');
  const emptyDescription = document.querySelector('#garden-empty-description');
  if (emptyTitle) emptyTitle.textContent = loading ? 'Reunindo seus sinais…' : entriesError ? 'Seu jardim aguarda a conexão.' : entries.length ? 'Nenhum sinal neste recorte.' : 'Seu jardim começa com um sinal.';
  if (emptyDescription) emptyDescription.textContent = unavailable ? 'Seus registros aparecerão aqui quando a coleção estiver disponível.' : entries.length ? 'Experimente outro tema ou amplie o período para reencontrar seus sinais.' : 'Esta árvore inspira o seu espaço. Os sinais que você guardar aparecerão aqui como pontos para revisitar.';
  if (gardenStart) { gardenStart.hidden = unavailable; gardenStart.textContent = entries.length ? 'Ver todos os sinais' : 'Acender meu jardim →'; }
  const caption = document.querySelector('#garden-caption');
  if (caption) caption.textContent = visibleEntries.length ? `Toque em um ponto para abrir seu histórico.${visibleEntries.length > 24 ? ' Mostrando os 24 sinais mais recentes deste recorte; a coleção reúne todos.' : ''}` : '';
  renderGardenInsights(visibleEntries);

  visibleEntries.slice(0, 24).forEach((entry, index) => {
    const star = document.createElement('button');
    // Space touch targets without overlap, even on narrow screens. Small offsets
    // keep the composition organic while maintaining a predictable focus order.
    const x = 15 + (index % 4) * 23 + (index % 2 ? 2 : -2);
    const y = 13 + Math.floor(index / 4) * 14 + (index % 3 - 1) * 2;
    const size = 8 + ((index * 3) % 7);
    star.type = 'button';
    star.className = `garden-star garden-star-${entry.entry_type}`;
    star.style.setProperty('--star-x', `${x}%`);
    star.style.setProperty('--star-y', `${y}%`);
    star.style.setProperty('--star-size', `${size}px`);
    star.setAttribute('aria-label', `Abrir ${entryLabels[entry.entry_type]}: ${entry.title || 'Sem título'}`);
    star.title = entry.title || entryLabels[entry.entry_type];
    star.addEventListener('click', () => {
      journeyView.open(entry.id);
    });
    gardenStars.append(star);
  });
}

function renderGardenInsights(visibleEntries: Entry[]) {
  if (!gardenInsights) return;
  gardenInsights.replaceChildren();
  if (visibleEntries.length < 2) {
    gardenInsights.hidden = true;
    return;
  }

  const typeCounts = new Map<EntryType, number>();
  const monthCounts = new Map<string, number>();
  const stopWords = new Set(['para', 'como', 'mais', 'esse', 'essa', 'isso', 'quando', 'porque', 'sobre', 'uma', 'com', 'que', 'dos', 'das', 'nos', 'nas', 'por', 'pelo', 'pela', 'seu', 'sua', 'não', 'não', 'foi', 'era', 'the', 'and']);
  const wordCounts = new Map<string, number>();

  visibleEntries.forEach((entry) => {
    typeCounts.set(entry.entry_type, (typeCounts.get(entry.entry_type) ?? 0) + 1);
    const date = new Date(entry.occurred_at);
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
    new Set(`${entry.title ?? ''} ${entry.body}`.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((word) => word.length >= 4 && !stopWords.has(word))).forEach((word) => wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1));
  });

  const top = <T,>(counts: Map<T, number>) => [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topType = top(typeCounts);
  const topMonth = top(monthCounts);
  const topWord = [...wordCounts.entries()].filter(([, value]) => value > 1).sort((a, b) => b[1] - a[1])[0];
  const insights: Array<[string, string]> = [
    topType ? ['um fio que retorna', `${entryLabels[topType[0]]} aparece ${topType[1]} vezes`] : ['um fio que retorna', 'os sinais estão se abrindo'],
    topMonth ? ['um tempo que se abriu', `${topMonth[0]} reuniu ${topMonth[1]} sinais`] : ['um tempo que se abriu', 'o tempo começa a formar um ritmo'],
    topWord ? ['uma palavra em órbita', `“${topWord[0]}” em ${topWord[1]} registros`] : ['um céu em formação', `${visibleEntries.length} sinais formando seu céu`],
  ];

  insights.forEach(([label, text]) => {
    const card = document.createElement('div');
    card.className = 'garden-insight';
    const cardLabel = document.createElement('span');
    cardLabel.className = 'garden-insight-label';
    cardLabel.textContent = label;
    const cardText = document.createElement('strong');
    cardText.textContent = text;
    card.append(cardLabel, cardText);
    gardenInsights.append(card);
  });
  gardenInsights.hidden = false;
}

document.querySelectorAll<HTMLButtonElement>('[data-garden-filter]').forEach((button) => button.addEventListener('click', () => {
  const filter = button.dataset.gardenFilter;
  gardenTypeFilter = filter === 'all' ? 'all' : (filter as EntryType);
  document.querySelectorAll('[data-garden-filter]').forEach((item) => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  renderGarden();
}));

gardenPeriod?.addEventListener('change', renderGarden);

function updateComposer() {
  if (!save || !body) return;
  save.disabled = !supabase || !body.value.trim() || savingEntry;
  save.textContent = savingEntry ? 'Guardando…' : ownerId ? 'Guardar registro →' : 'Entrar para guardar →';
}

async function refreshEntries() {
  if (!supabase || !ownerId) return;
  const version = ++requestVersion;
  loading = true;
  entriesError = '';
  reflectionsError = '';
  render();
  try {
    const [entryResult, reflectionResult] = await Promise.allSettled([listEntries(supabase), listReflections(supabase)]);
    if (version !== requestVersion) return;
    if (entryResult.status === 'fulfilled') entries = entryResult.value;
    else entriesError = friendlyDataError(entryResult.reason, 'Não foi possível carregar seus registros. Tente novamente.');
    if (reflectionResult.status === 'fulfilled') reflections = reflectionResult.value;
    else reflectionsError = friendlyDataError(reflectionResult.reason, 'Não foi possível abrir as evoluções. Tente carregar novamente.');
  } catch (error) {
    if (version === requestVersion) entriesError = 'A conexão foi interrompida. Tente novamente.';
  } finally {
    if (version === requestVersion) { loading = false; render(); }
  }
}

async function removeEntry(id: string) {
  if (!supabase || !ownerId || !id || !window.confirm('Apagar este registro e todas as suas evoluções e aprendizados? Esta ação não pode ser desfeita.')) return;
  const requestedBy = ownerId;
  try {
    await deleteEntry(supabase, id);
    if (ownerId !== requestedBy) return;
    entries = entries.filter((entry) => entry.id !== id);
    reflections = reflections.filter(item => item.entry_id !== id);
    render();
    showNotice('Registro apagado.');
  } catch (error) {
    if (ownerId === requestedBy) showNotice(friendlyDataError(error, 'Não foi possível apagar este registro.'), document.querySelector('#collection-notice'));
  }
}

function toggleAuthPanel() {
  if (authPanel?.hasAttribute('hidden')) authPanel.removeAttribute('hidden');
  else authPanel?.setAttribute('hidden', '');
  authToggle?.setAttribute('aria-expanded', String(!authPanel?.hidden));
  authPanel?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
}

function setSignedOut() {
  if (ownerId) {
    if (title) title.value = '';
    if (body) body.value = '';
    entryRetry = null;
  }
  ownerId = null;
  requestVersion++;
  loading = false;
  reflections = [];
  entriesError = reflectionsError = '';
  authToggle?.replaceChildren(document.createTextNode('Entrar'));
  authForm?.removeAttribute('hidden');
  signedIn?.setAttribute('hidden', '');
  if (signedInLabel) signedInLabel.textContent = '';
  if (authPassword) authPassword.value = '';
  if (supabase && authNotice && !authNotice.textContent) authNotice.textContent = 'Entre para acessar seu diário pessoal.';
  sessionBadge?.classList.remove('ready');
  if (sessionBadge) sessionBadge.textContent = 'entre para guardar';
  if (save) save.disabled = true;
  welcomePanel?.setAttribute('hidden', '');
  entries = [];
  updateComposer();
  render();
}

function setSignedIn(email: string | undefined) {
  authToggle?.replaceChildren(document.createTextNode('Minha conta'));
  authForm?.setAttribute('hidden', '');
  signedIn?.removeAttribute('hidden');
  if (signedInLabel) signedInLabel.textContent = email ? `Conectado como ${email}` : 'Conectado ao seu diário.';
  sessionBadge?.classList.add('ready');
  if (sessionBadge) sessionBadge.textContent = 'diário conectado';
  welcomePanel?.removeAttribute('hidden');
  const firstName = email?.split('@')[0]?.split(/[._-]/)[0];
  const welcomeTitle = document.querySelector<HTMLElement>('#welcome-title');
  if (welcomeTitle) welcomeTitle.textContent = firstName ? `O universo deixou um sinal para você, ${firstName}?` : 'O universo deixou um sinal para você?';
  updateComposer();
}

async function signInWithProvider(provider: 'google' | 'facebook' | 'apple') {
  if (!supabase) return;
  const providerLabel = provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : 'Apple';
  const button = provider === 'google' ? oauthGoogle : provider === 'facebook' ? oauthFacebook : oauthApple;
  await authAction(button, async () => {
    showNotice(`Abrindo ${providerLabel}…`, authNotice);
    const { error } = await supabase!.auth.signInWithOAuth({
      provider, options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (error) showNotice(error.message, authNotice);
  });
}

async function authAction(button: HTMLButtonElement | null, action: () => Promise<void>) {
  if (button?.disabled) return;
  if (button) button.disabled = true;
  try { await action(); }
  catch { showNotice('Não foi possível concluir a conexão. Tente novamente.', authNotice); }
  finally { if (button) button.disabled = false; }
}

async function signInWithPasskey() {
  if (!supabase) return;
  await authAction(passkeySignin, async () => {
    showNotice('Aguardando sua chave de acesso…', authNotice);
    const { error } = await supabase!.auth.signInWithPasskey();
    if (error) showNotice(error.message, authNotice);
  });
}

async function addPasskey() {
  if (!supabase) return;
  await authAction(registerPasskey, async () => {
    showNotice('Registrando sua chave de acesso…', authNotice);
    const { error } = await supabase!.auth.registerPasskey();
    showNotice(error ? error.message : 'Chave de acesso adicionada ao seu diário.', authNotice);
  });
}

document.querySelectorAll<HTMLButtonElement>('[data-entry-type]').forEach((button) => button.addEventListener('click', () => {
  selectedType = (button.dataset.entryType ?? 'symbol') as EntryType;
  document.querySelectorAll('[data-entry-type]').forEach((item) => { item.classList.remove('list-active'); item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  const typeLabel = document.querySelector('#type-label');
  if (typeLabel) typeLabel.textContent = entryLabels[selectedType];
}));

title?.addEventListener('input', updateComposer);
body?.addEventListener('input', updateComposer);
if (occurredAt) occurredAt.value = localDateTimeValue();

save?.addEventListener('click', async () => {
  if (!supabase || !body?.value.trim() || savingEntry) return;
  if (!ownerId) { openAuth(); return; }
  if (occurredAt && !occurredAt.reportValidity()) return;
  const requestedBy = ownerId;
  const draftType = selectedType;
  const draftTitle = title?.value.trim() || null;
  const draftBody = body.value.trim();
  const signature = JSON.stringify([requestedBy, selectedType, title?.value.trim(), body.value.trim(), occurredAt?.value]);
  if (entryRetry?.signature !== signature) entryRetry = { signature, id: crypto.randomUUID(), occurredAt: occurredAt?.value ? new Date(occurredAt.value).toISOString() : new Date().toISOString() };
  savingEntry = true;
  body.disabled = true;
  if (title) title.disabled = true;
  if (occurredAt) occurredAt.disabled = true;
  const draftId = entryRetry.id;
  const draftOccurredAt = entryRetry.occurredAt;
  save.disabled = true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Entre na sua conta para guardar este registro.');
    if (user.id !== requestedBy) throw new Error('Sua conta mudou. Revise o registro antes de guardar.');
    await createEntry(supabase, {
      id: draftId,
      owner_user_id: user.id,
      entry_type: draftType,
      title: draftTitle,
      body: draftBody,
      occurred_at: draftOccurredAt,
      occurred_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      occurred_precision: 'exact',
    });
    if (ownerId !== requestedBy) return;
    entryRetry = null;
    if (title) title.value = '';
    body.value = '';
    if (occurredAt) occurredAt.value = localDateTimeValue();
    await refreshEntries();
    if (ownerId === requestedBy) showNotice(entriesError ? 'Registro guardado, mas não foi possível atualizar a coleção. Use “Tentar carregar novamente”.' : 'Guardado no seu diário.');
  } catch (error) {
    if (ownerId === requestedBy) showNotice(friendlyDataError(error, 'Não foi possível guardar. Seu texto continua aqui; tente novamente.'));
  } finally {
    savingEntry = false;
    body.disabled = false;
    if (title) title.disabled = false;
    if (occurredAt) occurredAt.disabled = false;
    updateComposer();
  }
});

authToggle?.addEventListener('click', toggleAuthPanel);
sessionBadge?.addEventListener('click', toggleAuthPanel);
function openAuth() {
  if (authPanel) authPanel.hidden = false;
  authToggle?.setAttribute('aria-expanded', 'true');
  authPanel?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
  authEmail?.focus({ preventScroll: true });
}
gardenStart?.addEventListener('click', () => {
  if (entries.length) {
    gardenTypeFilter = 'all';
    if (gardenPeriod) gardenPeriod.value = 'all';
    document.querySelectorAll<HTMLElement>('[data-garden-filter]').forEach(item => { const active = item.dataset.gardenFilter === 'all'; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
    renderGarden();
  } else if (ownerId) {
    body?.focus();
    document.querySelector('#composer')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  } else openAuth();
});

document.querySelectorAll<HTMLButtonElement>('[data-quick-type]').forEach((button) => button.addEventListener('click', () => {
  const quickType = button.dataset.quickType as EntryType | undefined;
  if (!quickType) return;
  selectedType = quickType;
  document.querySelectorAll('[data-entry-type]').forEach((item) => { const active = item.getAttribute('data-entry-type') === quickType; item.classList.remove('list-active'); item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  const typeLabel = document.querySelector('#type-label');
  if (typeLabel) typeLabel.textContent = entryLabels[quickType];
  if (title && !title.value.trim()) title.value = button.dataset.quickTitle ?? '';
  body?.focus();
  document.querySelector('.composer')?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
  updateComposer();
}));

authForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase || !authEmail?.value || !authPassword?.value) return;
  await authAction(authSubmit, async () => {
    showNotice('Entrando…', authNotice);
    const { error } = await supabase!.auth.signInWithPassword({ email: authEmail.value.trim(), password: authPassword.value });
    if (error) showNotice(error.message, authNotice);
    else { authPassword.value = ''; showNotice('Você voltou para o seu diário.', authNotice); }
  });
});

signup?.addEventListener('click', async () => {
  if (!authForm?.reportValidity()) return;
  if (!supabase || !authEmail?.value || !authPassword?.value) {
    showNotice('Preencha email e senha para criar sua conta.', authNotice);
    return;
  }
  await authAction(signup, async () => {
    const { error, data } = await supabase!.auth.signUp({ email: authEmail.value.trim(), password: authPassword.value });
    showNotice(error ? error.message : data.session ? 'Conta criada. Seu diário está pronto.' : 'Conta criada. Verifique seu email para confirmar o acesso.', authNotice);
    if (!error) authPassword.value = '';
  });
});

oauthGoogle?.addEventListener('click', () => void signInWithProvider('google'));
oauthFacebook?.addEventListener('click', () => void signInWithProvider('facebook'));
oauthApple?.addEventListener('click', () => void signInWithProvider('apple'));
passkeySignin?.addEventListener('click', () => void signInWithPasskey());
registerPasskey?.addEventListener('click', () => void addPasskey());

signout?.addEventListener('click', async () => {
  if (!supabase) return;
  if (savingEntry) { showNotice('Aguarde o registro terminar de ser guardado.', authNotice); return; }
  if (body?.value.trim() && !window.confirm('Sair e descartar o registro ainda não guardado?')) return;
  await authAction(signout, async () => {
    const { error } = await supabase!.auth.signOut();
    showNotice(error ? 'Não foi possível sair. Tente novamente.' : 'Você saiu do Diário do Universo.', authNotice);
  });
});

if (!supabase) {
  showNotice('A conexão segura ainda não foi configurada neste ambiente. Copie .env.example para .env.local e adicione a chave publicável do Supabase.', authNotice);
  authPanel?.removeAttribute('hidden');
} else {
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      const changed = ownerId !== session.user.id;
      if (changed) {
        if (ownerId) { if (title) title.value = ''; if (body) body.value = ''; entryRetry = null; }
        entries = []; reflections = []; entriesError = reflectionsError = ''; requestVersion++;
      }
      ownerId = session.user.id;
      setSignedIn(session.user.email);
      if (changed || _event === 'INITIAL_SESSION') {
        loading = true;
        render();
        // Leave the auth callback before making authenticated API requests.
        window.setTimeout(() => void refreshEntries(), 0);
      }
    } else setSignedOut();
  });
}

document.querySelectorAll<HTMLElement>('[data-garden-filter]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.gardenFilter === 'all')));
window.addEventListener('beforeunload', event => { if (body?.value.trim() || savingEntry) event.preventDefault(); });

updateComposer();
render();
