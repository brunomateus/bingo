import { exigirEstilo } from '../catalogo/catalogo-estilos'
import type { Edicao, EdicaoId, ResultadoDeFechamento } from '../domain/edicao'
import type { ReivindicacaoPool } from '../domain/entrega'
import { ErroDeRegra } from '../domain/erro-de-regra'
import type { EstiloId } from '../domain/estilo'
import type { MembroId } from '../domain/membro'
import {
  participantesPendentes,
  prazoVencido,
  resultadoDoFechamento,
  validarAbertura,
  validarExtensaoDePrazo
} from '../domain/regras-da-edicao'
import { todosCumpriramAMeta } from '../domain/regras-da-entrega'
import type { RepositorioEdicoes } from '../repositorios/repositorio-edicoes'
import type { RepositorioEntregas } from '../repositorios/repositorio-entregas'
import type { RepositorioMembros } from '../repositorios/repositorio-membros'
import type { RepositorioPool } from '../repositorios/repositorio-pool'

/** Estilo escolhido pelo Organizador em nome de cada participante pendente. */
export type EscolhasDoAvancoForcado = Readonly<Record<MembroId, EstiloId>>

/**
 * As ações do Organizador sobre o ciclo de vida da Edição (SPEC.md §3): abrir,
 * estender prazo, forçar o avanço da Fase 1 e fechar.
 *
 * @example await new CicloDaEdicao(edicoes, pool, membros).abrir('2026-12-31', 3)
 */
export class CicloDaEdicao {
  private readonly edicoes: RepositorioEdicoes
  private readonly pool: RepositorioPool
  private readonly membros: RepositorioMembros
  private readonly entregas: RepositorioEntregas
  private readonly agora: () => Date

  constructor(
    edicoes: RepositorioEdicoes,
    pool: RepositorioPool,
    membros: RepositorioMembros,
    entregas: RepositorioEntregas,
    agora: () => Date = () => new Date()
  ) {
    this.edicoes = edicoes
    this.pool = pool
    this.membros = membros
    this.entregas = entregas
    this.agora = agora
  }

  /** Abre a Edição com todos os Membros ativos do momento como participantes. */
  async abrir(prazo: string, metaEntregas: number): Promise<Edicao> {
    await this.recusarSeJaHaEdicaoAberta()
    const participantes = await this.membrosAtivos()
    validarAbertura({ prazo, metaEntregas, participantes }, this.agora())
    return await this.edicoes.abrir({ prazo, metaEntregas, participantes })
  }

  async estenderPrazo(id: EdicaoId, novoPrazo: string): Promise<void> {
    validarExtensaoDePrazo(await this.exigirEdicao(id), novoPrazo)
    await this.edicoes.estenderPrazo(id, novoPrazo)
  }

  /**
   * Encerra a Fase 1 reivindicando, em nome de quem ainda não agiu, um dos Estilos
   * restantes. Como a fase é derivada do Pool, completar o Pool já avança a Edição.
   */
  async forcarAvancoDaFase1(id: EdicaoId, escolhas: EscolhasDoAvancoForcado): Promise<void> {
    const edicao = await this.exigirEdicaoAberta(id)
    const reivindicacoes = await this.pool.listar(id)
    const pendentes = participantesPendentes(edicao, reivindicacoes)
    const novas = this.montarReivindicacoes(pendentes, escolhas, reivindicacoes)
    await this.pool.reivindicarEmNomeDeOutros(id, novas)
  }

  /** Fecha manualmente: vira cancelamento se nada aconteceu na Edição (SPEC.md §3). */
  async fechar(id: EdicaoId): Promise<ResultadoDeFechamento> {
    await this.exigirEdicaoAberta(id)
    const reivindicacoes = await this.pool.listar(id)
    const entregasPorMembro = await this.entregas.listarPorEdicao(id)
    const total = entregasPorMembro.reduce((soma, registro) => soma + registro.entregas.length, 0)
    const status = resultadoDoFechamento(reivindicacoes, total)
    await this.edicoes.fechar(id, status, this.agora().toISOString())
    return status
  }

  /**
   * Fechamento automático (SPEC.md §3): todos cumpriram a meta OU o prazo venceu,
   * o que ocorrer primeiro. Sem backend não há cron — quem dispara é um Organizador
   * ao abrir a tela, porque só ele pode escrever no documento da Edição (ADR 0001).
   */
  async fecharSePossivel(edicao: Edicao): Promise<ResultadoDeFechamento | null> {
    if (edicao.status !== 'aberta') {
      return null
    }
    const cumprida = todosCumpriramAMeta(edicao, await this.entregas.listarPorEdicao(edicao.id))
    if (!cumprida && !prazoVencido(edicao, this.agora())) {
      return null
    }
    return await this.fechar(edicao.id)
  }

  private montarReivindicacoes(
    pendentes: readonly MembroId[],
    escolhas: EscolhasDoAvancoForcado,
    jaNoPool: readonly ReivindicacaoPool[]
  ): ReivindicacaoPool[] {
    const faltando = pendentes.filter((membroId) => !escolhas[membroId])
    if (faltando.length > 0) {
      throw new ErroDeRegra(`Escolha um Estilo para cada participante pendente. Faltou: ${faltando.join(', ')}.`)
    }
    const tomados = new Set(jaNoPool.map((reivindicacao) => reivindicacao.styleId))
    return pendentes.map((membroId) => ({ membroId, styleId: this.estiloLivre(escolhas[membroId], tomados) }))
  }

  private estiloLivre(styleId: EstiloId, tomados: Set<EstiloId>): EstiloId {
    exigirEstilo(styleId)
    if (tomados.has(styleId)) {
      throw new ErroDeRegra(`O Estilo ${styleId} foi escolhido duas vezes. Cada Estilo entra uma única vez no Pool.`)
    }
    tomados.add(styleId)
    return styleId
  }

  private async membrosAtivos(): Promise<MembroId[]> {
    const membros = await this.membros.listar()
    return membros.filter((membro) => membro.status === 'ativo').map((membro) => membro.id)
  }

  private async recusarSeJaHaEdicaoAberta(): Promise<void> {
    const aberta = await this.edicoes.buscarAberta()
    if (aberta) {
      throw new ErroDeRegra(`A Edição com prazo ${aberta.prazo} ainda está aberta. Feche-a antes de abrir a próxima.`)
    }
  }

  private async exigirEdicaoAberta(id: EdicaoId): Promise<Edicao> {
    const edicao = await this.exigirEdicao(id)
    if (edicao.status !== 'aberta') {
      throw new ErroDeRegra('Esta Edição já foi fechada.')
    }
    return edicao
  }

  private async exigirEdicao(id: EdicaoId): Promise<Edicao> {
    const edicao = await this.edicoes.buscarPorId(id)
    if (!edicao) {
      throw new ErroDeRegra(`Edição não encontrada: ${id}.`)
    }
    return edicao
  }
}
