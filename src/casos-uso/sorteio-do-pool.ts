import { exigirEstilo } from '../catalogo/catalogo-estilos'
import type { EdicaoId } from '../domain/edicao'
import type { EstiloId } from '../domain/estilo'
import type { MembroId } from '../domain/membro'
import { validarReivindicacao } from '../domain/regras-da-edicao'
import { ErroDeRegra } from '../domain/erro-de-regra'
import type { RepositorioEdicoes } from '../repositorios/repositorio-edicoes'
import type { RepositorioPool } from '../repositorios/repositorio-pool'

/**
 * A Fase 1 pela mão do próprio Membro: reivindicar um Estilo para o Pool
 * (SPEC.md §4). Estritamente self-service — ninguém reivindica pelo outro aqui;
 * isso é o "forçar avanço" do Organizador, em `CicloDaEdicao`.
 *
 * @example await new SorteioDoPool(edicoes, pool).reivindicar('edicao-1', 'ana@x.com', '21A')
 */
export class SorteioDoPool {
  private readonly edicoes: RepositorioEdicoes
  private readonly pool: RepositorioPool

  constructor(edicoes: RepositorioEdicoes, pool: RepositorioPool) {
    this.edicoes = edicoes
    this.pool = pool
  }

  async reivindicar(edicaoId: EdicaoId, membroId: MembroId, styleId: EstiloId): Promise<void> {
    const edicao = await this.edicoes.buscarPorId(edicaoId)
    if (!edicao) {
      throw new ErroDeRegra(`Edição não encontrada: ${edicaoId}.`)
    }
    exigirEstilo(styleId)
    validarReivindicacao(edicao, await this.pool.listar(edicaoId), membroId, styleId)
    await this.pool.reivindicar(edicaoId, { membroId, styleId })
  }
}
