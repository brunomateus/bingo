Part of: [Spec do Bingo (próxima fase)](./map.md)

# Spec: Bingo (próxima fase)

Consolidação das decisões dos 7 tickets do mapa `Spec do Bingo (próxima fase)`. Cobre gestão de Membros, o ciclo de vida da Edição (Sorteio em duas fases + Entregas), Histórico, a fonte de dados de Estilos BJCP, e a arquitetura Firebase (Auth + Firestore) para hospedagem estática. Terminologia canônica em [CONTEXT.md](../../CONTEXT.md) — este documento resume as decisões e as amarra ao schema/UI; em caso de dúvida sobre um termo, `CONTEXT.md` é a fonte de verdade.

Granularidade: decisões em texto (o que cada papel pode fazer, quais campos existem, como o schema é organizado) — não é código de regras do Firestore nem implementação. O código atual em `src/` pode ser totalmente reescrito; nenhuma decisão aqui precisa preservar compatibilidade com ele.

## 1. Visão geral

Uma confraria de cervejeiros caseiros roda Edições periódicas: cada Membro participante escolhe um Estilo BJCP para o Pool coletivo (Fase 1), depois se compromete a produzir e entregar uma quantidade configurável (padrão 3) de Estilos desse Pool — escolhidos apenas no ato de cada entrega, não antecipadamente (Fase 2). O Histórico mantém o registro de Edições concluídas e agregações por Membro e por Estilo.

## 2. Membro e autenticação

- **Login**: só contas Google cujo e-mail corresponde a um Membro cadastrado e **ativo** conseguem entrar; toda tentativa de login (não só a primeira) revalida isso.
- **Vínculo UID ↔ Membro**: o Organizador cria o registro de Membro (com e-mail) antes de qualquer login; o Firebase Auth UID é gravado no registro no primeiro login bem-sucedido daquele e-mail.
- **Campos do Membro**: nome, e-mail, papel (`Organizador` | `Membro comum`), status (`ativo` | `inativo`). Nada além disso.
- **Múltiplos Organizadores**: permitido simultaneamente, sem limite. O sistema impede rebaixar ou desativar o único Organizador ativo restante.
- **Bootstrap do primeiro Organizador**: fora do app — cadastro manual único no Firestore (console/script), tarefa operacional de setup.
- **Promoção/rebaixamento**: um Organizador edita o papel de outro Membro pela tela de gestão de membros.
- **Remoção de Membro**: soft delete — status vira `inativo`; o registro continua existindo e legível; Edições e Entregas passadas continuam mostrando o Membro normalmente no Histórico.

### UI — Gestão de Membros

Tela em cards agrupados por status (**Ativos** / **Inativos**). Cadastro via card tracejado "+ Novo membro" que expande um mini-formulário inline (nome + e-mail; papel inicial `Membro comum`, status inicial `ativo`, sem campo pra escolher isso no cadastro). Ações **Promover/Rebaixar** e **Desativar** como botões no card de um Membro Ativo; Membros Inativos só têm **Reativar**. A guarda do último Organizador ativo desabilita os botões relevantes e mostra um aviso de texto (⚠) dentro do próprio card.

*Protótipo de referência: branch `prototype/gestao-membros` (3 variantes; vencedora = cards por status).*

## 3. Edição — ciclo de vida

- **Uma Edição ativa por vez**: no máximo uma Edição aberta (em Sorteio); o Organizador só inicia uma nova depois que a anterior fecha.
- **Abertura**: o Organizador define, ao criar a Edição: o **prazo** (deadline, aplicado à Fase 2) e a **meta de Entregas** por participante (quantidade configurável, padrão 3, igual para todos os participantes daquela Edição, fixa assim que a Edição abre — não é extensível como o prazo). Os participantes são um snapshot automático de todos os Membros ativos no momento em que a Edição começa — sem seleção manual.
- **Prazo**: pode ser estendido pelo Organizador a qualquer momento enquanto a Edição está aberta. A Fase 1 não tem prazo próprio.
- **Fase 1 → Fase 2**: fecha quando todos os participantes reivindicaram um Estilo (formando o Pool), ou quando o Organizador força o avanço escolhendo um Estilo, em nome de quem ainda não agiu, dentre os Estilos restantes do Pool.
- **Fechamento**: automático quando (a) todos atingiram sua meta de Entregas OU (b) o prazo vence — o que ocorrer primeiro. O Organizador também pode fechar manualmente a qualquer momento (escape hatch). Fechamento manual antes de qualquer atividade real (nenhum Estilo reivindicado/entregue) é tratado como **cancelamento** (não entra no Histórico, documento mantido com status `cancelada` — não deletado, evita órfãos de subcoleção e preserva auditoria); caso contrário, entra no Histórico como **conclusão**.
- **Entregas pendentes no fechamento não são definitivas**: um Membro pode completá-las depois, indefinidamente, mesmo com uma nova Edição já em andamento — o Histórico reflete o estado real a qualquer momento, não um snapshot congelado no fechamento. (Motivado por um problema recorrente real: Membros que atrasam não devem ficar impedidos de honrar o compromisso tardiamente, nem travar o início da próxima Edição.)

