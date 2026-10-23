# Diário do Universo — gap analysis

O blueprint é uma proposta de target state. As decisões abaixo usam somente o estado verificado em `CURRENT_STATE.md` e o conteúdo do blueprint; não tratam intenção como funcionalidade existente.

## Matriz de lacunas

| Requisito do blueprint | Estado atual | Gap | Direção recomendada |
|---|---|---|---|
| Início/Meu Universo Hoje | Uma tela de captura e coleção | Faltam recentes, retomada, estados offline/erro e personalização controlável | Reestruturar a home depois de definir o modelo de Entry |
| Meu Diário com CRUD | Criação local sem edição/exclusão | Sem entidade persistente, revisões, data de ocorrência, TZ, tags e anexos | Construir Entry + EntryRevision + metadata temporal; começar sem anexos |
| Busca literal e filtros | Inexistente | Não há índice nem UI | Implementar busca server-side após persistência e autorização |
| Privacidade/exportação | Não existe; localStorage apenas | Sem owner, consentimento, exportação ou purge | Definir política e autorização antes do schema final |
| Autorização por usuário | Inexistente | Risco de perda de dados e, futuramente, IDOR se API nascer sem boundary | CORE-001 deve preceder qualquer API de dados |
| Atlas com fontes | Inexistente | Falta conteúdo, provenance e governança | Começar com pequeno dataset editorial versionado, não com IA livre |
| Constelações | Inexistente | Faltam nós, arestas evidenciadas, aprovação e fallback lista | Modelar evidência antes de visualização; 2D/lista antes de 3D |
| Caminhos/Meu Caminho | Inexistente | Falta CMS/pipeline editorial e progresso voluntário | Definir modelo de conteúdo e revisão antes da UI |
| Jardim Cósmico | Inexistente | Faltam eventos aprovados, opt-out e alternativa textual | Adiar até F1/F2 estabilizarem eventos e preferências |
| Portal dos Sonhos | Só o tipo “Sonho” | Sem captura específica, recorrência, voz, interpretação múltipla | Evoluir depois do Entry base; voz é progressive enhancement |
| Observatório/Astrologia | Inexistente | Falta motor determinístico, TZ/DST e consentimento de nascimento | Reutilizar `astronomy-engine` do PDU somente após contrato/licença aprovados |
| Lume/RAG | Inexistente | Sem provider, escopos, retrieval, citações, retenção ou evals | Lume só depois de ACL, evidência e consentimento; sem memória implícita |
| PDU | Bridge textual futuro | Sem contrato, auth compartilhada ou consentimentos | Interface versionada e eventos idempotentes; não compartilhar banco por atalho |
| Acessibilidade | Labels/alt básicos presentes; estados são simples | Sem auditoria WCAG, mobile comprovado, reduced motion, navegação complexa | Criar critérios a11y e QA por fluxo; preservar fallback 2D/lista |
| Testes | Build manual | Sem unit/integration/e2e/a11y/security | Introduzir testes junto ao primeiro slice persistente, não depois |
| Observabilidade | Inexistente | Sem erros redigidos, auditoria ou custo IA | Definir eventos técnicos sem conteúdo privado antes de APIs externas |
| Deploy | `site` configurado | Ambiente, adaptador e domínio não comprovados | Confirmar target e rollback antes de escolher SSR/serverless |

## Contradições e cuidados imediatos

1. O blueprint pede registros privados por usuário, mas o DU atual é deliberadamente estático e local. Migrar diretamente para uma integração do PDU resolveria infraestrutura, mas criaria acoplamento e risco de compartilhar dados sem contrato.
2. O PDU tem Supabase e auth local, mas nenhum achado autoriza o DU a reutilizar seu schema ou secrets. A dependência deve ser registrada como interface futura.
3. A promessa de “sincronicidades” precisa continuar subjetiva e não determinista na copy e na IA. O texto atual é de marketing; qualquer Lume deve distinguir observação, tradição e hipótese.
4. A logo celestial pesa aproximadamente 2.8 MB. Antes de produção, é necessário definir otimização, variantes responsivas e licença/origem do asset.
5. O working tree contém mudanças locais não relacionadas à auditoria. Qualquer implementação posterior deve separar arquivos explicitamente e nunca fazer stage amplo.

## Decisão de escopo sugerida

Não implementar F2–F6 agora. O próximo slice deve ser uma F1 mínima, reversível e testável: autenticação/owner boundary, persistência de Entry com data/hora original + UTC/TZ, CRUD, busca literal e exportação. Somente depois devem entrar embeddings, Lume, PDU ou visualizações derivadas.
