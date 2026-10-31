# Guardar no Diário

Implementação de 31/10/2026. As contas e os bancos dos dois produtos permanecem independentes. O PDU não lê o Diário e não transmite tokens de autenticação.

## Experiência

O botão da leitura no PDU abre `/importar/` em uma nova aba do Diário. A pessoa confere pergunta, tiragem, cartas, posições, data e texto, acrescenta uma impressão opcional e confirma o salvamento na própria conta. Entrar não salva automaticamente. Após OAuth na home, o aviso “Retomar prévia” devolve a pessoa à confirmação.

O registro guarda uma cópia da origem em `entries.source`, participa da coleção e da Revisita e mantém o histórico de evoluções. A chave `(owner_user_id, source_key)` impede que reenviar uma leitura sobrescreva notas anteriores. Para leituras sem ID persistido, o PDU deriva uma chave do conteúdo; traduções ou conteúdo diferente podem gerar outra chave.

## Contrato e privacidade

- Contrato `version: 1`, `app: pdu`, validado nos dois lados, com limites de texto, cartas e tamanho total.
- Handshake `du:pdu-ready` → `du:pdu-reading` → `du:pdu-received`, com origem exata, janela de origem e nonce aleatório. O recebimento confirma apenas a prévia; o banco confirma o salvamento depois.
- Conteúdo via `postMessage`; a URL contém somente nonce no fragmento. Nenhuma leitura ou credencial é colocada na URL.
- Prévia temporária no `sessionStorage` da aba do Diário, com validade de 30 minutos. É descartada ao salvar, cancelar, expirar ou trocar de conta. Se o navegador bloquear o armazenamento, a interface informa a limitação de retomar após login.
- Snapshot confirmado pelo usuário, sem assinatura de servidor: não serve como prova de identidade, pagamento ou entitlement. Não concede acesso pago e não envia notas à Lume.
- Inserções usam a sessão do Diário e as políticas RLS existentes. O cliente confirma o usuário antes de inserir e ignora respostas atrasadas após troca de conta.

## Desenvolvimento e publicação

No PDU, `NEXT_PUBLIC_DIARY_ORIGIN` aponta ao domínio oficial por padrão. Apenas em desenvolvimento é permitido substituir por uma origem HTTP local exata. No Diário, `PUBLIC_PDU_ORIGIN` permite essa origem HTTP local somente em desenvolvimento. Esquema, host e porta precisam corresponder; não há curingas. Em produção, somente os domínios oficiais são aceitos.

Os retornos de autenticação usam a raiz do Diário, que deve constar na allowlist do Supabase. Não é necessário adicionar `/importar/` aos provedores OAuth.

A migração `20261031034638_add_pdu_reading_source.sql` foi aplicada ao projeto `vgaqwpkqrjtyumsajjsz` em 31/10. O teste transacional remoto confirmou inserção própria, rejeição de duplicata e isolamento de leitura/inserção de outra identidade, com rollback integral das fixtures. Testes locais cobrem duas contas e a mesma leitura em ambas.

Publicação autorizada em 31/10/2026: publicar primeiro o Diário e depois o PDU. Teste automatizado em Chromium abriu o botão real do PDU e a prévia do Diário em duas origens, conferiu conteúdo, recarga com anotação e exigência de login nas larguras 1440, 768 e 390px, sem overflow ou erros de JavaScript. Foram usados conteúdos sintéticos e os servidores locais mapeados para as origens oficiais; não é prova de OAuth e salvamento final com uma conta real em produção.

O Diário passou nos 26 testes automatizados, typecheck e build. A publicação do PDU usa checkout isolado para não incluir rascunhos de outras tarefas. A identidade visual já publicada foi preservada: os 11 arquivos de logos, ícones e manifest foram comparados byte a byte com produção. O teste final autenticado em dispositivo real continua uma verificação separada.
