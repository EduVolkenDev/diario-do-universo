import { createEntry, deleteEntry, entryLabels, listEntries, type Entry, type EntryType } from '../lib/entries';
import { supabase } from '../lib/supabase-browser';

const title = document.querySelector<HTMLInputElement>('#title');
const body = document.querySelector<HTMLTextAreaElement>('#body');
const occurredAt = document.querySelector<HTMLInputElement>('#occurred-at');
const save = document.querySelector<HTMLButtonElement>('#save');
const notice = document.querySelector<HTMLElement>('#notice');
const entriesElement = document.querySelector<HTMLElement>('#entries');
const count = document.querySelector<HTMLElement>('#count');
const symbols = document.querySelector<HTMLElement>('#symbols');
const authPanel = document.querySelector<HTMLElement>('#auth-panel');
const authToggle = document.querySelector<HTMLButtonElement>('#auth-toggle');
const authForm = document.querySelector<HTMLFormElement>('#auth-form');
const authEmail = document.querySelector<HTMLInputElement>('#auth-email');
const authPassword = document.querySelector<HTMLInputElement>('#auth-password');
const authSubmit = document.querySelector<HTMLButtonElement>('#auth-submit');
const signup = document.querySelector<HTMLButtonElement>('#signup');
const oauthGoogle = document.querySelector<HTMLButtonElement>('#oauth-google');
const oauthApple = document.querySelector<HTMLButtonElement>('#oauth-apple');
const passkeySignin = document.querySelector<HTMLButtonElement>('#passkey-signin');
const signout = document.querySelector<HTMLButtonElement>('#signout');
const registerPasskey = document.querySelector<HTMLButtonElement>('#register-passkey');
const authNotice = document.querySelector<HTMLElement>('#auth-notice');
const signedIn = document.querySelector<HTMLElement>('.signed-in');
const signedInLabel = document.querySelector<HTMLElement>('#signed-in-label');
const sessionBadge = document.querySelector<HTMLElement>('#session-badge');
const welcomePanel = document.querySelector<HTMLElement>('#welcome-panel');

let selectedType: EntryType = 'symbol';
let entries: Entry[] = [];

function esc(value: string | null | undefined) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function showNotice(message: string, target = notice) {
  if (target) target.textContent = message;
}

function render() {
  if (!entriesElement || !count || !symbols) return;
  count.textContent = String(entries.length);
  symbols.innerHTML = [...new Set(entries.map((entry) => entryLabels[entry.entry_type]))].slice(0, 8).map((item) => `<span>${esc(item)}</span>`).join('');
  entriesElement.innerHTML = entries.length
    ? entries.map((entry) => `<article class="entry"><div><small>✦ ${esc(entryLabels[entry.entry_type])}</small><h3>${esc(entry.title || 'Sem título')}</h3></div><time datetime="${esc(entry.occurred_at)}">${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(entry.occurred_at))}</time><p>${esc(entry.body)}</p><button class="entry-delete" data-delete-entry="${esc(entry.id)}" type="button">apagar</button></article>`).join('')
    : '<div class="empty">✦<p>Seu primeiro registro ainda está esperando para ser guardado.</p></div>';
  entriesElement.querySelectorAll<HTMLButtonElement>('[data-delete-entry]').forEach((button) => button.addEventListener('click', () => removeEntry(button.dataset.deleteEntry ?? '')));
}

function updateComposer() {
  if (!save || !body) return;
  save.disabled = !supabase || !body.value.trim();
}

async function refreshEntries() {
  if (!supabase) {
    entries = [];
    render();
    return;
  }
  try {
    entries = await listEntries(supabase);
    render();
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Não foi possível carregar seus registros.');
  }
}

async function removeEntry(id: string) {
  if (!supabase || !id || !window.confirm('Apagar este registro?')) return;
  try {
    await deleteEntry(supabase, id);
    entries = entries.filter((entry) => entry.id !== id);
    render();
    showNotice('Registro apagado.');
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Não foi possível apagar este registro.');
  }
}

function toggleAuthPanel() {
  if (authPanel?.hasAttribute('hidden')) authPanel.removeAttribute('hidden');
  else authPanel?.setAttribute('hidden', '');
  authPanel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setSignedOut() {
  authToggle?.replaceChildren(document.createTextNode('Entrar'));
  authForm?.removeAttribute('hidden');
  signedIn?.setAttribute('hidden', '');
  if (supabase && authNotice && !authNotice.textContent) authNotice.textContent = 'Sua sessão local não está ativa. Entre novamente para acessar seu diário.';
  sessionBadge?.classList.remove('ready');
  if (sessionBadge) sessionBadge.textContent = 'entre para guardar';
  if (save) save.disabled = true;
  welcomePanel?.setAttribute('hidden', '');
  entries = [];
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

async function signInWithProvider(provider: 'google' | 'apple') {
  if (!supabase) return;
  showNotice(`Abrindo ${provider === 'google' ? 'Google' : 'Apple'}…`, authNotice);
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
  });
  if (error) showNotice(error.message, authNotice);
}

