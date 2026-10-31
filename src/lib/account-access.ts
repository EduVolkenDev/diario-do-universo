export function signupOutcome(data: { user: { identities?: unknown[] } | null; session: unknown }, error: { code?: string } | null) {
  if (error) return ['user_already_exists', 'email_exists'].includes(error.code ?? '') ? 'existing' : 'error';
  if (data.session) return 'signed-in';
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return 'existing';
  return data.user ? 'confirmation' : 'error';
}

export function accountError(error: { code?: string } | null) {
  switch (error?.code) {
    case 'invalid_credentials': return 'Email ou senha incorretos. Confira seus dados ou escolha Recuperar senha.';
    case 'email_not_confirmed': return 'Confirme seu email antes de entrar. Confira a mensagem de confirmação, inclusive na pasta de spam.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Muitas solicitações em pouco tempo. Aguarde alguns minutos antes de tentar novamente.';
    case 'email_address_not_authorized': return 'O serviço de email ainda não está liberado para este endereço. Entre em contato com o suporte do Diário.';
    case 'weak_password': return 'Escolha uma senha mais forte, combinando letras, números e símbolos.';
    case 'same_password': return 'Escolha uma senha diferente da anterior.';
    case 'otp_expired':
    case 'session_expired':
    case 'session_not_found': return 'Este link expirou ou já foi usado. Solicite um novo email de recuperação.';
    default: return 'Não foi possível concluir agora. Tente novamente em alguns instantes.';
  }
}
