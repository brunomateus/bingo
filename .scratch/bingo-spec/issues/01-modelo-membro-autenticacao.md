Part of: [Spec do Bingo (próxima fase)](../map.md)
Type: grilling
Status: resolved

## Question

Como o Firebase Auth UID se liga ao registro de Membro no Firestore? Quem pode logar (qualquer conta Google, ou só e-mails já cadastrados como Membro)? Como o primeiro Organizador é definido/promovido, e como um Organizador promove/rebaixa outros Membros? Que dados um Membro guarda (nome, e-mail, papel, status ativo/inativo)? O que acontece com as Edições e Entregas passadas de um Membro removido da confraria?

## Answer

- **Login**: só contas Google cujo e-mail corresponde a um Membro cadastrado e **ativo** conseguem entrar; toda tentativa de login (não só a primeira) revalida isso.
- **Vínculo UID ↔ Membro**: o Organizador cria o registro de Membro com e-mail antes de qualquer login; o Firebase Auth UID é gravado no registro no primeiro login bem-sucedido daquele e-mail.
- **Campos do Membro**: nome, e-mail, papel (Organizador | Membro comum), status (ativo | inativo). Nada além disso.
- **Múltiplos Organizadores**: permitido simultaneamente, sem limite de um só.
- **Bootstrap do primeiro Organizador**: fora do app — cadastro manual único no Firestore (console/script) pelo dono do projeto; tarefa operacional de setup, não uma feature.
- **Promoção/rebaixamento**: um Organizador edita o campo papel de outro Membro pela tela de gestão de membros.
- **Guarda contra confraria sem Organizador**: o sistema impede rebaixar ou desativar o único Organizador ativo restante.
- **Remoção de Membro**: soft delete — marca status como inativo; o registro continua existindo e legível; Edições e Entregas passadas continuam mostrando o Membro normalmente no Histórico.

Glossário (`CONTEXT.md`) atualizado: novo termo **Status**, e **Membro**/**Papel** sharpened para refletir essas decisões.
