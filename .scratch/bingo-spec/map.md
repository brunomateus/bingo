# Map: Spec do Bingo (próxima fase)

**Todos os tickets resolvidos. Spec consolidado: [SPEC.md](./SPEC.md).**

## Destination

Um spec escrito cobrindo: gestão de Membros (papéis Organizador/Membro comum e fluxo de autenticação), a entidade Edição (ciclo de vida, prazo, participantes), o processo de Sorteio (Fase 1 Definição do Pool, Fase 2 Seleção Final — mecânica atual mantida, sem aleatoriedade real), acompanhamento de Entregas, Histórico (lista de Edições passadas + agregações por Membro e por Estilo), a base de Estilos BJCP completa como fonte de dados, e a arquitetura Firebase (Auth + Firestore, client-side) para hospedagem estática no GitHub Pages.

## Notes

- Domínio: ver [CONTEXT.md](../../CONTEXT.md) (glossário canônico) e [ADR 0001](../../docs/adr/0001-firebase-as-backend-for-static-hosting.md).
- Tickets de grilling: consultar `CONTEXT.md` antes de responder e atualizar/estender o glossário se um termo novo surgir; chamar a skill `grilling` e depois `domain-modeling`.
- Tickets de research: chamar a skill `research`; achados ficam em `.scratch/bingo-spec/research/`.
- Granularidade do spec: decisões em texto (o quê cada papel pode fazer, quais campos existem), não código de regras do Firestore nem implementação — isso é trabalho pós-spec.
- O código atual (`src/`) pode ser totalmente reescrito depois que o spec estiver pronto; nenhuma decisão aqui precisa preservar compatibilidade com ele.
- Dados reais: existe uma lista real de membros e um histórico de edições anteriores que o usuário pode fornecer para popular o banco depois que o schema (ticket sobre Firestore) estiver definido. Isso é carga de dados pós-spec, não uma decisão de design — não vira ticket deste mapa.
- Ao fechar o último ticket, consolidar as decisões dos tickets num único `SPEC.md` antes de considerar a jornada encerrada.

## Decisions so far

- [Modelo de Membro / autenticação](./issues/01-modelo-membro-autenticacao.md): login restrito a e-mails pré-cadastrados e ativos (revalidado a cada login); UID vinculado ao registro no 1º login; Membro tem só nome/e-mail/papel/status; múltiplos Organizadores permitidos, mas o último ativo não pode ser rebaixado/desativado; primeiro Organizador é bootstrap manual fora do app; "remover" Membro é soft-delete (status inativo), preservando Histórico.
- [Ciclo de vida da Edição](./issues/02-ciclo-vida-edicao.md): só uma Edição aberta por vez; prazo único (Fase 2), extensível pelo Organizador; Organizador pode forçar avanço da Fase 1 escolhendo Estilo por quem não agiu; fechamento automático (todas as Entregas completas OU prazo vencido) ou manual (cancelamento se antes de qualquer atividade); Entregas pendentes ficam registráveis indefinidamente após o fechamento, sem travar a próxima Edição; Histórico deve expor Pendências por Membro. **Correção (ticket 07)**: Edição também define a meta de Entregas por participante (padrão 3, configurável na criação, fixa depois de aberta).
- [Fonte de dados BJCP](./issues/03-fonte-dados-bjcp.md): BJCP não publica o guia 2021 em formato estruturado; usar `beerjson/bjcp-json` (`bjcp_styleguide-2021.json`, MIT, 110 estilos) como fonte técnica, mas só reusar `id`/`name`/`category`/faixas numéricas (OG/FG/IBU/SRM/ABV) — o texto descritivo completo é copyright BJCP e não pode ser reproduzido no bundle sem autorização.
- [Esquema Firestore e acesso](./issues/04-esquema-firestore-acesso.md): coleções `membros` (id = e-mail sanitizado), `edicoes` (com subcoleções `pool` e `selecoes`, ambas com id = ID do Membro) e `estado/atual` (singleton pra garantir uma Edição aberta por vez); Estilos BJCP continuam asset estático; leitura ampla pra Sorteio/Histórico, escrita restrita por papel e self-service pra Entregas; agregações do Histórico calculadas no cliente; Edição cancelada mantém o doc com status `cancelada`. **Correção (ticket 07)**: `selecoes/{membroId}` não é mais um array fixo de "slots" com Estilo pré-escolhido — é só a lista das Entregas já registradas (`{styleId, observation, deliveredAt}`); Pendência = `metaEntregas` do doc da Edição menos o tamanho desse array.
- [Protótipo: gestão de membros](./issues/05-prototipo-gestao-membros.md): tela em cards agrupados por status (Ativos/Inativos); cadastro via card "+ Novo membro" com mini-formulário inline; ações Promover/Rebaixar e Desativar como botões no card (Inativos só têm "Reativar"); guarda do último Organizador ativo desabilita os botões e mostra aviso de texto no próprio card. Protótipo (3 variantes) na branch `prototype/gestao-membros`.
- [Protótipo: criação de edição](./issues/06-prototipo-criacao-edicao.md): stepper por fase (Pool → Seleção Final → Fechamento) no topo; painel lateral com prazo/ações (estender, forçar avanço, fechar) + grade de cards de participante; Fechamento é um estado próprio (não um reset) mostrando resultado Concluída/Cancelada e permitindo abrir a próxima Edição direto dali. Protótipo (3 variantes) na branch `prototype/criacao-edicao`. **Correção (ticket 07)**: formulário de abertura ganha um segundo campo (meta de Entregas, padrão 3); protótipo em código não foi atualizado, só a decisão em texto.
- [Protótipo: histórico](./issues/07-prototipo-historico.md): abas por categoria (Edições / Por Membro / Por Estilo / Pendências); Edições mostram os Estilos entregues como chips; Pendências é uma linha por (Membro, Edição) com a quantidade devida, sem Estilo (só conhecido no ato da Entrega). Protótipo (3 variantes) na branch `prototype/historico`. Este ticket também corrigiu a mecânica da Fase 2 nos tickets 02, 04 e 06, e no `CONTEXT.md` — ver detalhes no próprio ticket.

## Not yet specified

(vazio — a fronteira de decisões de texto está fechada; todos os tickets do mapa foram resolvidos)

## Out of scope

- **Avaliação/feedback de cervejas** (dar nota, comentar, avaliar as entregas): confirmado pelo usuário como um esforço futuro separado, fora deste destino.
- **Formato "Estilo único"** (1 Estilo escolhido pra Edição inteira, todos entregam esse mesmo Estilo — o formato anterior à mecânica de Pool dos tickets 02/04): usuário confirmou que não é reproduzível com a mecânica atual (Fase 1 exige Estilos distintos por participante; a escolha de Entrega é individual, não amarrada a um Estilo comum). Cogitado como possível mudança futura, não decidido — não vira ticket deste mapa.
