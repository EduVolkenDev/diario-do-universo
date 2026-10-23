# Diário do Universo — opções de arquitetura

## Restrições verificadas

- O DU é Astro estático com uma única página e sem backend.
- O PDU é outro produto, atualmente Next + Supabase, com working tree próprio e mudanças não relacionadas.
- O blueprint exige isolamento por usuário, consentimento granular, revogação propagada e integração independente entre apps.
- O target de deploy do DU ainda não foi comprovado; `astro.config.mjs` só declara o site canônico.

## Opção A — continuar estático/local

**Descrição:** manter Astro estático e `localStorage`, adicionando UX, busca em memória, exportação local e melhorias visuais.

**Vantagens:** zero infraestrutura; baixa complexidade; funciona offline; reversível.
**Limites:** não entrega conta, recuperação entre dispositivos, isolamento de usuário, PDU, RAG ou privacidade verificável.
**Uso:** protótipo visual ou demo, não plataforma do blueprint.

## Opção B — Astro com backend próprio do DU e Supabase dedicado (recomendada para F1)

**Descrição:** preservar Astro e o domínio do DU; adicionar um adapter/runtime compatível com o deploy aprovado, endpoints server-side e um projeto/schema Supabase dedicado ao DU. Auth e tabelas não são compartilhadas diretamente com PDU. Entry, revisions, consentimentos e auditoria pertencem ao DU.

**Vantagens:** mantém a base visual; ownership e RLS claros; caminho incremental para busca, exportação, RAG e PDU; separação operacional entre produtos.
**Limites:** exige decisão de hosting, custo, auth e migrações; requer testes de IDOR/RLS e política de backup/purge.
**Decisão necessária:** confirmar se o DU terá projeto Supabase separado, se haverá SSO posterior e qual runtime o domínio aceita.

## Opção C — transformar o DU em frontend/área do PDU

**Descrição:** adicionar a experiência do Diário dentro do stack Next/Supabase existente do PDU ou compartilhar diretamente suas tabelas e identidade.

**Vantagens:** reutilização imediata de auth, RLS, infra e possivelmente Lume/astrologia.
**Limites:** aumenta acoplamento, mistura ciclos de deploy e fronteiras de privacidade, e contradiz a intenção de apps autônomos; não há contrato DU↔PDU pronto comprovado.

**Decisão:** não recomendado como primeiro passo. Pode ser reconsiderado somente com ADR, escopos, audience, revogação, idempotência e aprovação explícita do proprietário.

## Opção D — serviço de integração/eventos entre DU e PDU

**Descrição:** DU e PDU continuam independentes; uma API/gateway versionado troca apenas eventos e objetos consentidos, com JWT audience-scoped, idempotency key, assinatura de webhook e dead-letter queue quando necessário.

**Vantagens:** respeita limites dos produtos; permite “salvar leitura” e deep links sem banco compartilhado; revogação pode ser testada como contrato.
**Limites:** mais componentes e observabilidade; depende de decisões de auth/identidade canônica; não substitui a persistência base do DU.

**Decisão:** usar como F4, depois de Entry/consentimento no DU e contrato aprovado com PDU.

## Recomendação faseada

1. F0: manter esta auditoria como gate.
2. F1: Opção B, mas somente após confirmar hosting, auth e Supabase dedicado.
3. F2: busca/embeddings com ACL herdada do Entry; nada de memória cross-app ainda.
4. F3/F5: conteúdo editorial, sonhos e astrologia determinística em módulos isolados.
5. F4: Opção D para PDU; não importar o banco inteiro.
6. F6: 3D/PWA/escala somente após métricas, acessibilidade e custos comprovados.
