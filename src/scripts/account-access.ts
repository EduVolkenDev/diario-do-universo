import type { SupabaseClient } from '@supabase/supabase-js';
import { accountError, signupOutcome } from '../lib/account-access';

export function setupAccountAccess(client: SupabaseClient | null) {
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const form = $<HTMLFormElement>('#auth-form');
  const email = $<HTMLInputElement>('#auth-email');
  const password = $<HTMLInputElement>('#auth-password');
  const signup = $<HTMLButtonElement>('#signup');
  const login = $<HTMLButtonElement>('#auth-submit');
  const recover = $<HTMLButtonElement>('#recover-password');
  const existing = $('#existing-account');
  const notice = $('#auth-notice');
  const recoveryForm = $<HTMLFormElement>('#password-recovery-form');
  const newPassword = $<HTMLInputElement>('#new-password');
  const confirmation = $<HTMLInputElement>('#confirm-password');
  const recoverySave = $<HTMLButtonElement>('#password-recovery-save');
  const recoveryNotice = $('#password-recovery-notice');
  let recoveryUserId: string | null = null;
  let blockedEmail: string | null = null;
  let requestBusy = false;
  let updating = false;
  let recoverAfter = 0;

  function reveal() {
    $('#auth-panel').hidden = false;
    $('#auth-toggle').setAttribute('aria-expanded', 'true');
  }

  function restoreControls() {
    email.disabled = requestBusy;
    login.disabled = requestBusy;
    signup.disabled = requestBusy || blockedEmail === email.value.trim().toLowerCase();
    recover.disabled = requestBusy || Date.now() < recoverAfter;
  }

  function showExisting() {
    blockedEmail = email.value.trim().toLowerCase();
    existing.hidden = false;
    notice.textContent = 'Este email já possui uma conta. Entre com sua senha ou escolha Recuperar senha.';
    password.value = '';
    password.autocomplete = 'current-password';
    password.focus();
  }

  email.addEventListener('input', () => {
    if (blockedEmail !== email.value.trim().toLowerCase()) {
      blockedEmail = null;
      existing.hidden = true;
      notice.textContent = '';
    }
    restoreControls();
  });
  $('#existing-account-login').addEventListener('click', () => password.focus());
  signup.addEventListener('click', async () => {
    if (!client || requestBusy || signup.disabled || !form.reportValidity()) return;
    requestBusy = true;
    restoreControls();
    notice.textContent = 'Conferindo seu cadastro…';
    try {
      const { data, error } = await client.auth.signUp({
        email: email.value.trim(), password: password.value,
        options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
      });
      switch (signupOutcome(data, error)) {
        case 'existing': showExisting(); break;
        case 'signed-in': password.value = ''; notice.textContent = 'Conta criada. Seu diário está pronto.'; break;
        case 'confirmation':
          password.value = '';
          notice.textContent = 'Confira seu email para confirmar o cadastro. Se a mensagem não aparecer, verifique spam e promoções.';
          break;
        default: notice.textContent = accountError(error);
      }
    } catch { notice.textContent = 'Não foi possível conferir o cadastro. Verifique sua conexão e tente novamente.'; }
    finally { requestBusy = false; restoreControls(); }
  });

  recover.addEventListener('click', async () => {
    if (!client || requestBusy || recover.disabled) return;
    // Password is deliberately irrelevant to requesting a recovery email.
    if (!email.value.trim() || !email.reportValidity()) {
      notice.textContent = 'Informe seu email para recuperar o acesso.';
      email.focus();
      return;
    }
    const address = email.value.trim();
    requestBusy = true;
    restoreControls();
    notice.textContent = 'Solicitando o email de recuperação…';
    try {
      const { error } = await client.auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      });
      if (error) { notice.textContent = accountError(error); return; }
      notice.textContent = 'Se houver uma conta com este email, você receberá um link para definir uma nova senha. Confira também spam e promoções.';
      recoverAfter = Date.now() + 60_000;
      window.setTimeout(restoreControls, 60_000);
    } catch { notice.textContent = 'Não foi possível solicitar a recuperação. Verifique sua conexão e tente novamente.'; }
    finally { requestBusy = false; restoreControls(); }
  });

  confirmation.addEventListener('input', () => confirmation.setCustomValidity(''));
  newPassword.addEventListener('input', () => confirmation.setCustomValidity(''));
  recoveryForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!client || !recoveryUserId || updating) return;
    confirmation.setCustomValidity(newPassword.value === confirmation.value ? '' : 'As senhas precisam ser iguais.');
    if (!recoveryForm.reportValidity()) return;
    updating = true;
    recoverySave.disabled = true;
    newPassword.disabled = confirmation.disabled = true;
    recoveryNotice.textContent = 'Salvando sua nova senha…';
    const expectedUser = recoveryUserId;
    try {
      const { data, error: userError } = await client.auth.getUser();
      if (userError || data.user?.id !== expectedUser || recoveryUserId !== expectedUser) {
        recoveryNotice.textContent = 'Sua sessão de recuperação expirou. Solicite um novo link.';
        return;
      }
      const { error } = await client.auth.updateUser({ password: newPassword.value });
      if (recoveryUserId !== expectedUser) return;
      if (error) { recoveryNotice.textContent = accountError(error); return; }
      recoveryUserId = null;
      recoveryForm.reset();
      recoveryForm.hidden = true;
      $('.signed-in').hidden = false;
      notice.textContent = 'Senha atualizada. Você já pode continuar no seu diário.';
      $('#auth-toggle').focus();
    } catch { recoveryNotice.textContent = 'Não foi possível salvar a senha. Tente novamente.'; }
    finally {
      updating = false;
      recoverySave.disabled = false;
      newPassword.disabled = confirmation.disabled = false;
    }
  });

  const callback = new URLSearchParams(window.location.hash.slice(1));
  if (callback.get('error_code') === 'otp_expired') {
    reveal();
    notice.textContent = 'Este link expirou ou já foi usado. Informe seu email e escolha Recuperar senha para receber outro.';
  }

  return {
    handleSession(event: string, userId: string | null) {
      if (event === 'PASSWORD_RECOVERY' && userId) {
        recoveryUserId = userId;
        recoveryForm.reset();
        recoveryNotice.textContent = '';
        reveal();
        form.hidden = true;
        $('.signed-in').hidden = true;
        recoveryForm.hidden = false;
        newPassword.focus();
      } else if (!userId || (recoveryUserId && recoveryUserId !== userId)) {
        recoveryUserId = null;
        recoveryForm.reset();
        recoveryForm.hidden = true;
        recoveryNotice.textContent = '';
      } else if (recoveryUserId) {
        // TOKEN_REFRESHED / USER_UPDATED must not hide the recovery form.
        form.hidden = true;
        $('.signed-in').hidden = true;
      }
    },
  };
}
