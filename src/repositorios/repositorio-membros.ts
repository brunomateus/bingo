import type { Membro, MembroId, Papel, StatusMembro } from '../domain/membro'

/**
 * Acesso à coleção `membros` (SPEC.md §7). Interface própria do projeto: o
 * Firestore fica atrás dela, e casos de uso recebem uma implementação por
 * parâmetro — nos testes, `FakeRepositorioMembros`.
 *
 * As operações espelham exatamente o que o SPEC.md §2 permite fazer com um
 * Membro; não há um `atualizar(campos)` genérico de propósito.
 */
export interface RepositorioMembros {
  listar(): Promise<Membro[]>
  /** Lookup direto por id (e-mail normalizado), usado na validação do login. */
  buscarPorId(id: MembroId): Promise<Membro | null>
  criar(membro: Membro): Promise<void>
  definirPapel(id: MembroId, papel: Papel): Promise<void>
  definirStatus(id: MembroId, status: StatusMembro): Promise<void>
  /** Grava o UID do Firebase Auth no primeiro login bem-sucedido daquele e-mail. */
  vincularUid(id: MembroId, uid: string): Promise<void>
}
