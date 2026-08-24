import type { Edicao } from '../domain/edicao'
import type { EntregasDoMembro, ReivindicacaoPool } from '../domain/entrega'
import type { MembroId } from '../domain/membro'
import type { RepositorioEdicoes } from '../repositorios/repositorio-edicoes'
import type { RepositorioEntregas } from '../repositorios/repositorio-entregas'
import type { RepositorioMembros } from '../repositorios/repositorio-membros'
import type { RepositorioPool } from '../repositorios/repositorio-pool'

/** Tudo que a tela do Sorteio mostra de uma vez: a Edição, seu Pool e os nomes. */
export interface EdicaoEmCurso {
  edicao: Edicao | null
  reivindicacoes: ReivindicacaoPool[]
  entregasPorMembro: EntregasDoMembro[]
  /** Nome de cada participante — o Pool guarda só ids (SPEC.md §7). */
  nomePorMembro: Record<MembroId, string>
}

/**
 * Leitura da Edição aberta e do seu Pool, em uma chamada só, para a tela não ter
 * que orquestrar três repositórios.
 *
 * @example const { edicao, reivindicacoes } = await consulta.carregar()
 */
export class ConsultaDaEdicaoAtual {
  private readonly edicoes: RepositorioEdicoes
  private readonly pool: RepositorioPool
  private readonly membros: RepositorioMembros
  private readonly entregas: RepositorioEntregas

  constructor(
    edicoes: RepositorioEdicoes,
    pool: RepositorioPool,
    membros: RepositorioMembros,
    entregas: RepositorioEntregas
  ) {
    this.edicoes = edicoes
    this.pool = pool
    this.membros = membros
    this.entregas = entregas
  }

  async carregar(): Promise<EdicaoEmCurso> {
    const edicao = await this.edicoes.buscarAberta()
    return {
      edicao,
      reivindicacoes: edicao ? await this.pool.listar(edicao.id) : [],
      entregasPorMembro: edicao ? await this.entregas.listarPorEdicao(edicao.id) : [],
      nomePorMembro: await this.nomes()
    }
  }

  /** Recarrega só o Pool — usado depois de uma reivindicação. */
  async recarregarPool(edicaoId: string): Promise<ReivindicacaoPool[]> {
    return await this.pool.listar(edicaoId)
  }

  /** Recarrega só as Entregas — usado depois de registrar uma. */
  async recarregarEntregas(edicaoId: string): Promise<EntregasDoMembro[]> {
    return await this.entregas.listarPorEdicao(edicaoId)
  }

  private async nomes(): Promise<Record<MembroId, string>> {
    const membros = await this.membros.listar()
    return Object.fromEntries(membros.map((membro) => [membro.id, membro.nome]))
  }
}
