# Diário do Universo — plano de entrega pós-auditoria

## Gate da Fase 0

Fase 0 está concluída em termos de diagnóstico local. Nenhuma funcionalidade estrutural foi implementada nesta auditoria. O próximo trabalho deve começar somente após aprovação do escopo e das decisões abaixo.

## Decisões necessárias antes de F1

1. O DU terá backend/persistência própria, separado do PDU?
2. Qual ambiente de deploy e runtime Astro serão usados para endpoints server-side?
3. Qual provedor de autenticação será a fonte de identidade do DU? SSO com PDU fica fora de F1.
4. Qual política de retenção, exportação e exclusão vale para registros, revisões e anexos?
5. O primeiro release aceita somente texto ou já precisa de anexos/voz?
6. Quais idiomas e mercados entram no MVP? A base atual é `pt-BR`.

## Sprint 1 proposta — F1 vertical mínima

### CORE-001 — boundary de identidade e autorização

- Arquivos prováveis: configuração de runtime/auth, middleware ou helpers server-side, testes de autorização.
- Entrega: sessão autenticada, `owner_user_id` em toda entidade pessoal, helpers de `getCurrentUser`/authorization, negação explícita sem sessão.
- Testes: usuário A não lê/edita/exclui ID de B; usuário anônimo não acessa dados privados; mensagens não vazam metadados.
- Aceite: nenhuma rota de dados consulta por ID sem owner boundary.

### JRN-001 — Entry persistente com tempo rastreável

- Arquivos prováveis: migration/schema DU, módulo de domínio, API CRUD, composer e testes.
- Entrega: título opcional, body, tipo, `occurred_at`, `created_at` UTC, timezone original, precisão temporal, owner e status; criação, leitura, edição e exclusão.
- Testes: timezone/DST, validação server-side, limites de tamanho, revisão/exclusão e recuperação após reload/dispositivo.
- Aceite: CRUD completo e dados do usuário não dependem de `localStorage` como fonte de verdade.

### JRN-002 — busca literal e filtros básicos

- Dependência: JRN-001.
- Entrega: busca por título/body, tipo e período, com resultado somente do owner; estado vazio, carregando e erro.
- Testes: correspondência exata, ausência de vazamento cross-user, limites e ordenação.

### PRIV-001 — exportação e consentimento mínimo

- Dependência: CORE-001/JRN-001.
- Entrega: exportação aberta dos próprios registros; exclusão com confirmação; preferências que deixem claro que IA/PDU ainda não têm acesso.
- Testes: exportação sem perda dos campos temporais; exclusão remove consulta normal; sem consentimento não há retrieval externo.

### UX/A11Y-001 — decomposição segura da página atual

- Dependência: nenhuma para inspeção; implementar junto ao primeiro CRUD.
- Entrega: separar inline script/CSS em componentes ou módulos somente se a stack escolhida justificar; labels, foco, reduced motion, responsive 320px+ e estados de erro/offline.
- Testes: teclado, leitor de tela, mobile real e `prefers-reduced-motion`.

## Fora do Sprint 1

- Lume, embeddings, IA paga, RAG, grafo, Jardim 3D, astrologia, voz, PDU, cobrança, compartilhamento e deploy público.
- Não adicionar dependências externas antes de justificar licença, custo e necessidade.

## Ordem recomendada

`decisões de hosting/auth` → `CORE-001` → `JRN-001` → `PRIV-001` → `JRN-002` → `UX/A11Y-001` → revisão de segurança → aprovação do próximo sprint.