async function signInWithPasskey() {
  if (!supabase) return;
  passkeySignin?.setAttribute('disabled', '');
  showNotice('Aguardando sua chave de acesso…', authNotice);
  const { error } = await supabase.auth.signInWithPasskey();
  if (error) showNotice(error.message, authNotice);
  passkeySignin?.removeAttribute('disabled');
}

async function addPasskey() {
  if (!supabase) return;
  registerPasskey?.setAttribute('disabled', '');
  showNotice('Registrando sua chave de acesso…', authNotice);
  const { error } = await supabase.auth.registerPasskey();
  showNotice(error ? error.message : 'Chave de acesso adicionada ao seu diário.', authNotice);
  registerPasskey?.removeAttribute('disabled');
}

document.querySelectorAll<HTMLButtonElement>('[data-entry-type]').forEach((button) => button.addEventListener('click', () => {
  selectedType = (button.dataset.entryType ?? 'symbol') as EntryType;
  document.querySelectorAll('[data-entry-type]').forEach((item) => item.classList.toggle('active', item === button));
  const typeLabel = document.querySelector('#type-label');
  if (typeLabel) typeLabel.textContent = entryLabels[selectedType];
}));

title?.addEventListener('input', updateComposer);
body?.addEventListener('input', updateComposer);
if (occurredAt) occurredAt.value = localDateTimeValue();

save?.addEventListener('click', async () => {
  if (!supabase || !body?.value.trim()) return;
  save.disabled = true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Entre na sua conta para guardar este registro.');
    await createEntry(supabase, {
      owner_user_id: user.id,
      entry_type: selectedType,
      title: title?.value.trim() || null,
      body: body.value.trim(),
      occurred_at: occurredAt?.value ? new Date(occurredAt.value).toISOString() : new Date().toISOString(),
      occurred_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      occurred_precision: 'exact',
    });
    if (title) title.value = '';
    body.value = '';
    if (occurredAt) occurredAt.value = localDateTimeValue();
    await refreshEntries();
    showNotice('Guardado no seu diário.');
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Não foi possível guardar este registro.');
  } finally {
    updateComposer();
  }
});

authToggle?.addEventListener('click', toggleAuthPanel);
sessionBadge?.addEventListener('click', toggleAuthPanel);

document.querySelectorAll<HTMLButtonElement>('[data-quick-type]').forEach((button) => button.addEventListener('click', () => {
  const quickType = button.dataset.quickType as EntryType | undefined;
  if (!quickType) return;
  selectedType = quickType;
  document.querySelectorAll('[data-entry-type]').forEach((item) => item.classList.toggle('active', item.getAttribute('data-entry-type') === quickType));
  const typeLabel = document.querySelector('#type-label');
  if (typeLabel) typeLabel.textContent = entryLabels[quickType];
  if (title) title.value = button.dataset.quickTitle ?? '';
  body?.focus();
  document.querySelector('.composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  updateComposer();
}));

authForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase || !authEmail?.value || !authPassword?.value) return;
  authSubmit?.setAttribute('disabled', '');
  showNotice('Entrando…', authNotice);
  const { error } = await supabase.auth.signInWithPassword({ email: authEmail.value.trim(), password: authPassword.value });
  if (error) showNotice(error.message, authNotice);
  else showNotice('Você voltou para o seu diário.', authNotice);
  authSubmit?.removeAttribute('disabled');
});

signup?.addEventListener('click', async () => {
  if (!supabase || !authEmail?.value || !authPassword?.value) {
    showNotice('Preencha email e senha para criar sua conta.', authNotice);
    return;
  }
  signup.setAttribute('disabled', '');
  const { error, data } = await supabase.auth.signUp({ email: authEmail.value.trim(), password: authPassword.value });
  showNotice(error ? error.message : data.session ? 'Conta criada. Seu diário está pronto.' : 'Conta criada. Verifique seu email para confirmar o acesso.', authNotice);
  signup.removeAttribute('disabled');
});

oauthGoogle?.addEventListener('click', () => void signInWithProvider('google'));
oauthApple?.addEventListener('click', () => void signInWithProvider('apple'));
passkeySignin?.addEventListener('click', () => void signInWithPasskey());
registerPasskey?.addEventListener('click', () => void addPasskey());

signout?.addEventListener('click', async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
  showNotice('Você saiu do Diário do Universo.', authNotice);
});

if (!supabase) {
  showNotice('A conexão segura ainda não foi configurada neste ambiente. Copie .env.example para .env.local e adicione a chave publicável do Supabase.', authNotice);
  authPanel?.removeAttribute('hidden');
} else {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      setSignedIn(session.user.email);
      void refreshEntries();
    } else setSignedOut();
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      setSignedIn(session.user.email);
      void refreshEntries();
    } else setSignedOut();
  });
}

updateComposer();
render();
