# Revisita

Primeira implementação em 29/10/2026. Convite para reencontrar um registro e acrescentar um novo olhar ao histórico já existente.

- Aparece para a pessoa conectada depois de carregar registros e evoluções com sucesso.
- Seleção local baseada em dados privados já carregados: nenhuma chamada de IA, rastreamento ou nova tabela.
- Elegibilidade: sete dias completos desde a atividade mais recente entre criação, atualização e evoluções. Datas futuras ou inválidas são excluídas. Um registro novo com data de acontecimento antiga não entra imediatamente na seleção.
- Assuntos em aberto têm prioridade. A escolha inicial é estável no dia local, enquanto os dados forem os mesmos; “Ver outro sinal” permite percorrer as demais opções.
- O convite traz trecho do registro, data, estado, dias desde a atividade e pergunta correspondente a assunto aberto, evolução anterior, conclusão ou aprendizado.
- Abrir o convite mostra o histórico integral e a pergunta. A resposta é uma evolução comum, com os mesmos controles e persistência. A pessoa também pode escolher conclusão, aprendizado ou reabertura.
- Uma evolução recém-guardada retira o sinal da elegibilidade por sete dias. A conta sem sinais antigos recebe uma explicação e um atalho para registrar.
- Ao salvar por um convite, o cartão confirma o momento guardado com um trecho da própria reflexão. A pessoa escolhe entre ver o caminho, voltar aos convites ou escrever sobre hoje. Essa confirmação é apenas da sessão e é apagada ao trocar de conta.
- Ao retornar à aba, os convites são recalculados quando o histórico não estiver aberto, respeitando a passagem de dias.
- A escolha de “outro sinal” vale para a sessão; não há promessa de preferências sincronizadas, lembretes, notificações ou agendamento.

Arquivos: `src/lib/revisit.ts`, `src/scripts/journey.ts`, `src/pages/index.astro`, `src/styles/journey.css`, testes de seleção e DOM em `tests/`.

Verificação: testes de elegibilidade, seleção estável, prioridade, perguntas, abertura contextual, gravação, descanso após resposta e limpeza ao sair. Build e tipos verificados. A apresentação usa controles empilhados em telas estreitas e o diálogo existente. Revisão visual real e fluxo com login pelo navegador ainda pendentes, pois o navegador local estava desativado no Work durante a entrega anterior.

Publicação autorizada pelo usuário na continuidade de 30/10/2026. A interface será entregue no projeto Cloudflare Pages `diario-do-universo`, junto à correção de cadastro repetido e recuperação de senha.

No acabamento, a camada dos pontos do Jardim deixou de capturar eventos fora dos próprios pontos, liberando o botão do estado vazio. O diálogo recebeu margem de rolagem nos campos e espaço inferior para a área segura do celular. A inspeção visual foi tentada novamente em 29/10; o acesso ao navegador continua desativado nas configurações do Work. Testes de DOM não comprovam layout em dispositivos reais.

Atualização da revisão: o navegador voltou a ficar disponível em 30/10. Na home atual em `127.0.0.1:4325`, o estado desconectado e o painel de acesso foram conferidos em larguras de 390, 768 e 1440px, sem overflow horizontal. Em 390px, o botão do Jardim abriu o acesso e o pedido de recuperação sem email mostrou orientação apropriada. A home não apresentou imagens quebradas. Revisita com dados reais autenticados, foco nativo do histórico e teclado físico de celular continuam sem validação real. Os testes de DOM cobrem o fluxo autenticado com adaptador simulado.
