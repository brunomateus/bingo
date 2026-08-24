import { ref, type ComputedRef, type Ref, computed } from 'vue'
import { listarEstilos } from '../catalogo/catalogo-estilos'
import type { ConsultaDoHistorico, Historico } from '../casos-uso/consulta-do-historico'
import type { RegistroDeEntregas } from '../casos-uso/registro-de-entregas'
import {
  contarEstilosDeProducao,
  type ContagemDeEstilo,
  type EdicaoComEntregas,
  type LinhaDePendencia,
  type ProducaoDeMembro
} from '../domain/agregacoes-do-historico'
import type { EdicaoId } from '../domain/edicao'
import { ErroDeRegra } from '../domain/erro-de-regra'
import type { Estilo, EstiloId } from '../domain/estilo'
import type { Membro, MembroId } from '../domain/membro'
import { entregasDe, estilosEntregaveis } from '../domain/regras-da-entrega'
import { rotuloDaEdicao } from './formato'

/** As quatro abas decididas no ticket 07. */
export type AbaDoHistorico = 'edicoes' | 'membro' | 'estilo' | 'pendencias'

export interface HistoricoNaTela {
  aba: Ref<AbaDoHistorico>
  carregando: Readonly<Ref<boolean>>
  erro: Readonly<Ref<string | null>>
  edicoes: ComputedRef<EdicaoComEntregas[]>
  producao: ComputedRef<ProducaoDeMembro[]>
  ranking: ComputedRef<ContagemDeEstilo[]>
  pendencias: ComputedRef<LinhaDePendencia[]>
  nomeDe(membroId: MembroId): string
  rotuloDe(edicaoId: EdicaoId): string
  estilosDe(producao: ProducaoDeMembro): ContagemDeEstilo[]
  /** `true` quando a linha de Pendência é do próprio Membro logado. */
  ehMinha(membroId: MembroId): boolean
  /** Estilos do Pool daquela Edição que o Membro logado ainda não entregou nela. */
  estilosEntregaveisEm(edicaoId: EdicaoId): Estilo[]
  /** Quita uma Entrega atrasada de uma Edição já encerrada (SPEC.md §3). */
  quitarEntrega(edicaoId: EdicaoId, styleId: EstiloId, observation: string): Promise<void>
  recarregar(): Promise<void>
}

function mensagemTecnica(falha: unknown): string {
  console.error('Falha no Histórico', falha)
  return 'Não foi possível concluir a ação. Verifique sua conexão e tente novamente.'
}

const VAZIO: Historico = {
  edicoes: [],
  producao: [],
  ranking: [],
  pendencias: [],
  nomePorMembro: {},
  edicaoPorId: {},
  poolPorEdicao: {}
}

/**
 * View-model do Histórico: guarda a aba escolhida e expõe as agregações prontas.
 * A produção aparece ordenada por nome, para a aba "Por Membro" ficar estável.
 *
 * @example const historico = usarHistorico(consultaDoHistorico)
 */
export function usarHistorico(
  consulta: ConsultaDoHistorico,
  registro: RegistroDeEntregas,
  membroLogado: Readonly<Ref<Membro | null>>
): HistoricoNaTela {
  const dados = ref<Historico>(VAZIO)
  const aba = ref<AbaDoHistorico>('edicoes')
  const carregando = ref(false)
  const erro = ref<string | null>(null)

  const nomeDe = (membroId: MembroId): string => dados.value.nomePorMembro[membroId] ?? membroId

  async function recarregar(): Promise<void> {
    carregando.value = true
    erro.value = null
    try {
      dados.value = await consulta.carregar()
    } catch (falha) {
      erro.value = mensagemTecnica(falha)
    } finally {
      carregando.value = false
    }
  }

  return {
    aba,
    carregando,
    erro,
    edicoes: computed(() => dados.value.edicoes),
    producao: computed(() =>
      [...dados.value.producao].sort((uma, outra) => nomeDe(uma.membroId).localeCompare(nomeDe(outra.membroId), 'pt-BR'))
    ),
    ranking: computed(() => dados.value.ranking),
    pendencias: computed(() =>
      [...dados.value.pendencias].sort(
        (uma, outra) =>
          nomeDe(uma.membroId).localeCompare(nomeDe(outra.membroId), 'pt-BR') ||
          compararEdicoes(uma.edicaoId, outra.edicaoId)
      )
    ),
    nomeDe,
    rotuloDe,
    estilosDe: contarEstilosDeProducao,
    ehMinha: (membroId) => membroLogado.value?.id === membroId,
    estilosEntregaveisEm,
    quitarEntrega,
    recarregar
  }

  function estilosEntregaveisEm(edicaoId: EdicaoId): Estilo[] {
    const id = membroLogado.value?.id
    if (!id) {
      return []
    }
    const jaEntregues = entregasDe(entregasDaEdicao(edicaoId), id)
    return estilosEntregaveis(listarEstilos(), dados.value.poolPorEdicao[edicaoId] ?? [], jaEntregues)
  }

  async function quitarEntrega(edicaoId: EdicaoId, styleId: EstiloId, observation: string): Promise<void> {
    erro.value = null
    const id = membroLogado.value?.id
    try {
      if (!id) {
        throw new ErroDeRegra('Entre com sua conta para registrar uma Entrega.')
      }
      await registro.registrar(edicaoId, id, styleId, observation)
      await recarregar()
    } catch (falha) {
      erro.value = falha instanceof ErroDeRegra ? falha.message : mensagemTecnica(falha)
    }
  }

  /** As Entregas daquela Edição, venha ela do Histórico ou da que está em curso. */
  function entregasDaEdicao(edicaoId: EdicaoId) {
    return dados.value.edicoes.find((item) => item.edicao.id === edicaoId)?.entregasPorMembro ?? []
  }

  function rotuloDe(edicaoId: EdicaoId): string {
    return rotuloDaEdicao(dados.value.edicaoPorId[edicaoId])
  }

  /** Dívida mais urgente primeiro: a Edição em curso, depois as fechadas por recência. */
  function compararEdicoes(uma: EdicaoId, outra: EdicaoId): number {
    const primeira = dados.value.edicaoPorId[uma]
    const segunda = dados.value.edicaoPorId[outra]
    const ordemDeStatus = Number(primeira?.status !== 'aberta') - Number(segunda?.status !== 'aberta')
    return ordemDeStatus || (segunda?.fechadaEm ?? '').localeCompare(primeira?.fechadaEm ?? '')
  }
}
