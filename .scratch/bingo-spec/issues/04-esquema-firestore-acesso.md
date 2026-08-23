Part of: [Spec do Bingo (próxima fase)](../map.md)
Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

Dado o modelo de Membro ([ticket 01](./01-modelo-membro-autenticacao.md)) e o ciclo de vida da Edição ([ticket 02](./02-ciclo-vida-edicao.md)), qual é o esquema de coleções/subcoleções do Firestore para Membros, Edições e Entregas? Quais operações de leitura/escrita cada papel (Organizador vs Membro comum) pode fazer em cada coleção — em texto, não como código de regras? Como as agregações do Histórico (Estilos já produzidos por Membro, quantas vezes cada Estilo já foi escolhido) são calculadas: via queries do Firestore, ou no cliente a partir da lista de Edições carregadas?

## Answer

**Coleções top-level:**
- `membros/{email-sanitizado}` — nome, e-mail, papel, status, uid (nulo até o 1º login). ID do documento é o e-mail sanitizado (lookup direto no login, sem query; funciona mesmo antes do 1º login/uid existir).
- `edicoes/{id}` — prazo, **metaEntregas** (quantidade de Entregas exigida por participante, padrão 3, fixada na criação — ver correção no [ticket 02](./02-ciclo-vida-edicao.md)), status (`aberta` | `concluida` | `cancelada`), participantes (array de ids de membro, snapshot no início), fase atual (quando `aberta`).
  - `edicoes/{id}/pool/{membroId}` — subcoleção da Fase 1: styleId reivindicado por cada membro. Doc id = ID do Membro (sobrescrito se ele trocar de escolha antes da Fase 2 começar); unicidade do Estilo (não reivindicado duas vezes) é garantida por regra de escrita, não pela chave do documento.
  - `edicoes/{id}/selecoes/{membroId}` — subcoleção da Fase 2, **revisada**: array das Entregas já registradas por aquele Membro (não mais um array fixo de "slots" pré-alocados) — cada item `{styleId, observation, deliveredAt}`. Sem campo `delivered`: a presença do item no array já significa entregue (não existe mais um estado "reivindicado mas não entregue" — ver Pendência revisada no `CONTEXT.md`). Regra de escrita valida que `styleId` pertence ao Pool da Edição e que o Membro não repete um `styleId` que ele mesmo já tem no array. Pendência de um Membro numa Edição = `metaEntregas − tamanho do array`, calculada no cliente, não armazenada.
- `estado/atual` — documento singleton apontando o id da Edição aberta (se houver), atualizado em transação ao criar/fechar uma Edição — é a garantia real (não só de UI) de "uma Edição aberta por vez" (ticket 02), importante com múltiplos Organizadores.
- Estilos BJCP **não** viram coleção: continuam como asset estático no bundle (gerado a partir da fonte do [ticket 03](./03-fonte-dados-bjcp.md)); o Firestore só guarda o `id` do estilo nas referências (pool/seleções).

**Acesso por papel:**
- Leitura ampla pra tudo relacionado a Sorteio/Histórico (membros, edições, pool, seleções) pra qualquer Membro ativo; e-mail restrito ao próprio Membro + Organizadores.
- Escrita em `membros`: só Organizador (criar, mudar papel/status), exceto o próprio Membro gravando seu `uid` no 1º login.
- Escrita em `edicoes` (incl. `estado/atual`): só Organizador (criar, definir/estender prazo, forçar avanço de Fase 1, fechar manual/cancelar).
- Escrita em `pool`/`selecoes`: cada Membro só no próprio documento; exceção é o Organizador escrevendo em nome de quem não agiu na Fase 1 (force-advance, ticket 02).
- Escrita de Entrega: estritamente self-service — só o próprio Membro adiciona um item ao próprio array em `selecoes` (nunca o Organizador em nome de outro).

**Agregações do Histórico**: calculadas no cliente a partir de queries simples do Firestore (`collectionGroup` sobre `selecoes` de todas as Edições), sem agregação no servidor — volume pequeno esperado (confraria pequena, dezenas de Edições) dispensa Cloud Functions/contadores pré-computados, coerente com "sem servidor próprio" (ADR 0001). A agregação por Estilo ("quantas vezes cada Estilo já foi entregue") só considera itens de `selecoes` (sempre entregues, ver revisão abaixo); a agregação de Pendências cruza `metaEntregas` de cada `edicoes/{id}` com o tamanho do array `selecoes/{membroId}` de cada participante.

**Edição cancelada**: mantém o documento com status `cancelada` (não deletado — evita órfãos de subcoleção e preserva auditoria); só fica fora das queries de Histórico, que filtram por `concluida`.

Nenhum termo novo de domínio surgiu — é esquema técnico, fora do escopo do glossário (`CONTEXT.md`).

## Correção (ao resolver o ticket 07 — Protótipo: histórico)

O esquema de `selecoes` acima já reflete a correção: Fase 2 não tem mais seleção prévia de Estilos, só Entregas registradas diretamente (ver correção no [ticket 02](./02-ciclo-vida-edicao.md)). Principal mudança de schema: `selecoes/{membroId}` deixou de ser um array fixo de até 3 "slots" com `styleId` conhecido de antemão e `delivered: boolean`; agora é só a lista das Entregas que já aconteceram, com `metaEntregas` no doc da Edição definindo quantas são esperadas.
