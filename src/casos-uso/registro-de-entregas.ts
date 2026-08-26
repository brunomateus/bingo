import { exigirEstilo } from '../catalogo/catalogo-estilos'
import type { EdicaoId } from '../domain/edicao'
import type { Entrega } from '../domain/entrega'
import { ErroDeRegra } from '../domain/erro-de-regra'
import type { EstiloId } from '../domain/estilo'
import type { MembroId } from '../domain/membro'
import { validarEntrega } from '../domain/regras-da-entrega'
import type { RepositorioEdicoes } from '../repositorios/repositorio-edicoes'
import type { RepositorioEntregas } from '../repositorios/repositorio-entregas'
import type { RepositorioPool } from '../repositorios/repositorio-pool'

/**
 * A Fase 2 pela mão do próprio Membro: registrar uma Entrega escolhendo o Estilo
 * no ato (SPEC.md §4). Estritamente self-service — nem o Organizador registra
 * Entrega por outro.
 *
 * @example await registro.registrar('edicao-1', 'ana@x.com', '21A', 'entregue no bar do Zé')
 */
export class RegistroDeEntregas {
  private readonly edicoes: RepositorioEdicoes
  private readonly pool: RepositorioPool
  private readonly entregas: RepositorioEntregas
  private readonly agora: () => Date

  constructor(
    edicoes: RepositorioEdicoes,
    pool: RepositorioPool,
    entregas: RepositorioEntregas,
    agora: () => Date = () => new Date()
  ) {
    this.edicoes = edicoes
    this.pool = pool
    this.entregas = entregas
    this.agora = agora
  }

  /** A Edição pode estar fechada: Pendência não expira (SPEC.md §3). */
  async registrar(edicaoId: EdicaoId, membroId: MembroId, styleId: EstiloId, observation: string): Promise<Entrega> {
    const edicao = await this.edicoes.buscarPorId(edicaoId)
    if (!edicao) {
      throw new ErroDeRegra(`Edição não encontrada: ${edicaoId}.`)
    }
    exigirEstilo(styleId)
    const jaEntregues = await this.entregas.buscarDoMembro(edicaoId, membroId)
    validarEntrega(edicao, await this.pool.listar(edicaoId), jaEntregues, membroId, styleId)
    const entrega: Entrega = { styleId, observation, deliveredAt: this.agora().toISOString() }
    await this.entregas.registrar(edicaoId, membroId, entrega)
    return entrega
  }
}
