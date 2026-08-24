import type { EdicaoId } from '../domain/edicao'
import type { Entrega, EntregasDoMembro } from '../domain/entrega'
import type { MembroId } from '../domain/membro'

/**
 * Acesso a `edicoes/{id}/selecoes` (SPEC.md §7): a lista de Entregas já
 * registradas por Membro. Sem campo `delivered` — a presença do item já significa
 * entregue; Pendência é `metaEntregas` menos o tamanho da lista, calculada no
 * cliente e nunca armazenada.
 */
export interface RepositorioEntregas {
  listarPorEdicao(edicaoId: EdicaoId): Promise<EntregasDoMembro[]>
  buscarDoMembro(edicaoId: EdicaoId, membroId: MembroId): Promise<Entrega[]>
  /**
   * Acrescenta a Entrega de forma atômica, recusando um `styleId` que o Membro já
   * tenha na Edição. É a garantia de armazenamento contra duas abas do mesmo
   * Membro registrando ao mesmo tempo; a recusa amigável vem antes, no caso de uso.
   */
  registrar(edicaoId: EdicaoId, membroId: MembroId, entrega: Entrega): Promise<void>
}
