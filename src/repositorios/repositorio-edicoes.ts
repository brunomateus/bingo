import type { Edicao, EdicaoId, ResultadoDeFechamento } from '../domain/edicao'
import type { MembroId } from '../domain/membro'

export interface DadosDaNovaEdicao {
  prazo: string
  metaEntregas: number
  /** Snapshot dos Membros ativos no instante da abertura (SPEC.md §3). */
  participantes: MembroId[]
}

/**
 * Acesso à coleção `edicoes` e ao singleton `estado/atual` (SPEC.md §7).
 * `abrir` e `fechar` mexem nos dois em transação — é isso que garante, de fato e
 * não só na UI, no máximo uma Edição aberta por vez com vários Organizadores.
 */
export interface RepositorioEdicoes {
  /** A Edição apontada por `estado/atual`, ou `null` se nenhuma está aberta. */
  buscarAberta(): Promise<Edicao | null>
  /** As Edições que compõem o Histórico; canceladas ficam de fora (SPEC.md §5). */
  listarConcluidas(): Promise<Edicao[]>
  buscarPorId(id: EdicaoId): Promise<Edicao | null>
  abrir(dados: DadosDaNovaEdicao): Promise<Edicao>
  estenderPrazo(id: EdicaoId, prazo: string): Promise<void>
  fechar(id: EdicaoId, status: ResultadoDeFechamento, fechadaEm: string): Promise<void>
}
