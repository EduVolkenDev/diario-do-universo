# Auth premium — Diário do Universo

## Estrutura definida

O Diário faz parte do **Volynx Universe Share**, na conta Supabase `eduardo@eduardovolken.com`, usando o projeto:

```text
https://vgaqwpkqrjtyumsajjsz.supabase.co
```

Essa integração permanece independente do PDU: o callback `matykrddzfjcswqjanly.supabase.co` pertence ao Palavras do Universo e não deve ser usado aqui.

## Email com a identidade do Diário

O frontend não controla o remetente dos emails do Supabase. Para deixar de receber `SupabaseAuth`, configure no projeto:

1. Em **Authentication → SMTP**, use um SMTP próprio.
2. Defina o nome do remetente como `Diário do Universo`.
3. Use um endereço de envio do domínio oficial, por exemplo `contato@diario.palavrasdouniverso.com`.
4. Em **Authentication → Email Templates**, use os arquivos `supabase/templates/confirmation.html` e `supabase/templates/recovery.html` para os fluxos correspondentes.

O SMTP padrão do Supabase pode limitar a personalização do remetente e dos templates em projetos novos. Isso é uma configuração remota do Auth, não uma variável pública do navegador.

## Google e Apple

Os botões já estão no app e usam `signInWithOAuth`. O cliente Google pode permanecer no projeto Google Cloud **Volynx Auth**, desde que a tela de consentimento use a identidade do Diário do Universo.

Para ativá-los:

1. Ative Google e Apple em **Authentication → Providers**.
2. Crie as credenciais OAuth nos respectivos consoles.
3. Adicione ao Supabase os Client IDs e Secrets.
4. Adicione estes endereços em **Authentication → URL Configuration → Redirect URLs**:
   - `http://127.0.0.1:4322/`
   - `http://localhost:4322/`
   - `https://diario.palavrasdouniverso.com/`

O callback do provedor Google é:

```text
https://vgaqwpkqrjtyumsajjsz.supabase.co/auth/v1/callback
```

Em Google Cloud → OAuth consent screen, use:

```text
App name: Diário do Universo
Support email: eduardo@eduardovolken.com
```

Também configure a marca e o domínio nos consoles Google e Apple para que o consentimento não mostre uma identidade genérica.

## Chave de acesso

O cliente já está preparado para o suporte experimental de passkeys do Supabase. Antes de testar:

1. Ative **Authentication → Passkeys**.
2. Defina o nome exibido como `Diário do Universo`.
3. Use o domínio final como Relying Party ID.
4. Adicione as origens locais e de produção autorizadas.

No primeiro login por email, o usuário poderá escolher **Adicionar chave de acesso**. Depois, poderá entrar diretamente por **Chave de acesso**.

O suporte de passkeys é experimental no Supabase neste momento; manteremos email/OAuth como caminhos de recuperação.
