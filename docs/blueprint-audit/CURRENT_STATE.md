# Diário do Universo — estado atual verificado

Data da auditoria: 2026-10-20
Escopo: repositório local `/Users/eduardovolkenair/diario-do-universo` e evidência local disponível do repositório Palavras do Universo.
Método: inspeção somente leitura, build local e fluxo manual no navegador local. O conteúdo do blueprint foi tratado como estado-alvo, não como prova de implementação.

## Repositório e entrega

- Branch efetiva: `main`.
- `HEAD`: `72378a3 chore: ignore local Astro output`.
- `origin`: `https://github.com/EduVolkenDev/diario-do-universo.git`.
- Branch local e `origin/main` apontam para o mesmo commit no início da auditoria.
- Working tree já estava sujo antes da auditoria: `package.json`, `package-lock.json`, `src/pages/index.astro`, `.DS_Store` e `public/` aparecem como modificados/não rastreados. Essas alterações foram preservadas.
- Não há tags nem outras branches locais relevantes.
- Não há configuração de deploy além de `site: 'https://diario.palavrasdouniverso.com'` em `astro.config.mjs:3-5`. O domínio foi apenas configurado como metadata do Astro; publicação não foi comprovada.

## Stack e estrutura

- Astro `^7.4.0`, TypeScript strict herdado de `astro/tsconfigs/strict` (`package.json:6-13`, `tsconfig.json:1-5`).
- Uma página Astro estática: `src/pages/index.astro`.
- Apenas scripts `dev`, `build` e `preview` (`package.json:6-10`); não há lint, test, typecheck dedicado, e2e ou migração.
- Não há componentes, layouts, API routes, server adapter, middleware, workers, banco, ORM ou camada de domínio no repositório.
- CSS e JavaScript estão inline na página (`src/pages/index.astro:48-56` e `:28-44`).
- Assets locais: `public/assets/bg-1.jpg`, `diario-do-universo-celestial.webp` e `diario-do-universo-logo-test.webp`. As duas logos são WebP com alpha; a imagem celestial tem 2884×2884 e aproximadamente 2.8 MB.

## Rotas e UI verificadas

Há somente `/`, renderizada por `src/pages/index.astro:20-27`:

1. Topbar com nome do app e nota “um app independente”.
2. Hero com logo celestial, título “O que chamou sua atenção hoje?” e subtítulo sobre sinais/sincronicidades (`:22-23`).
3. Composer “Novo registro” com seis tipos: símbolo, sonho, número, animal, cor e palavra (`:2-9`, `:24`).
4. Coleção com contador, chips derivados do título e lista de registros (`:25`).
5. Bridge textual mencionando futura relação com Palavras do Universo (`:26`).

Não há navegação de primeiro nível, login, onboarding, páginas de detalhe, busca, filtros, Atlas, Caminhos, Observatório, Jardim, Constelações, Lume, preferências ou privacidade.

## Comportamento e persistência

- O título e o corpo são obrigatórios para habilitar o botão (`:39-41`).
- Selecionar um tipo muda apenas o tipo em memória e o rótulo visual (`:32`, `:40`).
- Salvar cria `{ type, title, body, createdAt, symbols }`, limita a 100 itens e grava JSON na chave fixa `diario_do_universo_entries` (`:29`, `:42`).
- Recuperação lê o mesmo `localStorage` no carregamento (`:43`).
- `createdAt` é sempre gerado no navegador em UTC via `toISOString()`, mas o produto não armazena timezone original, precisão do horário, data de ocorrência ou histórico de edição.
- `esc()` escapa conteúdo antes de inserir HTML (`:37-38`), reduzindo o risco de injeção no render atual.
- Não existe edição, exclusão, exportação, anexo, rascunho, autosave, busca, filtro, sincronização ou recuperação entre dispositivos.

## Evidências executadas

- `git diff --check`: passou.
- `npm run build`: passou; uma rota estática `/index.html` foi gerada.
- `npm run`: confirmou ausência de scripts de teste/lint.
- Navegador local isolado em `http://127.0.0.1:4322/`: título e `lang="pt-BR"` corretos; logo com `alt="Diário do Universo Celestial"`; console sem erros/warnings.
- Fluxo manual: preenchimento de título/corpo habilitou “Guardar registro →”; salvar exibiu “Guardado neste dispositivo.” e um registro; recarregar recuperou o registro. Isso comprova somente persistência local no mesmo perfil de navegador.
- Seleção de “Sonho” atualizou o rótulo para “Sonho”.
- No viewport verificado de 1280 px, `body.scrollWidth` não excedeu a largura do viewport. Validação mobile ainda não foi comprovada nesta auditoria.

## Segurança, privacidade e integração

- Não há autenticação, identificação de usuário, owner, autorização, tenant isolation, RLS, API, banco ou servidor no DU.
- `localStorage` é acessível por qualquer script da mesma origem e não é um mecanismo de conta, backup ou controle de privacidade.
- Não há consentimento para IA, memória, compartilhamento, PDU, analytics, anexos ou exportação.
- Não há Lume, RAG, embeddings, grafo, citações, fontes editoriais ou validação de groundedness.
- Existe um checkout local do PDU em `/Users/eduardovolkenair/palavras-do-universo`, com Next `^16.2.11`, Supabase, `astronomy-engine` e APIs próprias. O checkout do PDU também estava sujo; não foi modificado. A busca realizada não encontrou um contrato implementado de DU↔PDU, deep link ou evento `reading.linked` para ser reutilizado diretamente.
- O PDU contém infraestrutura real de auth/Supabase e documentos de integração, mas isso não prova que o DU possa consumir a infraestrutura nem autoriza compartilhar banco, secrets ou usuários.

## Classificação resumida

| Área | Estado | Evidência |
|---|---|---|
| Shell/hero visual | IMPLEMENTED | `src/pages/index.astro:21-26`, build e navegador |
| Captura local mínima | PARTIAL | `src/pages/index.astro:28-43` |
| CRUD completo | MISSING | sem edição/exclusão/exportação |
| Conta e autorização | MISSING | nenhuma auth/API/owner |
| Persistência multi-dispositivo | MISSING | somente `localStorage` |
| Busca/filtros | MISSING | sem código de busca |
| Privacidade/consentimento | MISSING | sem modelos ou UI |
| Atlas/conteúdo pluralista | MISSING | sem conteúdo/fontes |
| Lume/RAG | MISSING | sem IA, retrieval ou citações |
| Constelações/Jardim | MISSING | sem grafo ou progressão |
| Astrologia verificável | MISSING | sem motor ou dados |
| Integração PDU | UNKNOWN / NÃO CONTRATADA | PDU existe localmente; contrato DU↔PDU não localizado |
| Testes automatizados | MISSING | nenhum script/teste no DU |
| Deploy publicado | UNKNOWN | config de site presente; publicação não verificada |
