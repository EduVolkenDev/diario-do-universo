# Sprint 1 — Diário do Universo

## O que entrou

- Login independente por email e senha usando Supabase Auth.
- Registros privados por usuário com tipo, título opcional, texto, data/hora, fuso e precisão.
- Leitura, criação e exclusão protegidas por RLS.
- Estado visual claro para conta desconectada e conectada.
- Logo celestial grande, sem moldura ou background adicional.

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Preencha `PUBLIC_SUPABASE_PUBLISHABLE_KEY` com a chave publicável do projeto `vgaqwpkqrjtyumsajjsz`, pertencente ao Volynx Universe Share.
3. Execute `npm run dev`.

Depois de criar ou alterar `.env.local`, reinicie o servidor Astro. As variáveis públicas são incorporadas pelo Vite durante a inicialização.

Sessões do Supabase ficam vinculadas ao endereço local. `http://localhost:4322` e `http://127.0.0.1:4322` são origens diferentes; uma sessão criada em uma não aparece automaticamente na outra. Se o projeto ou a chave publicável mudou, também é esperado entrar novamente.

O endereço público do site deve ser adicionado em Supabase Auth → URL Configuration. Para o desenvolvimento local, inclua `http://127.0.0.1:4322/` e `http://localhost:4322/` nos Redirect URLs.

## Banco

A migração está em `supabase/migrations/20261020000100_create_diario_entries.sql`. Ela cria `public.entries`, índices, grants e políticas RLS que só permitem a cada usuário ler e alterar os próprios registros.

Neste ambiente, o conector administrativo do Supabase recusou leitura e aplicação remota por falta de permissão. Por isso a migração foi versionada localmente, mas ainda precisa ser aplicada no SQL Editor ou via CLI autenticada do projeto antes do primeiro cadastro real.
