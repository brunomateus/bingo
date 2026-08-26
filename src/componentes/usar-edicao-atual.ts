import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { listarEstilos } from '../catalogo/catalogo-estilos'
import type { CicloDaEdicao, EscolhasDoAvancoForcado } from '../casos-uso/ciclo-da-edicao'
import type { ConsultaDaEdicaoAtual } from '../casos-uso/consulta-da-edicao-atual'
import type { RegistroDeEntregas } from '../casos-uso/registro-de-entregas'
import type { SorteioDoPool } from '../casos-uso/sorteio-do-pool'
import type { Edicao, FaseDaEdicao } from '../domain/edicao'
import type { EntregasDoMembro, ReivindicacaoPool } from '../domain/entrega'
import { ErroDeRegra } from '../domain/erro-de-regra'
import type { Estilo, EstiloId } from '../domain/estilo'
import type { Membro, MembroId } from '../domain/membro'
import { estilosNaoReivindicados, faseDaEdicao, participantesPendentes } from '../domain/regras-da-edicao'
import { entregasDe, estilosEntregaveis, pendencia } from '../domain/regras-da-entrega'

/** Estado da tela do Sorteio: a Edição em curso, o Pool e as ações de cada papel. */
export interface EdicaoAtual {
  edicao: Readonly<Ref<Edicao | null>>
  fase: ComputedRef<FaseDaEdicao | null>
  pendentes: ComputedRef<MembroId[]>
  estilosLivres: ComputedRef<Estilo[]>
  carregando: Readonly<Ref<boolean>>
  erro: Readonly<Ref<string | null>>
  nomeDe(membroId: MembroId): string
  estiloDe(membroId: MembroId): EstiloId | null
  /** `true` quando o Membro logado é participante e ainda não reivindicou. */
  souPendente: ComputedRef<boolean>
  /**
   * Teto da meta de Entregas ao abrir uma Edição: o Pool terá um Estilo por
   * participante e ninguém repete Estilo, então mais que isso é inatingível.
   */
  maximoDeEntregas: ComputedRef<number>
  /** Quantas Entregas o participante ainda deve nesta Edição (CONTEXT.md: Pendência). */
  pendenciaDe(membroId: MembroId): number
  entregasFeitasPor(membroId: MembroId): number
  /** Estilos que o Membro logado ainda pode entregar: Pool menos os que ele já entregou. */
  meusEstilosEntregaveis: ComputedRef<Estilo[]>
  minhaPendencia: ComputedRef<number>
  recarregar(): Promise<void>
  abrir(prazo: string, metaEntregas: number): Promise<void>
  estenderPrazo(prazo: string): Promise<void>
  forcarAvanco(escolhas: EscolhasDoAvancoForcado): Promise<void>
  fechar(): Promise<void>
  reivindicar(styleId: EstiloId): Promise<void>
  registrarEntrega(styleId: EstiloId, observation: string): Promise<void>
}

/**
 * View-model da tela do Sorteio. Não decide regra: delega nos casos de uso e
 * traduz o resultado. A Edição fechada continua no estado local depois de
 * `fechar()`, porque Fechamento é um passo da tela, não um reset (SPEC.md §3).
 *
 * @example const atual = usarEdicaoAtual(consulta, ciclo, sorteio, sessao.membro)
 */
