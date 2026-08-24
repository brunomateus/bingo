import type { EstiloId } from './estilo'
import type { MembroId } from './membro'

/**
 * Reivindicação de Fase 1: o Estilo que um Membro trouxe para o Pool da Edição.
 * Persistida em `edicoes/{id}/pool/{membroId}` (SPEC.md §7).
 */
export interface ReivindicacaoPool {
  membroId: MembroId
  styleId: EstiloId
}

/**
 * Uma Entrega já registrada. Os nomes dos campos seguem o schema do SPEC.md §7
 * (`edicoes/{id}/selecoes/{membroId}`): não há flag de entregue — a presença do
 * item já significa entregue.
 */
export interface Entrega {
  styleId: EstiloId
  observation: string
  deliveredAt: string
}

/** Todas as Entregas de um Membro numa Edição. */
export interface EntregasDoMembro {
  membroId: MembroId
  entregas: Entrega[]
}
