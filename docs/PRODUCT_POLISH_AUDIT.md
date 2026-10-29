# Diário do Universo — revisão de produto e polimento

Implementação e banco verificados em 27/10/2026. Testes locais repetidos em 29/10/2026.

## Entrega

O caminho de cada registro agora pode continuar depois do primeiro relato. Em **Revisitar e evoluir**, a pessoa pode acrescentar uma evolução, concluir o assunto, guardar um aprendizado ou reabri-lo com um novo olhar. O texto original permanece na linha do tempo. A seção **O que ficou** reúne a conclusão ou o aprendizado atual e permite abrir o histórico completo. Ao reabrir, o cartão sai dessa seleção, mas permanece no histórico.

Um assunto é representado pelo título e pelo conteúdo do registro. Não foi criada uma taxonomia paralela de assuntos nem agrupamento automático entre registros diferentes.

## Problemas encontrados e tratados

| Achado | Resultado |
| --- | --- |
| Ausência de tabela de registros no projeto remoto | Migração base aplicada no Volynx Universe Share correto. |
| Ausência de evolução e encerramento de um sinal | Histórico persistente e estados em aberto, concluído e aprendizado. |
| Estilos Astro não alcançavam elementos criados pelo JavaScript | Estilos da home extraídos para arquivos CSS que também alcançam cartões, pontos e linha do tempo dinâmicos. |
| Bloco base de CSS duplicado | Duplicação removida na extração. |
| `display:flex/grid` podia sobrepor `hidden` | Regra explícita para estados ocultos. |
| Jardim absoluto com altura mínima fixa cortava o estado vazio | Ilustração e texto agora participam do fluxo; composição empilhada em telas estreitas. |
| Pontos do Jardim pequenos para toque | Alvos de 44px, espaçamento e abertura direta do histórico. |
| Jardim perdia sua identidade visual ao receber registros | Árvore preservada ao fundo dos pontos, com opacidade discreta. |
| Filtro sem resultados parecia uma coleção nunca iniciada | Mensagem própria e ação para limpar os filtros. |
| CTA do Jardim levava ao login mesmo com sessão | Usuário conectado segue para escrever; visitante abre o acesso. |
| Listagem podia parar no limite padrão da API | Leitura paginada de registros e evoluções. |
| Erros de rede podiam deixar botões de acesso bloqueados | Recuperação de estado com `finally` e mensagens de retorno. |
| Respostas atrasadas podiam restaurar dados depois de sair/trocar de conta | Verificação de versão/conta e limpeza de dados exibidos. |
| Repetir uma gravação após timeout podia duplicar o conteúdo | IDs estáveis por tentativa e recuperação da gravação já aceita. |
| Coleção sem busca nem estado do assunto | Busca sem diferença de acentos, incluindo evoluções, e filtro por momento. |

Também foram acrescentados atalhos de navegação, rótulos visíveis nos campos, foco visível, estado de carregamento, nova tentativa e respeito à preferência por movimento reduzido. A logo, o subtítulo aprovado e a escolha de botão verde/roxo com borda branca foram preservados.

## Arquivos principais

- `src/pages/index.astro`: navegação, busca, seção O que ficou e diálogo do histórico.
- `src/scripts/app.ts`: integração com conta, coleção, Jardim e estados de rede.
- `src/scripts/journey.ts`: coleção filtrável, linha do tempo e formulário de evolução.
- `src/lib/journey.ts`: regras de estado e validação.
- `src/lib/reflections.ts`: leitura e gravação de evoluções.
- `src/lib/entries.ts`: paginação, repetição segura e confirmação de exclusão.
- `src/styles/diary.css` e `src/styles/journey.css`: estilos da home e do novo fluxo.
- `supabase/migrations/20261027043408_add_entry_reflections.sql`: histórico e políticas de acesso.
- `tests/`: regras de negócio, DOM, integração com adaptador simulado e migrações em Postgres local (PGlite).

As dependências de teste são apenas de desenvolvimento. O adaptador simulado não entra no bundle do aplicativo.

## Verificação realizada

- `npm test`: 11 testes aprovados, incluindo conclusão, aprendizado, reabertura, busca em evoluções, falhas com preservação de texto, repetição com mesmo ID e troca de conta durante requisição.
- `npm run typecheck`: aprovado.
- `npm run build`: quatro páginas geradas, aprovado em 27/10 e novamente na finalização.
- `git diff --check`: aprovado.
- `npm audit`: sem vulnerabilidades reportadas na verificação de 27/10. Não equivale a uma auditoria de segurança exaustiva.
- Migrações executadas em Postgres local com testes de isolamento entre contas, restrições, histórico sem sobrescrita e exclusão em cascata.
- No banco real, teste transacional aprovado para criação/leitura pelo dono, bloqueio de leitura/gravação por outra conta, bloqueio de alteração da evolução e limpeza em cascata. Transação revertida e zero registros de teste remanescentes.
- RLS ativo nas duas tabelas, com políticas vinculadas ao usuário autenticado e à propriedade do registro original.
- Consultas REST sem sessão às duas tabelas retornaram `401 / 42501`, conforme os grants privados.

## Pendências e limites

1. **Revisão visual no navegador:** bloqueada porque o uso local de navegador está desativado nas configurações do Work. O DOM foi testado com jsdom; layout, foco nativo do diálogo, rolagem, teclado virtual e transições ainda precisam de conferência real em desktop, tablet e celular. Não há screenshots desta entrega.
2. **Fluxo autenticado no site publicado:** não foi testado de ponta a ponta nesta entrega. O banco real e a integração DOM com adaptador simulado foram testados separadamente.
3. **Publicação da interface:** autorizada pelo usuário em 29/10/2026. As duas migrações de banco já foram aplicadas remotamente. A entrega da interface segue por commit no GitHub e deploy do diretório `dist` no projeto Cloudflare Pages `diario-do-universo`, vinculado a `diario.palavrasdouniverso.com`. O resultado do deploy e a conferência do domínio devem ser verificados separadamente dos testes locais.
4. **Senhas vazadas:** o advisor do Supabase informou `Leaked Password Protection Disabled`. Avaliar a ativação no projeto conforme o plano disponível. Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
5. **Edição do original e de evoluções:** a interface ainda não oferece edição do relato original. Evoluções são acrescentadas ao histórico; correções podem ser registradas como uma nova evolução. A política de privacidade anterior menciona edição de registros e precisa de revisão de alinhamento com o produto antes de lançamento amplo.
6. **Grande volume:** a paginação evita corte silencioso, mas o cliente ainda carrega a coleção completa. Medir o uso real antes de evoluir para busca e carregamento progressivo no servidor.

O advisor de performance apontou apenas um índice ainda sem uso, esperado numa tabela recém-criada; ele foi mantido. Não foram alteradas outras tabelas do projeto compartilhado.

## Revisão manual antes de publicar

Abrir a home em 390px, 768px e desktop; verificar ausência de rolagem horizontal e corte da árvore. Entrar com conta de teste; guardar um sinal; abrir pelo cartão e pelo Jardim; registrar evolução, conclusão e aprendizado; recarregar; reabrir; testar busca e filtros. Conferir Tab, Escape, retorno do foco e preservação de texto ao falhar a rede. Testar o mesmo registro em outro dispositivo e confirmar que uma segunda conta não o vê.
