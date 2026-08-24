import type { EdicaoId } from '../domain/edicao'
import type { Entrega, EntregasDoMembro } from '../domain/entrega'
import type { MembroId } from '../domain/membro'
import type { RepositorioEntregas } from './repositorio-entregas'

type EntregasPorMembro = Map<MembroId, Entrega[]>

/**
 * Entregas em memória para testes. Reproduz só a garantia de armazenamento
 * (não repetir `styleId` do próprio Membro), que em produção vem da transação.
 *
 * @example const entregas = new FakeRepositorioEntregas({ 'edicao-1': { 'ana@x.com': [entrega] } })
 */
export class FakeRepositorioEntregas implements RepositorioEntregas {
  private readonly porEdicao = new Map<EdicaoId, EntregasPorMembro>()

  constructor(inicial: Readonly<Record<EdicaoId, Readonly<Record<MembroId, readonly Entrega[]>>>> = {}) {
    for (const [edicaoId, porMembro] of Object.entries(inicial)) {
      const mapa: EntregasPorMembro = new Map()
      for (const [membroId, entregas] of Object.entries(porMembro)) {
        mapa.set(membroId, entregas.map((entrega) => ({ ...entrega })))
      }
      this.porEdicao.set(edicaoId, mapa)
    }
  }

  async listarPorEdicao(edicaoId: EdicaoId): Promise<EntregasDoMembro[]> {
    const porMembro = this.porEdicao.get(edicaoId) ?? new Map<MembroId, Entrega[]>()
    return [...porMembro.entries()].map(([membroId, entregas]) => ({
      membroId,
      entregas: entregas.map((entrega) => ({ ...entrega }))
    }))
  }

  async buscarDoMembro(edicaoId: EdicaoId, membroId: MembroId): Promise<Entrega[]> {
    const entregas = this.porEdicao.get(edicaoId)?.get(membroId) ?? []
    return entregas.map((entrega) => ({ ...entrega }))
  }

  async registrar(edicaoId: EdicaoId, membroId: MembroId, entrega: Entrega): Promise<void> {
    const porMembro = this.porEdicao.get(edicaoId) ?? new Map<MembroId, Entrega[]>()
    const atuais = porMembro.get(membroId) ?? []
    if (atuais.some((registrada) => registrada.styleId === entrega.styleId)) {
      throw new Error(
        `Entrega duplicada em ${edicaoId}/${membroId}: ${entrega.styleId}. Esperado um styleId ainda não entregue.`
      )
    }
    porMembro.set(membroId, [...atuais, { ...entrega }])
    this.porEdicao.set(edicaoId, porMembro)
  }
}
