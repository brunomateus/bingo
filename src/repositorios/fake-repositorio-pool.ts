import type { EdicaoId } from '../domain/edicao'
import type { ReivindicacaoPool } from '../domain/entrega'
import type { RepositorioPool } from './repositorio-pool'

/**
 * Pool em memória para testes. Como o fake de Membros, é só armazenamento — quem
 * recusa Estilo repetido é o domínio, e em produção também a regra de escrita.
 *
 * @example const pool = new FakeRepositorioPool({ 'edicao-1': [{ membroId, styleId }] })
 */
export class FakeRepositorioPool implements RepositorioPool {
  private readonly reivindicacoesPorEdicao = new Map<EdicaoId, ReivindicacaoPool[]>()

  constructor(inicial: Readonly<Record<EdicaoId, readonly ReivindicacaoPool[]>> = {}) {
    for (const [edicaoId, reivindicacoes] of Object.entries(inicial)) {
      this.reivindicacoesPorEdicao.set(
        edicaoId,
        reivindicacoes.map((reivindicacao) => ({ ...reivindicacao }))
      )
    }
  }

  async listar(edicaoId: EdicaoId): Promise<ReivindicacaoPool[]> {
    const reivindicacoes = this.reivindicacoesPorEdicao.get(edicaoId) ?? []
    return reivindicacoes.map((reivindicacao) => ({ ...reivindicacao }))
  }

  async reivindicar(edicaoId: EdicaoId, reivindicacao: ReivindicacaoPool): Promise<void> {
    await this.reivindicarEmNomeDeOutros(edicaoId, [reivindicacao])
  }

  async reivindicarEmNomeDeOutros(edicaoId: EdicaoId, reivindicacoes: readonly ReivindicacaoPool[]): Promise<void> {
    const atuais = this.reivindicacoesPorEdicao.get(edicaoId) ?? []
    this.reivindicacoesPorEdicao.set(edicaoId, [...atuais, ...reivindicacoes.map((r) => ({ ...r }))])
  }
}
