import { supabase } from '../lib/supabase-browser';

const status = document.querySelector<HTMLElement>('#reset-status')!;
const form = document.querySelector<HTMLFormElement>('#reset-form')!;
const password = document.querySelector<HTMLInputElement>('#reset-password')!;
const confirm = document.querySelector<HTMLInputElement>('#reset-confirm')!;
const submit = document.querySelector<HTMLButtonElement>('#reset-submit')!;

const fragment = new URLSearchParams(window.location.hash.slice(1));
const query = new URLSearchParams(window.location.search);
const hasRecoveryCredentials = fragment.get('type') === 'recovery'
  || (!!fragment.get('access_token') && !!fragment.get('refresh_token'))
  || !!query.get('code')
  || (!!query.get('token_hash') && query.get('type') === 'recovery');
let recoveryValidated = false;
let processing = false;

function showError(message: string) {
  recoveryValidated = false;
  form.hidden = true;
  status.textContent = message;
}

function showForm() {
  if (recoveryValidated) return;
  recoveryValidated = true;
  form.hidden = false;
  status.textContent = 'Escolha uma nova senha para acessar seu diário.';
  password.focus({ preventScroll: true });
}

async function validateRecovery() {
  if (!supabase) {
    showError('A autenticação não está disponível neste momento. Tente novamente mais tarde.');
    return;
  }
  if (fragment.get('error') || query.get('error')) {
    showError('Este link expirou ou não é válido. Volte ao Diário e solicite um novo e-mail.');
    return;
  }
  if (!hasRecoveryCredentials) {
    showError('Para alterar sua senha, solicite primeiro um link em Entrar → Recuperar senha.');
    return;
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && session) showForm();
  });

  try {
    const tokenHash = query.get('token_hash');
    if (tokenHash && query.get('type') === 'recovery') {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
      if (error) throw error;
    } else if (query.get('code')) {
      const { error } = await supabase.auth.exchangeCodeForSession(query.get('code')!);
      // The browser client may have automatically processed the code before this call.
      if (error) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw error;
      }
    }
    // detectSessionInUrl can complete asynchronously for fragment-based recovery links.
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) {
      showError('Não foi possível validar este link. Solicite um novo e-mail de recuperação.');
      return;
    }
    showForm();
    // Remove the recovery token from the address bar without reloading the page.
    window.history.replaceState(null, '', window.location.pathname);
  } catch {
    showError('Este link é inválido, expirou ou já foi utilizado. Solicite um novo e-mail de recuperação.');
  }
}

confirm.addEventListener('input', () => confirm.setCustomValidity(''));
password.addEventListener('input', () => confirm.setCustomValidity(''));

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!supabase || !recoveryValidated || processing) return;
  confirm.setCustomValidity(password.value === confirm.value ? '' : 'As senhas precisam ser iguais.');
  if (!form.reportValidity()) return;
  processing = true;
  submit.disabled = true;
  password.disabled = confirm.disabled = true;
  status.textContent = 'Salvando sua nova senha…';
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('invalid_session');
    const { error } = await supabase.auth.updateUser({ password: password.value });
    if (error) throw error;
    recoveryValidated = false;
    form.reset();
    form.hidden = true;
    status.textContent = 'Senha atualizada com sucesso! Você já pode entrar no Diário do Universo.';
  } catch {
    status.textContent = 'Não foi possível salvar a nova senha. Verifique se o link ainda é válido e tente novamente.';
  } finally {
    processing = false;
    submit.disabled = false;
    password.disabled = confirm.disabled = false;
  }
});

void validateRecovery();
