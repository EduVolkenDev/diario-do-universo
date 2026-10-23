# Diário do Universo — riscos e perguntas abertas

## Riscos priorizados

| Prioridade | Risco | Evidência/impacto | Mitigação antes de implementação |
|---|---|---|---|
| P0 | Dados locais não são uma conta | `localStorage` em `src/pages/index.astro:29,42-43`; perda ao trocar de dispositivo/perfil | Definir auth + owner + persistência server-side antes de prometer privacidade |
| P0 | IDOR futuro | Não há autorização nem API hoje | Fazer CORE-001 antes de qualquer endpoint; testar A/B |
| P0 | Compartilhar banco/PDU por atalho | PDU tem Supabase/auth, mas contrato DU↔PDU não foi localizado | Projetos separados, contrato versionado e consentimento granular |
| P0 | Working tree contaminado | DU e PDU possuem mudanças não commitadas | Staging explícito; não resetar, commitar ou publicar sem aprovação |
| P1 | Deploy/runtime desconhecido | Astro tem apenas `site` configurado | Confirmar host, adapter, env, rollback e preview |
| P1 | Dados temporais insuficientes | Só `createdAt` UTC é salvo | Modelar data de ocorrência, TZ e precisão; testar DST |
| P1 | IA alucinar memória ou reforçar crenças | Lume ainda não existe; produto trata símbolos/sincronicidade | ACL + evidence IDs + resposta “não encontrei registros suficientes” + evals |
| P1 | Conteúdo cultural sem curadoria | Atlas/Caminhos não existem | Governança, fontes, revisão e limites de conteúdo restrito |
| P1 | Asset pesado/licença incerta | Logo celestial ~2.8 MB; origem/licença não documentada | Confirmar licença, gerar variantes/otimização e lazy strategy |
| P2 | Acessibilidade incompleta | Alt/labels básicos; sem matriz WCAG/mobile/reduced-motion | QA automatizado + manual por fluxo, fallback sem 3D |
| P2 | Escopo grande demais | Blueprint contém seis fases e vários sistemas | Entregar slices verticais e gates de aprovação |
| P2 | Lockfile/stack divergente do commit | Working tree atualizou Astro 5→7 | Confirmar se upgrade é intencional antes de estabilizar CI |

## Perguntas bloqueadoras

1. A persistência do DU deve usar um projeto Supabase próprio ou existe outro backend aprovado?
2. O domínio `diario.palavrasdouniverso.com` é o target atual? Quem controla o deploy e qual runtime é permitido?
3. O login do DU será independente no MVP? SSO com PDU fica explicitamente para F4?
4. O usuário pode usar o Diário sem conta como modo local, e como a migração para conta funcionaria?
5. Qual é a política de exclusão: hard delete, soft delete com purge, backups e prazo de retenção?
6. Há licença/aprovação para `diario-do-universo-celestial.webp`, `diario-do-universo-logo-test.webp` e `bg-1.jpg`?
7. O MVP precisa de anexos, áudio/voz e localização, ou texto basta para F1?
8. Quais dados do PDU poderão ser importados, com quais escopos e por quanto tempo ficam retidos?
9. Qual provedor/modelo de IA e orçamento serão aceitos para Lume? Há requisito de residência de dados?
10. A perspectiva secular deve aparecer no onboarding e nos filtros de interpretação? O blueprint recomenda que sim.
11. Quem revisará conteúdo de tradições vivas, restritas ou culturalmente sensíveis?
12. Quais métricas éticas serão coletadas sem enviar texto privado para analytics?

## Dependências externas não confirmadas

- Contrato de identidade canônica entre DU e PDU.
- Endpoint/event bus para `reading.linked`, `reading.unlinked`, `consent.granted` e `consent.revoked`.
- Política de exclusão de embeddings/cache/grafo e backups.
- Motor de efemérides, licença e versão suportada.
- Provedor de busca/embeddings e política de retenção.
