Part of: [Spec do Bingo (próxima fase)](../map.md)
Type: prototype
Status: resolved

## Question

Como é a tela de Histórico (ticket 02 + ticket 04: lista cronológica de Edições concluídas, agregações de Estilos já produzidos por Membro, quantas vezes cada Estilo foi escolhido em Seleções Finais, e a lista de Pendências por Membro — incluindo entregas pendentes de Edições já fechadas, registráveis a qualquer momento)? Construir um protótipo rápido e descartável pra reagir e decidir como cada visão é apresentada.

## Answer

Protótipo construído com 3 variantes estruturalmente diferentes (abas por categoria, relatório único em rolagem, master-detail por membro). Rodado localmente em `/prototype/historico`, `?variant=A|B|C`, compartilhando o mesmo dataset em memória (3 Edições concluídas + 1 em curso, 6 Membros incluindo 1 inativo, pra exercitar que o Histórico preserva dados de Membros removidos). Protótipo (código descartável) commitado na branch `prototype/historico`, fora da main.

**Vencedora: Variante A — abas por categoria.**

- Barra de abas: **Edições**, **Por Membro**, **Por Estilo**, **Pendências**.
- **Edições**: lista cronológica; cada linha mostra a data de fechamento, um badge (tudo entregue / N pendente(s)) e os Estilos efetivamente entregues naquela Edição como chips (com `×N` quando mais de um Membro entregou o mesmo Estilo).
- **Por Membro**: tabela com os Estilos que cada Membro já produziu (chips), incluindo Membros inativos (marcados, mas presentes — Histórico não esconde dado de quem foi desativado).
- **Por Estilo**: ranking dos Estilos por quantas vezes já foram **entregues** (barra de progresso + contagem).
- **Pendências**: uma linha por (Membro, Edição), mostrando quantas Entregas faltam — nunca um Estilo específico, já que ele só é conhecido no ato da Entrega (ver correção abaixo).

## Correção de domínio surgida durante este ticket

Ao prototipar a visão de Pendências, ficou claro que o modelo decidido no ticket 02 (Membro escolhe até 3 Estilos do Pool antecipadamente, na Fase 2) não reflete a realidade: **o Membro não escolhe o Estilo com antecedência, só no ato de cada Entrega.** Isso foi grillado e fechado nesta sessão:

- Fase 2 deixa de ter uma etapa de seleção — vira um período de Entregas. Cada Membro se compromete a uma **quantidade** de Entregas por Edição (a "meta"), não a Estilos específicos.
- A meta é configurável pelo Organizador ao abrir a Edição (junto do prazo), padrão 3, igual para todos os participantes, fixa depois que a Edição abre.
- No ato de cada Entrega, o Membro escolhe o Estilo — precisa ser um Estilo do Pool da Edição, sem repetir um que ele mesmo já entregou nela.
- Pendência = meta − Entregas já registradas; sem Estilo até a Entrega acontecer.

Propagado para: [Ciclo de vida da Edição](./02-ciclo-vida-edicao.md) (nova seção "Correção"), [Esquema Firestore e acesso](./04-esquema-firestore-acesso.md) (schema de `selecoes` revisado), [Protótipo: criação de edição](./06-prototipo-criacao-edicao.md) (nota sobre campo novo no formulário de abertura) e `CONTEXT.md` (Fase 2 / Seleção Final, Entrega, Pendência e Histórico revisados).