export function usarEdicaoAtual(
  consulta: ConsultaDaEdicaoAtual,
  ciclo: CicloDaEdicao,
  sorteio: SorteioDoPool,
  registro: RegistroDeEntregas,
  membroLogado: Readonly<Ref<Membro | null>>
): EdicaoAtual {
  const edicao = ref<Edicao | null>(null)
  const reivindicacoes = ref<ReivindicacaoPool[]>([])
  const entregasPorMembro = ref<EntregasDoMembro[]>([])
  const nomePorMembro = ref<Record<MembroId, string>>({})
  const membrosAtivos = ref<MembroId[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)

  async function recarregar(): Promise<void> {
    carregando.value = true
    try {
      const carregada = await consulta.carregar()
      nomePorMembro.value = carregada.nomePorMembro
      membrosAtivos.value = carregada.membrosAtivos
      reivindicacoes.value = carregada.reivindicacoes
      entregasPorMembro.value = carregada.entregasPorMembro
      edicao.value = carregada.edicao
      await fecharSePossivel()
    } finally {
      carregando.value = false
    }
  }

  /** Sem backend, o fechamento automático só é notado quando um Organizador abre a tela. */
  async function fecharSePossivel(): Promise<void> {
    if (!edicao.value || membroLogado.value?.papel !== 'organizador') {
      return
    }
    const status = await ciclo.fecharSePossivel(edicao.value)
    if (status) {
      edicao.value = { ...edicao.value, status, fechadaEm: new Date().toISOString() }
    }
  }

  async function executar(acao: () => Promise<void>): Promise<void> {
    erro.value = null
    try {
      await acao()
    } catch (falha) {
      erro.value = mensagemDeFalha(falha)
    }
  }

  return {
    edicao,
    fase: computed(() => (edicao.value ? faseDaEdicao(edicao.value, reivindicacoes.value) : null)),
    pendentes: computed(() => (edicao.value ? participantesPendentes(edicao.value, reivindicacoes.value) : [])),
    estilosLivres: computed(() => estilosNaoReivindicados(listarEstilos(), reivindicacoes.value)),
    carregando,
    erro,
    nomeDe: (membroId) => nomePorMembro.value[membroId] ?? membroId,
    estiloDe: (membroId) =>
      reivindicacoes.value.find((reivindicacao) => reivindicacao.membroId === membroId)?.styleId ?? null,
    maximoDeEntregas: computed(() => membrosAtivos.value.length),
    pendenciaDe: (membroId) =>
      edicao.value ? pendencia(edicao.value.metaEntregas, entregasDe(entregasPorMembro.value, membroId)) : 0,
    entregasFeitasPor: (membroId) => entregasDe(entregasPorMembro.value, membroId).length,
    meusEstilosEntregaveis: computed(() => {
      const id = membroLogado.value?.id
      if (!id) {
        return []
      }
      return estilosEntregaveis(listarEstilos(), reivindicacoes.value, entregasDe(entregasPorMembro.value, id))
    }),
    minhaPendencia: computed(() => {
      const id = membroLogado.value?.id
      return id && edicao.value ? pendencia(edicao.value.metaEntregas, entregasDe(entregasPorMembro.value, id)) : 0
    }),
    souPendente: computed(() => {
      const id = membroLogado.value?.id
      return id !== undefined &&
        edicao.value?.status === 'aberta' &&
        !reivindicacoes.value.some((r) => r.membroId === id)
        ? edicao.value.participantes.includes(id)
        : false
    }),
    recarregar,
    abrir: (prazo, metaEntregas) =>
      executar(async () => {
        edicao.value = await ciclo.abrir(prazo, metaEntregas)
        reivindicacoes.value = []
        entregasPorMembro.value = []
      }),
    estenderPrazo: (prazo) =>
      executar(async () => {
        await ciclo.estenderPrazo(exigirEdicao().id, prazo)
        edicao.value = { ...exigirEdicao(), prazo }
      }),
    forcarAvanco: (escolhas) =>
      executar(async () => {
        await ciclo.forcarAvancoDaFase1(exigirEdicao().id, escolhas)
        reivindicacoes.value = await consulta.recarregarPool(exigirEdicao().id)
      }),
    fechar: () =>
      executar(async () => {
        const status = await ciclo.fechar(exigirEdicao().id)
        edicao.value = { ...exigirEdicao(), status, fechadaEm: new Date().toISOString() }
      }),
    reivindicar: (styleId) =>
      executar(async () => {
        const membroId = membroLogado.value?.id
        if (!membroId) {
          throw new ErroDeRegra('Entre com sua conta para reivindicar um Estilo.')
        }
        await sorteio.reivindicar(exigirEdicao().id, membroId, styleId)
        reivindicacoes.value = await consulta.recarregarPool(exigirEdicao().id)
      }),
    registrarEntrega: (styleId, observation) =>
      executar(async () => {
        const membroId = membroLogado.value?.id
        if (!membroId) {
          throw new ErroDeRegra('Entre com sua conta para registrar uma Entrega.')
        }
        await registro.registrar(exigirEdicao().id, membroId, styleId, observation)
        entregasPorMembro.value = await consulta.recarregarEntregas(exigirEdicao().id)
        // A última Entrega pode ter cumprido a meta de todo mundo (SPEC.md §3).
        await fecharSePossivel()
      })
  }

  function exigirEdicao(): Edicao {
    if (!edicao.value) {
      throw new ErroDeRegra('Nenhuma Edição em curso.')
    }
    return edicao.value
  }
}

function mensagemDeFalha(falha: unknown): string {
  if (falha instanceof ErroDeRegra) {
    return falha.message
  }
  console.error('Falha na Edição', falha)
  return 'Não foi possível concluir a ação. Verifique sua conexão e tente novamente.'
}