### UI — Criação e gestão de Edição

Stepper horizontal no topo (**Pool → Seleção Final → Fechamento**) indicando a fase atual. Abaixo: painel lateral fixo à esquerda (prazo com "estender" inline; botões **Forçar avanço da Fase 1** e **Fechar Edição**; log de atividade) + grade de cards de participante à direita. "Forçar avanço" abre um painel inline com um seletor de Estilo por participante pendente; confirmar atribui os Estilos e avança pra Fase 2. **Fechamento é um estado próprio, não um reset**: fechar leva o stepper pro terceiro passo e troca o painel lateral por um resumo (resultado Concluída/Cancelada, o prazo que estava valendo, e um botão **Abrir próxima Edição** pra já iniciar a seguinte dali); a grade de participantes permanece como recapitulação somente-leitura. Fechamento automático renderiza o mesmo estado, só que disparado pelo sistema.

O formulário de abertura tem dois campos: prazo e meta de Entregas (padrão 3), no mesmo padrão visual do prazo.

*Protótipo de referência: branch `prototype/criacao-edicao` (3 variantes; vencedora = painel + grade, com o stepper por cima). O protótipo em código não reflete o segundo campo (meta de Entregas) nem a Fase 2 sem seleção prévia — só a decisão em texto está atualizada.*

## 4. Sorteio: Fase 1 (Pool) e Fase 2 (Entregas)

- **Fase 1 / Definição do Pool**: cada participante reivindica exatamente 1 Estilo (por ordem de chegada; um Estilo não pode ser reivindicado duas vezes), formando o Pool coletivo.
- **Fase 2**: **não tem seleção prévia de Estilos**, apesar do nome histórico "Seleção Final" — é um período de Entregas direto. Cada participante se compromete a uma **quantidade** de Entregas (a meta da Edição), não a Estilos específicos escolhidos de antemão.
- **Entrega**: no ato do registro, o Membro escolhe o Estilo — precisa ser um dos Estilos do Pool da Edição, sem repetir um que ele mesmo já entregou nela (Membros diferentes podem repetir o mesmo Estilo do Pool entre si). Campos: Estilo, observação em texto livre (hoje usada pro local da entrega), instante da entrega. Pode ser registrada a qualquer momento, sem prazo — mesmo após o fechamento da Edição de origem.
- **Pendência**: meta de Entregas do Membro na Edição menos as Entregas já registradas — sem Estilo determinado até a Entrega acontecer. Consultável a qualquer momento, por Membro e por Edição (fechada ou não).

> Esta mecânica (Fase 2 sem seleção prévia, meta configurável) é uma correção de uma decisão anterior, feita ao prototipar o Histórico (ticket 07) — a suposição original era que o Membro escolhia até 3 Estilos do Pool antecipadamente. Propagada para os tickets 02, 04, 06 e para `CONTEXT.md`.

## 5. Histórico

O conjunto de Edições concluídas (`status: concluida`), consultável como:

- **Lista cronológica** — mais recente primeiro; cada Edição mostra a data de fechamento e os Estilos efetivamente entregues nela.
- **Produção por Membro** — quais Estilos cada Membro já entregou, incluindo Membros inativos (Histórico preserva o dado de quem foi desativado).
- **Ranking por Estilo** — quantas vezes cada Estilo já foi **entregue** (não "escolhido" — não há escolha antecipada).
- **Pendências** — uma linha por (Membro, Edição) com a quantidade de Entregas que faltam; nunca um Estilo específico. Inclui Edições já fechadas e a Edição em curso (Pendência existe independente de a Edição de origem estar fechada).

Agregações calculadas no cliente a partir de queries simples do Firestore, sem pré-computação no servidor (volume pequeno esperado).

### UI — Histórico

Abas por categoria: **Edições**, **Por Membro**, **Por Estilo**, **Pendências**. Cada linha de Edição mostra os Estilos entregues como chips (com `×N` quando mais de um Membro entregou o mesmo Estilo). A aba Pendências lista quantidade devida por (Membro, Edição), com uma nota explicando que o Estilo só é conhecido no ato da Entrega.

*Protótipo de referência: branch `prototype/historico` (3 variantes — abas por categoria, relatório em rolagem, master-detail por membro; vencedora = abas por categoria).*

## 6. Estilos BJCP (fonte de dados)

