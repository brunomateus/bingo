/** Id de um Membro: o e-mail normalizado, usado como id do documento em `membros`. */
export type MembroId = string

/** Nível de permissão de um Membro (CONTEXT.md: Papel). */
export type Papel = 'organizador' | 'membro-comum'

/** Se um Membro pode logar e integrar novas Edições (CONTEXT.md: Status). */
export type StatusMembro = 'ativo' | 'inativo'

/**
 * Uma pessoa da confraria. Cadastrada por um Organizador antes de qualquer login;
 * `uid` fica nulo até o primeiro login bem-sucedido daquele e-mail (SPEC.md §2).
 */
export interface Membro {
  id: MembroId
  nome: string
  email: string
  papel: Papel
  status: StatusMembro
  uid: string | null
}
