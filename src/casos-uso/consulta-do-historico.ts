import {
  ordenarPorFechamento,
  pendenciasEmAberto,
  producaoPorMembro,
  rankingPorEstilo,
  type ContagemDeEstilo,
  type EdicaoComEntregas,
  type LinhaDePendencia,
  type ProducaoDeMembro
} from '../domain/agregacoes-do-historico'
import type { Edicao, EdicaoId } from '../domain/edicao'
import type { ReivindicacaoPool } from '../domain/entrega'
import type { MembroId } from '../domain/membro'
import type { RepositorioEdicoes } from '../repositorios/repositorio-edicoes'
import type { RepositorioEntregas } from '../repositorios/repositorio-entregas'
import type { RepositorioMembros } from '../repositorios/repositorio-membros'
import type { RepositorioPool } from '../repositorios/repositorio-pool'

/** As quatro visões do Histórico (SPEC.md §5), já agregadas para a tela. */
export interface Historico {
  /** Edições concluídas, da mais recente para a mais antiga. */
  edicoes: EdicaoComEntregas[]
  producao: ProducaoDeMembro[]
  ranking: ContagemDeEstilo[]
  /** Inclui a Edição em curso: Pendência existe independente do fechamento. */
  pendencias: LinhaDePendencia[]
  nomePorMembro: Record<MembroId, string>
  edicaoPorId: Record<EdicaoId, Edicao>
  /** Pool de cada Edição citada — é dele que sai o Estilo de uma Entrega atrasada. */
  poolPorEdicao: Record<EdicaoId, ReivindicacaoPool[]>
}

/**
 * Monta o Histórico no cliente, a partir de queries simples: as Edições
 * concluídas mais a em curso, e as Entregas de cada uma. Sem pré-computação no
 * servidor — o volume esperado é pequeno (SPEC.md §5).
 *
 * @example const { ranking } = await new ConsultaDoHistorico(edicoes, entregas, membros).carregar()
 */
export class ConsultaDoHistorico {
  private readonly edicoes: RepositorioEdicoes
  private readonly entregas: RepositorioEntregas
  private readonly membros: RepositorioMembros
  private readonly pool: RepositorioPool

  constructor(
    edicoes: RepositorioEdicoes,
    entregas: RepositorioEntregas,
    membros: RepositorioMembros,
    pool: RepositorioPool
  ) {
    this.edicoes = edicoes
    this.entregas = entregas
    this.membros = membros
    this.pool = pool
  }

  async carregar(): Promise<Historico> {
    const concluidas = await this.comEntregas(await this.edicoes.listarConcluidas())
    const aberta = await this.edicoes.buscarAberta()
    // Produção e ranking olham só o Histórico (Edições concluídas); Pendências
    // também conta a Edição em curso, porque ela já cria compromisso.
    const paraPendencias = aberta ? [...concluidas, ...(await this.comEntregas([aberta]))] : concluidas
    return {
      edicoes: ordenarPorFechamento(concluidas),
      producao: producaoPorMembro(concluidas),
      ranking: rankingPorEstilo(concluidas),
      pendencias: pendenciasEmAberto(paraPendencias),
      nomePorMembro: await this.nomes(),
      edicaoPorId: Object.fromEntries(paraPendencias.map(({ edicao }) => [edicao.id, edicao])),
      poolPorEdicao: await this.pools(paraPendencias.map(({ edicao }) => edicao.id))
    }
  }

  private async comEntregas(edicoes: readonly Edicao[]): Promise<EdicaoComEntregas[]> {
    return await Promise.all(
      edicoes.map(async (edicao) => ({
        edicao,
        entregasPorMembro: await this.entregas.listarPorEdicao(edicao.id)
      }))
    )
  }

  private async pools(edicaoIds: readonly EdicaoId[]): Promise<Record<EdicaoId, ReivindicacaoPool[]>> {
    const pools = await Promise.all(edicaoIds.map(async (id) => [id, await this.pool.listar(id)] as const))
    return Object.fromEntries(pools)
  }

  private async nomes(): Promise<Record<MembroId, string>> {
    const membros = await this.membros.listar()
    return Object.fromEntries(membros.map((membro) => [membro.id, membro.nome]))
  }
}