BJCP não publica o guia 2021 vigente em formato estruturado (só PDF). Fonte técnica adotada: [`beerjson/bjcp-json`](https://github.com/beerjson/bjcp-json), arquivo `styles/bjcp_styleguide-2021.json` (110 estilos, repo MIT). Uso restrito ao permitido pela BJCP: `id`, `name`, `category` e as faixas numéricas (OG/FG/IBU/SRM/ABV) — o texto descritivo completo (aroma/aparência/sabor/etc.) é copyright BJCP e **não** pode ser reproduzido no bundle sem autorização explícita. Estilos continuam como asset estático no bundle, não uma coleção do Firestore (achados completos em [research/03-fonte-dados-bjcp.md](./research/03-fonte-dados-bjcp.md)).

## 7. Arquitetura — Firebase (Auth + Firestore)

Site estático (GitHub Pages), sem backend próprio — persistência e autenticação resolvidas inteiramente no cliente via Firebase Auth + Firestore ([ADR 0001](../../docs/adr/0001-firebase-as-backend-for-static-hosting.md)).

### Coleções

- **`membros/{email-sanitizado}`** — nome, e-mail, papel, status, uid (nulo até o 1º login). ID do documento = e-mail sanitizado (lookup direto no login, sem query).
- **`edicoes/{id}`** — prazo, `metaEntregas` (padrão 3, fixada na criação), status (`aberta` | `concluida` | `cancelada`), participantes (array de ids de Membro, snapshot no início), fase atual (quando `aberta`).
  - **`edicoes/{id}/pool/{membroId}`** — Fase 1: `styleId` reivindicado por cada Membro. Doc id = ID do Membro; unicidade do Estilo garantida por regra de escrita.
  - **`edicoes/{id}/selecoes/{membroId}`** — Entregas já registradas por aquele Membro: array de `{styleId, observation, deliveredAt}`. Sem campo `delivered` — a presença do item já significa entregue. Regra de escrita valida que `styleId` pertence ao Pool da Edição e que o Membro não repete um `styleId` já presente no próprio array. Pendência = `metaEntregas − tamanho do array`, calculada no cliente, não armazenada.
- **`estado/atual`** — singleton apontando o id da Edição aberta (se houver); atualizado em transação ao criar/fechar uma Edição — garantia real (não só de UI) de "uma Edição aberta por vez", importante com múltiplos Organizadores.
- Estilos BJCP **não** são coleção: asset estático no bundle; Firestore só guarda o `id` do Estilo nas referências (pool/seleções).

### Acesso por papel

| Ação | Organizador | Membro comum |
|---|---|---|
| Ler membros/edições/pool/seleções | ✅ (amplo) | ✅ (amplo; e-mail restrito ao próprio + Organizadores) |
| Criar/editar Membro (papel, status) | ✅ | ❌ (exceto gravar o próprio `uid` no 1º login) |
| Criar Edição, definir/estender prazo, forçar avanço Fase 1, fechar/cancelar | ✅ | ❌ |
| Escrever no próprio `pool`/`selecoes` | ✅ | ✅ |
| Escrever em nome de outro (force-advance da Fase 1) | ✅ | ❌ |
| Registrar a própria Entrega | ❌ (nunca em nome de outro) | ✅ (estritamente self-service) |

## 8. Fora de escopo

- **Avaliação/feedback de cervejas** (nota, comentário nas entregas) — confirmado pelo usuário como esforço futuro separado.
- **Formato "Estilo único"** — 1 Estilo escolhido pra Edição inteira, todos entregam esse mesmo Estilo (o formato anterior à mecânica de Pool descrita na seção 4). Não é reproduzível com a mecânica atual (Fase 1 exige Estilos distintos por participante; a escolha de Estilo na Entrega é individual, não amarrada a um Estilo comum a todos). Cogitado pelo usuário como possível mudança futura, mas não decidido.

## 9. Rastro de decisões

| # | Ticket | Tipo |
|---|---|---|
| 01 | [Modelo de Membro / autenticação](./issues/01-modelo-membro-autenticacao.md) | grilling |
| 02 | [Ciclo de vida da Edição](./issues/02-ciclo-vida-edicao.md) | grilling |
| 03 | [Fonte de dados BJCP](./issues/03-fonte-dados-bjcp.md) | research |
| 04 | [Esquema Firestore e acesso](./issues/04-esquema-firestore-acesso.md) | grilling |
| 05 | [Protótipo: gestão de membros](./issues/05-prototipo-gestao-membros.md) | prototype |
| 06 | [Protótipo: criação de edição](./issues/06-prototipo-criacao-edicao.md) | prototype |
| 07 | [Protótipo: histórico](./issues/07-prototipo-historico.md) | prototype |

Mapa completo: [map.md](./map.md).
