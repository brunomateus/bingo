import type { Edicao } from './edicao'
import type { Entrega, EntregasDoMembro, ReivindicacaoPool } from './entrega'
import { ErroDeRegra } from './erro-de-regra'
import type { Estilo, EstiloId } from './estilo'
import type { MembroId } from './membro'

/**
 * Quantas Entregas ainda faltam para o Membro cumprir a meta da Edição
 * (CONTEXT.md: Pendência). Nunca negativa — não existe "crédito".
 *
 * @example pendencia(3, entregasJaFeitas) // 1
 */
export function pendencia(metaEntregas: number, entregas: readonly Entrega[]): number {
  return Math.max(metaEntregas - entregas.length, 0)
}

/** Entregas de um Membro numa Edição; lista vazia para quem ainda não entregou nada. */
export function entregasDe(entregasPorMembro: readonly EntregasDoMembro[], membroId: MembroId): Entrega[] {
  return entregasPorMembro.find((registro) => registro.membroId === membroId)?.entregas ?? []
}

/**
 * Se todo participante zerou sua Pendência — uma das duas condições de fechamento
 * automático da Edição (SPEC.md §3; a outra é o prazo vencer).
 */
export function todosCumpriramAMeta(edicao: Edicao, entregasPorMembro: readonly EntregasDoMembro[]): boolean {
  return edicao.participantes.every(
    (participante) => pendencia(edicao.metaEntregas, entregasDe(entregasPorMembro, participante)) === 0
  )
}

/**
 * Estilos que este Membro ainda pode entregar: os do Pool da Edição, menos os que
 * ele mesmo já entregou. Outro Membro pode repetir o mesmo Estilo (SPEC.md §4).
 */
export function estilosEntregaveis(
  estilos: readonly Estilo[],
  pool: readonly ReivindicacaoPool[],
  entregasDoMembro: readonly Entrega[]
): Estilo[] {
  const noPool = new Set(pool.map((reivindicacao) => reivindicacao.styleId))
  const jaEntregues = new Set(entregasDoMembro.map((entrega) => entrega.styleId))
  return estilos.filter((estilo) => noPool.has(estilo.id) && !jaEntregues.has(estilo.id))
}

/**
 * Valida o registro de uma Entrega. A Edição pode estar fechada: Entregas
 * pendentes continuam registráveis indefinidamente (SPEC.md §3/§4).
 */
export function validarEntrega(
  edicao: Edicao,
  pool: readonly ReivindicacaoPool[],
  entregasDoMembro: readonly Entrega[],
  membroId: MembroId,
  styleId: EstiloId
): void {
  if (!edicao.participantes.includes(membroId)) {
    throw new ErroDeRegra(`${membroId} não é participante desta Edição.`)
  }
  if (pendencia(edicao.metaEntregas, entregasDoMembro) === 0) {
    throw new ErroDeRegra(`Você já cumpriu as ${edicao.metaEntregas} Entregas desta Edição.`)
  }
  if (!pool.some((reivindicacao) => reivindicacao.styleId === styleId)) {
    throw new ErroDeRegra(`O Estilo ${styleId} não está no Pool desta Edição. Escolha um dos Estilos reivindicados.`)
  }
  if (entregasDoMembro.some((entrega) => entrega.styleId === styleId)) {
    throw new ErroDeRegra(`Você já entregou o Estilo ${styleId} nesta Edição. Escolha outro Estilo do Pool.`)
  }
}
