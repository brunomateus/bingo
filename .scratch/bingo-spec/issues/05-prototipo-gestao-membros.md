Part of: [Spec do Bingo (próxima fase)](../map.md)
Type: prototype
Status: resolved

## Question

Como é a tela de gestão de membros do Organizador (ticket 01: cadastrar Membro por nome+e-mail, editar papel Organizador/Membro comum, marcar ativo/inativo, com a guarda de não rebaixar/desativar o último Organizador ativo)? Construir um protótipo rápido e descartável (rascunho de UI) pra reagir e decidir o comportamento exato de cada ação na tela.

## Answer

Protótipo construído com 3 variantes estruturalmente diferentes (tabela única, cards por status, lista + detalhe), compartilhando o mesmo estado em memória para que a guarda do último Organizador ativo se comportasse de forma idêntica nas três. Rodado localmente em `/prototype/members`, `?variant=A|B|C`. Protótipo (código descartável) commitado na branch `prototype/gestao-membros`, fora da main.

**Vencedora: Variante B — Cards por status.**

- Membros agrupados em duas seções, **Ativos** e **Inativos**, cada membro como um card (nome, badge de papel, e-mail, ações).
- Cadastro de membro (nome + e-mail) via um card tracejado "+ Novo membro" que expande num mini-formulário inline dentro da própria grade de Ativos; papel inicial Membro comum, status inicial ativo (sem campo pra escolher isso no cadastro).
- Ações de papel (Promover/Rebaixar) e de status (Desativar) aparecem como botões diretamente no card do membro Ativo. Membros Inativos só têm a ação "Reativar" (sem edição de papel enquanto inativo).
- Guarda do último Organizador ativo: os botões Rebaixar/Desativar daquele card ficam desabilitados e um aviso de texto (⚠ + explicação) aparece embaixo dos botões, dentro do próprio card.
