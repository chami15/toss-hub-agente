# Backlog — ideias adiadas de propósito

Ideias discutidas durante o design dos agentes que fazem sentido, mas foram
deliberadamente deixadas fora do escopo atual. Registradas aqui pra não se
perderem e pra já vir com o contexto do porquê foram adiadas.

---

## Canal de mensagem (Telegram/WhatsApp) para lançar gasto avulso — Agente Financeiro

**Ideia:** deixar o usuário mandar uma mensagem tipo "gastei 45 reais no mercado
hoje" pelo Telegram ou WhatsApp (Evolution API, já citada no MVP original) e o
Financeiro parseia isso (bom caso de uso de LLM: texto livre -> dado
estruturado) e contabiliza como uma transação, sem esperar o extrato mensal.

**Por que foi adiada (não é só "mais trabalho"):** isso cria um problema real
de integridade de dado, não só uma tela a mais. Se o gasto for lançado
manualmente pelo canal E também aparecer depois no extrato do cartão (porque
foi no cartão), ele conta **duas vezes** a menos que exista uma etapa de
reconciliação entre lançamento manual e a linha do extrato. Essa etapa não
existe hoje e precisa ser desenhada antes de implementar o canal, não depois.

**O que vai precisar quando for retomada:**
- Campo `origem` em `transacoes` (`manual` | `extrato`) para diferenciar a
  procedência de cada linha.
- Uma lógica de casamento (matching) entre lançamento manual e a transação
  correspondente do extrato quando ele chegar — por proximidade de data/valor,
  provavelmente com confirmação do usuário nos casos ambíguos, não automático.
- Decidir o que mostrar no relatório enquanto uma transação manual ainda não
  foi "casada" com o extrato (ela conta pro mês corrente, mas fica marcada
  como não conciliada).
- Escolha entre Telegram Bot API (mais simples de integrar) ou a Evolution
  API do WhatsApp (já usada em outras integrações do hub) como canal de
  entrada.

**Status:** não iniciado. Agente Financeiro atual (versão inicial) é
100% leitura/análise/relatório a partir do extrato mensal — sem escrita.

---

## Open Finance (conexão bancária automática)

**Ideia:** conectar direto com o banco via Open Finance (Pluggy, Belvo ou
similar) em vez do usuário exportar e subir o CSV/extrato manualmente.

**Por que foi adiada:** superfície de segurança/compliance real (autenticação
bancária, tokens de acesso a dado financeiro sensível), custo de API paga por
conexão, e não é o que valida a experiência do MVP — o upload manual já
resolve o objetivo de ter o relatório e os KPIs.

**Status:** não iniciado, sem previsão. Reavaliar só se o upload manual se
mostrar um atrito real de uso no dia a dia.
