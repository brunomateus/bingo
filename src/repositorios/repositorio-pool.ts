import type { EdicaoId } from '../domain/edicao'
import type { ReivindicacaoPool } from '../domain/entrega'

/**
 * Acesso a `edicoes/{id}/pool` (SPEC.md §7). Os dois métodos de escrita existem
 * separados porque têm permissões diferentes: um Membro só escreve a própria
 * reivindicação; escrever pelos outros é o "forçar avanço" do Organizador.
 */
export interface RepositorioPool {
  listar(edicaoId: EdicaoId): Promise<ReivindicacaoPool[]>
  reivindicar(edicaoId: EdicaoId, reivindicacao: ReivindicacaoPool): Promise<void>
  reivindicarEmNomeDeOutros(edicaoId: EdicaoId, reivindicacoes: readonly ReivindicacaoPool[]): Promise<void>
}
