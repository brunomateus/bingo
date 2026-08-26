# Bingo

Aplicação que gerencia uma confraria de cervejeiros caseiros: organiza rodadas periódicas em que cada membro escolhe um estilo BJCP para o pool coletivo, depois se compromete a produzir e entregar uma quantidade configurável (padrão 3) de estilos desse pool — escolhidos apenas no ato de cada entrega, não antecipadamente — e mantém o histórico dessas rodadas.

## Language

**Confraria**:
A associação de cervejeiros caseiros que usa a aplicação. Assume-se uma única confraria por instância da aplicação (não multi-tenant).

**Membro**:
Uma pessoa que pertence à confraria, identificada por nome, e-mail, Papel e Status. Cadastrado explicitamente por um Organizador (login só é permitido para o e-mail de um Membro já cadastrado); não é uma lista fixa em código. Todo membro pode ter o papel de Organizador ou Membro comum.
_Avoid_: Confrade, usuário, participante (usar "participante" apenas para descrever um membro dentro do contexto de uma Edição específica)

**Papel**:
O nível de permissão de um membro: **Organizador** (pode iniciar uma nova Edição, definir seu prazo, e gerenciar a lista de membros) ou **Membro comum** (participa do Sorteio e registra suas Entregas). Um Organizador é um Membro com permissões adicionais, não uma entidade separada. Pode haver mais de um Organizador ao mesmo tempo; o único Organizador ativo restante não pode ser rebaixado nem desativado.

**Status**:
Se um Membro está ativo ou inativo. Só um Membro ativo pode logar e integrar novas Edições. Marcar um Membro como inativo ("remover da confraria") não apaga seu registro nem suas Edições e Entregas passadas, que continuam visíveis no Histórico.
_Avoid_: Remoção, exclusão (usar só para descrever a mudança de Status, nunca uma exclusão de dados)

**Edição**:
Uma rodada periódica do Bingo, persistida com prazo (deadline, que o Organizador pode estender enquanto a Edição está aberta), a meta de Entregas por participante (quantidade configurável pelo Organizador na criação, padrão 3, igual para todos os participantes, fixa depois que a Edição abre — ver Entrega e Pendência), a lista de membros participantes (todos os membros ativos no momento em que a Edição começa) e o estado de suas duas fases. Só há uma Edição aberta por vez — o Organizador só inicia a próxima depois que esta é fechada (ver Fechamento).
_Avoid_: Ciclo, Draw, Sorteio (quando usado para se referir à entidade — ver "Sorteio" abaixo)

**Fechamento**:
O fim de uma Edição aberta: automático (todas as Entregas da Seleção Final completas, ou prazo vencido — o que ocorrer primeiro) ou manual pelo Organizador, a qualquer momento. Resulta em conclusão (a Edição passa a compor o Histórico) ou, se feito manualmente antes de qualquer Estilo reivindicado ou entregue, em cancelamento (a Edição não compõe o Histórico).
_Avoid_: Encerramento, finalização

**Sorteio**:
O nome tradicional do ritual de escolha de estilos que ocorre dentro de uma Edição, em duas fases (Definição do Pool e Seleção Final). Não é uma entidade própria nem envolve aleatoriedade real — é o processo, não o registro. "Edição" é o registro; "Sorteio" é o que acontece nele.

**Estilo**:
Um estilo de cerveja do guia BJCP (Beer Judgment Certification Program) vigente, identificado por um id BJCP (ex.: "21A") e nome. A fonte de estilos deve refletir o guia BJCP mais recente, não uma lista de amostra.

**Pool**:
O conjunto de Estilos reivindicados por membros durante a Fase 1 de uma Edição. Formado por, no máximo, um Estilo por membro participante.

**Fase 1 / Definição do Pool**:
Etapa da Edição em que cada membro participante reivindica exatamente 1 Estilo (por ordem de chegada; um Estilo não pode ser reivindicado duas vezes). Termina quando todos os membros participantes reivindicaram um Estilo, formando o Pool, ou quando o Organizador força o avanço reivindicando, em nome de quem ainda não agiu, um dos Estilos restantes.

**Fase 2 / Seleção Final**:
Etapa da Edição, após a Fase 1: período em que cada membro cumpre seu compromisso de Entregas (a meta definida na Edição, ver Edição). Sem seleção prévia de Estilos, apesar do nome — o Estilo de cada Entrega só é definido no ato de registrá-la (ver Entrega), nunca antecipadamente.

**Entrega**:
O registro de um membro cumprindo parte do seu compromisso de Entregas numa Edição. No ato do registro, o membro escolhe o Estilo (um dos Estilos do Pool da Edição, sem repetir um que ele mesmo já entregou nela), além de uma observação em texto livre (hoje usada para registrar o local da entrega) e o instante da entrega. Pode ser registrada a qualquer momento, sem prazo — mesmo depois que a Edição de origem já fechou e uma nova Edição está em andamento.

**Pendência**:
A diferença entre a meta de Entregas de um Membro numa Edição (padrão 3, definida pelo Organizador ao abrir a Edição) e as Entregas que ele já registrou nela, em qualquer Edição (fechada ou não). Sem Estilo determinado até a Entrega ser efetivamente registrada — o Membro escolhe o Estilo (do Pool da Edição, sem repetir um que ele mesmo já entregou) no ato de cada Entrega, não antecipadamente. Consultável a qualquer momento, agregada por Membro (o total que ele deve) e detalhada por Edição, independente de quando a Edição de origem fechou.
_Avoid_: Débito, atraso

**Histórico**:
O conjunto de Edições concluídas, consultável como lista cronológica e como visões agregadas: quais Estilos cada Membro já produziu, quantas vezes cada Estilo já foi entregue (não "escolhido" — Fase 2 não tem mais uma escolha antecipada, ver Fase 2 / Seleção Final), e quais Pendências existem por Membro.
