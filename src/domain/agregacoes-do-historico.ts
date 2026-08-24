import type { Edicao, EdicaoId } from './edicao'
import type { Entrega, EntregasDoMembro } from './entrega'
import type { EstiloId } from './estilo'
import type { MembroId } from './membro'
import { entregasDe, pendencia } from './regras-da-entrega'

/** Uma Edição com tudo que foi entregue nela — a matéria-prima do Histórico. */
export interface EdicaoComEntregas {
  edicao: Edicao
  entregasPorMembro: EntregasDoMembro[]
}

/** Quantas vezes um Estilo foi entregue, num recorte qualquer. */
export interface ContagemDeEstilo {
  styleId: EstiloId
  quantidade: number
}

/** Uma Entrega junto da Edição em que aconteceu, para a visão por Membro. */
export interface EntregaNoHistorico {
  edicaoId: EdicaoId
  entrega: Entrega
}

export interface ProducaoDeMembro {
  membroId: MembroId
  entregas: EntregaNoHistorico[]
}

/** Quantas Entregas um Membro ainda deve numa Edição — sem Estilo determinado. */
export interface LinhaDePendencia {
  membroId: MembroId
  edicaoId: EdicaoId
  quantidade: number
}

/** Edições da mais recente para a mais antiga, pela data de fechamento (SPEC.md §5). */
export function ordenarPorFechamento(historico: readonly EdicaoComEntregas[]): EdicaoComEntregas[] {
  return [...historico].sort((uma, outra) => (outra.edicao.fechadaEm ?? '').localeCompare(uma.edicao.fechadaEm ?? ''))
}

/**
 * Os Estilos efetivamente entregues, com `quantidade` maior que 1 quando mais de
 * um Membro entregou o mesmo Estilo (os chips `×N` do ticket 07).
 *
 * @example contarEstilos(entregasPorMembro) // [{ styleId: '21A', quantidade: 2 }]
 */
export function contarEstilos(entregasPorMembro: readonly EntregasDoMembro[]): ContagemDeEstilo[] {
  const porEstilo = new Map<EstiloId, number>()
  for (const registro of entregasPorMembro) {
    for (const entrega of registro.entregas) {
      porEstilo.set(entrega.styleId, (porEstilo.get(entrega.styleId) ?? 0) + 1)
    }
  }
  return ordenarContagens(porEstilo)
}

/** Ranking de Estilos por vezes **entregues** — não "escolhidos" (SPEC.md §5). */
export function rankingPorEstilo(historico: readonly EdicaoComEntregas[]): ContagemDeEstilo[] {
  const porEstilo = new Map<EstiloId, number>()
  for (const { entregasPorMembro } of historico) {
    for (const { styleId, quantidade } of contarEstilos(entregasPorMembro)) {
      porEstilo.set(styleId, (porEstilo.get(styleId) ?? 0) + quantidade)
    }
  }
  return ordenarContagens(porEstilo)
}

/**
 * O que cada Membro já produziu, ao longo de todas as Edições. Inclui Membros
 * inativos: o Histórico preserva quem saiu da confraria (SPEC.md §5).
 */
export function producaoPorMembro(historico: readonly EdicaoComEntregas[]): ProducaoDeMembro[] {
  const porMembro = new Map<MembroId, EntregaNoHistorico[]>()
  for (const { edicao, entregasPorMembro } of historico) {
    for (const registro of entregasPorMembro) {
      const acumuladas = porMembro.get(registro.membroId) ?? []
      acumuladas.push(...registro.entregas.map((entrega) => ({ edicaoId: edicao.id, entrega })))
      porMembro.set(registro.membroId, acumuladas)
    }
  }
  return [...porMembro.entries()].map(([membroId, entregas]) => ({ membroId, entregas }))
}

/**
 * Uma linha por (Membro, Edição) com quantas Entregas faltam. Nunca traz Estilo:
 * ele só é conhecido no ato da Entrega (SPEC.md §5).
 */
export function pendenciasEmAberto(historico: readonly EdicaoComEntregas[]): LinhaDePendencia[] {
  const linhas: LinhaDePendencia[] = []
  for (const { edicao, entregasPorMembro } of historico) {
    for (const membroId of edicao.participantes) {
      const quantidade = pendencia(edicao.metaEntregas, entregasDe(entregasPorMembro, membroId))
      if (quantidade > 0) {
        linhas.push({ membroId, edicaoId: edicao.id, quantidade })
      }
    }
  }
  return linhas
}

/** Os Estilos de um Membro com quantas vezes ele entregou cada um, no Histórico todo. */
export function contarEstilosDeProducao(producao: ProducaoDeMembro): ContagemDeEstilo[] {
  return contarEstilos([{ membroId: producao.membroId, entregas: producao.entregas.map((item) => item.entrega) }])
}

/** Mais entregues primeiro; empate desempatado pelo id do Estilo, para dar ordem estável. */
function ordenarContagens(porEstilo: ReadonlyMap<EstiloId, number>): ContagemDeEstilo[] {
  return [...porEstilo.entries()]
    .map(([styleId, quantidade]) => ({ styleId, quantidade }))
    .sort((uma, outra) => outra.quantidade - uma.quantidade || uma.styleId.localeCompare(outra.styleId))
}
