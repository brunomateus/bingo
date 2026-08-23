Part of: [Spec do Bingo (próxima fase)](../map.md)
Type: prototype
Status: resolved

## Question

Como é a tela do Organizador para abrir uma nova Edição (ticket 02: definir prazo; participantes são um snapshot automático dos membros ativos, sem seleção manual) e para as ações de gestão de uma Edição aberta (estender prazo, forçar avanço da Fase 1 escolhendo Estilo por quem não agiu, fechar manualmente/cancelar)? Construir um protótipo rápido e descartável pra reagir e decidir o comportamento exato de cada ação.

## Answer

Protótipo construído com 3 variantes estruturalmente diferentes (dashboard com toolbar, stepper por fase, painel lateral + grade de participantes). Rodado localmente em `/prototype/edicao`, `?variant=A|B|C`, compartilhando o mesmo estado em memória (Edição semeada em Fase 1 com metade dos participantes já com Estilo reivindicado). Protótipo (código descartável) commitado na branch `prototype/criacao-edicao`, fora da main.

**Vencedora: combinação de C (painel + grade) com o stepper de B por cima.**

- Stepper horizontal no topo (Pool → Seleção Final → Fechamento) indicando a fase atual da Edição.
- Abaixo do stepper: painel lateral fixo à esquerda (prazo com "estender" inline, botões "Forçar avanço da Fase 1" e "Fechar Edição", log de atividade) + grade de cards de participante à direita (nome + Estilo reivindicado, ou "aguardando Estilo").
- "Forçar avanço": painel inline no conteúdo principal com um `<select>` de Estilo por participante pendente; confirmar atribui os Estilos e avança a Edição pra Fase 2.
- **Fechamento é um estado próprio, não um reset**: fechar (manual) leva o stepper pro terceiro passo e troca o painel lateral por um resumo — resultado (Concluída, em âmbar / Cancelada, em vermelho, conforme houve ou não atividade), o prazo que estava valendo, e um campo de prazo + botão "Abrir próxima Edição" pra já iniciar a seguinte a partir dali. A grade de participantes permanece visível como recapitulação somente-leitura.
- Fechamento automático (todas as Entregas completas ou prazo vencido) não tem UI própria — quando acontecer, renderiza o mesmo estado de Fechamento, só que disparado pelo sistema em vez do botão.

## Correção (ao resolver o ticket 07 — Protótipo: histórico)

A Fase 2 deixou de ter seleção prévia de Estilos — vira um período de Entregas direto, e a Edição ganhou um novo campo obrigatório: a **quantidade de Entregas exigida** por participante (padrão 3, configurável, fixa depois de aberta — ver correção no [ticket 02](./02-ciclo-vida-edicao.md)). Isso adiciona um segundo campo ao formulário de abertura (junto do prazo), no mesmo padrão visual já validado nesta variante — o protótipo em código (branch `prototype/criacao-edicao`) não foi atualizado pra refletir isso, mas o comportamento do restante da tela (stepper, painel, Fechamento) não muda: "Forçar avanço da Fase 1" continua igual (é só a Fase 1/Pool, não afetada), e a grade de participantes na Fase 2 deixa de mostrar "Estilo reivindicado" por participante (não existe mais nesse momento) — mostraria, em vez disso, o progresso de Entregas de cada um (ver ticket 07).
