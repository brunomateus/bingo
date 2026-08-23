Part of: [Spec do Bingo (próxima fase)](../map.md)
Type: grilling
Status: resolved

## Question

Quando uma Edição começa (quem cria, o que é obrigatório para abrir: prazo, lista de participantes)? Como funciona a transição da Fase 1 (Definição do Pool) para a Fase 2 (Seleção Final) — automática quando todos reivindicaram um Estilo, ou manual pelo Organizador? O que define uma Edição como "concluída" e pronta para entrar no Histórico: todas as Entregas feitas, o prazo vencido, ou fechamento manual pelo Organizador? O que acontece se o prazo passa sem todas as Entregas feitas — a Edição fica aberta indefinidamente, é fechada mesmo incompleta, ou outro comportamento? Pode haver mais de uma Edição em andamento ao mesmo tempo?

## Answer

- **Uma Edição ativa por vez**: o sistema garante no máximo uma Edição aberta (em Sorteio); o Organizador só inicia uma nova depois que a anterior fecha.
- **Prazo**: único por Edição, definido pelo Organizador na criação, aplicado efetivamente à Fase 2 (entrega). Pode ser estendido pelo Organizador enquanto a Edição está aberta. A Fase 1 não tem prazo próprio.
- **Fase 1 travada**: o Organizador pode, a qualquer momento e a seu critério, forçar o avanço para a Fase 2 escolhendo um Estilo em nome de qualquer participante que ainda não reivindicou o seu (o participante permanece no Pool e na Fase 2 com esse Estilo atribuído).
- **Fechamento**: automático quando (a) todas as Entregas da Seleção Final estão completas OU (b) o prazo vence — o que ocorrer primeiro. O Organizador também pode fechar manualmente a qualquer momento (escape hatch). Fechamento manual antes de qualquer atividade real (nenhum Estilo reivindicado/entregue) é tratado como cancelamento (não entra no Histórico); caso contrário, entra no Histórico normalmente.
- **Entregas pendentes no fechamento não são definitivas**: o membro pode completá-las depois, indefinidamente, mesmo com uma nova Edição já em andamento — o Histórico reflete o estado real (entregue/pendente) a qualquer momento, não um snapshot congelado no fechamento. Motivado por um problema recorrente real: membros que historicamente atrasam a entrega não devem ficar impedidos de honrar o compromisso tardiamente, nem travar o início da próxima Edição.
- **Pendências**: deve existir uma agregação/visão de quem está devendo entrega (quais Membros, quais Estilos, de quais Edições), consultável a qualquer momento. A apresentação em tela fica para um ticket de UI/UX futuro.

Glossário (`CONTEXT.md`) atualizado: novo termo **Fechamento** e **Pendência**; **Edição**, **Fase 1 / Definição do Pool**, **Entrega** e **Histórico** sharpened para refletir essas decisões.

## Correção (ao resolver o ticket 07 — Protótipo: histórico)

A Fase 2 não tem mais uma etapa de seleção prévia de Estilos — vira um período de Entregas direto (ver **Fase 2 / Seleção Final**, **Entrega** e **Pendência** revisados no `CONTEXT.md`). Isso adiciona um requisito à abertura da Edição:

- **Quantidade de Entregas exigida**: configurável pelo Organizador na criação da Edição, junto do prazo (não é um campo separado com prazo próprio); padrão 3; igual para todos os participantes daquela Edição; fixa assim que a Edição abre — não é extensível como o prazo (diferente do prazo, mudar quanto cada um deve no meio do jogo não foi pedido e não faz sentido).
- Isso também amplia o protótipo do ticket 06 (criação de edição): o formulário de abertura precisa de um segundo campo (quantidade de Entregas, padrão 3) ao lado do prazo — ver nota nesse ticket.
