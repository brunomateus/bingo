/**
 * Violação de uma regra do domínio (SPEC.md §2/§3), distinta de uma falha técnica:
 * a mensagem é escrita para ser mostrada ao usuário, e a UI trata este erro
 * como "ação recusada", não como bug.
 *
 * @example throw new ErroDeRegra('Já existe um Membro com o e-mail "ana@exemplo.com".')
 */
export class ErroDeRegra extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeRegra'
  }
}
