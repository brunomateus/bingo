import type { Edicao, EdicaoId, ResultadoDeFechamento } from '../domain/edicao'
import type { DadosDaNovaEdicao, RepositorioEdicoes } from './repositorio-edicoes'

/**
 * Edições em memória para testes, incluindo o singleton `estado/atual`: reproduz a
 * recusa de abrir uma segunda Edição, que em produção vem da transação.
 *
 * @example const repositorio = new FakeRepositorioEdicoes()
 */
export class FakeRepositorioEdicoes implements RepositorioEdicoes {
  private readonly edicoesPorId = new Map<EdicaoId, Edicao>()
  private idDaEdicaoAberta: EdicaoId | null = null
  private proximoNumero = 1

  constructor(edicoesIniciais: readonly Edicao[] = []) {
    for (const edicao of edicoesIniciais) {
      this.edicoesPorId.set(edicao.id, { ...edicao })
      if (edicao.status === 'aberta') {
        this.idDaEdicaoAberta = edicao.id
      }
    }
  }

  async buscarAberta(): Promise<Edicao | null> {
    return this.idDaEdicaoAberta ? await this.buscarPorId(this.idDaEdicaoAberta) : null
  }

  async listarConcluidas(): Promise<Edicao[]> {
    return [...this.edicoesPorId.values()]
      .filter((edicao) => edicao.status === 'concluida')
      .map((edicao) => ({ ...edicao, participantes: [...edicao.participantes] }))
  }

  async buscarPorId(id: EdicaoId): Promise<Edicao | null> {
    const edicao = this.edicoesPorId.get(id)
    return edicao ? { ...edicao, participantes: [...edicao.participantes] } : null
  }

  async abrir(dados: DadosDaNovaEdicao): Promise<Edicao> {
    if (this.idDaEdicaoAberta) {
      throw new Error(`Já existe uma Edição aberta: ${this.idDaEdicaoAberta}. Esperado nenhuma Edição aberta.`)
    }
    const edicao: Edicao = { id: `edicao-${this.proximoNumero++}`, status: 'aberta', fechadaEm: null, ...dados }
    this.edicoesPorId.set(edicao.id, edicao)
    this.idDaEdicaoAberta = edicao.id
    return { ...edicao }
  }

  async estenderPrazo(id: EdicaoId, prazo: string): Promise<void> {
    this.edicoesPorId.set(id, { ...this.exigirEdicao(id), prazo })
  }

  async fechar(id: EdicaoId, status: ResultadoDeFechamento, fechadaEm: string): Promise<void> {
    this.edicoesPorId.set(id, { ...this.exigirEdicao(id), status, fechadaEm })
    if (this.idDaEdicaoAberta === id) {
      this.idDaEdicaoAberta = null
    }
  }

  private exigirEdicao(id: EdicaoId): Edicao {
    const edicao = this.edicoesPorId.get(id)
    if (!edicao) {
      throw new Error(`Edição inexistente: ${JSON.stringify(id)}. Esperado o id de uma Edição já criada.`)
    }
    return edicao
  }
}
