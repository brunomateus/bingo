import type { Estilo, EstiloId } from './estilo'
import { ErroDeRegra } from './erro-de-regra'
import type { Edicao, FaseDaEdicao, ResultadoDeFechamento } from './edicao'
import type { MembroId } from './membro'
import type { ReivindicacaoPool } from './entrega'

/**
 * Em que passo a Edição está. Derivada, não armazenada: a Fase 1 termina
 * exatamente quando todo participante tem um Estilo no Pool — seja porque agiram,
 * seja porque o Organizador escolheu por quem faltava (SPEC.md §3).
 *
 * @example faseDaEdicao(edicao, reivindicacoes) // 'pool'
 */
export function faseDaEdicao(edicao: Edicao, reivindicacoes: readonly ReivindicacaoPool[]): FaseDaEdicao {
  if (edicao.status !== 'aberta') {
    return 'fechamento'
  }
  return participantesPendentes(edicao, reivindicacoes).length === 0 ? 'entregas' : 'pool'
}

/** Participantes que ainda não reivindicaram Estilo — os alvos do "forçar avanço". */
export function participantesPendentes(edicao: Edicao, reivindicacoes: readonly ReivindicacaoPool[]): MembroId[] {
  const jaReivindicaram = new Set(reivindicacoes.map((reivindicacao) => reivindicacao.membroId))
  return edicao.participantes.filter((participante) => !jaReivindicaram.has(participante))
}

/** Estilos ainda livres para reivindicação: um Estilo não entra duas vezes no Pool. */
export function estilosNaoReivindicados(
  estilos: readonly Estilo[],
  reivindicacoes: readonly ReivindicacaoPool[]
): Estilo[] {
  const tomados = new Set(reivindicacoes.map((reivindicacao) => reivindicacao.styleId))
  return estilos.filter((estilo) => !tomados.has(estilo.id))
}

/**
 * Como a Edição entra no Histórico ao fechar: fechar antes de qualquer atividade
 * é cancelamento, e cancelada não compõe o Histórico (SPEC.md §3).
 *
 * `totalDeEntregas` é 0 enquanto a fatia de Entregas não existir — nenhuma Entrega
 * pode ter sido registrada ainda.
 */
export function resultadoDoFechamento(
  reivindicacoes: readonly ReivindicacaoPool[],
  totalDeEntregas: number
): ResultadoDeFechamento {
  const houveAtividade = reivindicacoes.length > 0 || totalDeEntregas > 0
  return houveAtividade ? 'concluida' : 'cancelada'
}

/** O prazo vence no fim do dia informado; comparado em data local, como o usuário o digitou. */
export function prazoVencido(edicao: Edicao, agora: Date): boolean {
  return dataLocalISO(agora) > edicao.prazo
}

/** `YYYY-MM-DD` no fuso do usuário — `toISOString()` usaria UTC e viraria o dia cedo demais. */
export function dataLocalISO(momento: Date): string {
  const mes = String(momento.getMonth() + 1).padStart(2, '0')
  const dia = String(momento.getDate()).padStart(2, '0')
  return `${momento.getFullYear()}-${mes}-${dia}`
}

export interface DadosDeAbertura {
  prazo: string
  metaEntregas: number
  participantes: MembroId[]
}

/** Valida o formulário de abertura antes de gravar (SPEC.md §3). */
export function validarAbertura(dados: DadosDeAbertura, agora: Date): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.prazo)) {
    throw new ErroDeRegra(`Prazo inválido: ${JSON.stringify(dados.prazo)}. Esperado uma data no formato AAAA-MM-DD.`)
  }
  if (dados.prazo < dataLocalISO(agora)) {
    throw new ErroDeRegra(`O prazo ${dados.prazo} já passou. Escolha uma data de hoje em diante.`)
  }
  if (!Number.isInteger(dados.metaEntregas) || dados.metaEntregas < 1) {
    throw new ErroDeRegra(`Meta de Entregas inválida: ${dados.metaEntregas}. Esperado um inteiro maior ou igual a 1.`)
  }
  if (dados.participantes.length === 0) {
    throw new ErroDeRegra('Nenhum Membro ativo para participar. Cadastre ou reative Membros antes de abrir a Edição.')
  }
  // O Pool terá um Estilo por participante e ninguém repete Estilo na mesma
  // Edição, então uma meta maior que isso seria impossível de cumprir — a Edição
  // nunca fecharia por meta atingida (SPEC.md §4).
  if (dados.metaEntregas > dados.participantes.length) {
    throw new ErroDeRegra(
      `Meta de ${dados.metaEntregas} Entregas é maior que o Pool: com ${dados.participantes.length} ` +
        `participantes o Pool terá ${dados.participantes.length} Estilos, e ninguém pode repetir Estilo na mesma Edição.`
    )
  }
}

/**
 * O prazo é extensível enquanto a Edição está aberta, e só para frente: encurtar
 * um prazo que participantes já estão seguindo não é "estender" (SPEC.md §3).
 */
export function validarExtensaoDePrazo(edicao: Edicao, novoPrazo: string): void {
  if (edicao.status !== 'aberta') {
    throw new ErroDeRegra('Só dá para mexer no prazo de uma Edição aberta.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(novoPrazo)) {
    throw new ErroDeRegra(`Prazo inválido: ${JSON.stringify(novoPrazo)}. Esperado uma data no formato AAAA-MM-DD.`)
  }
  if (novoPrazo <= edicao.prazo) {
    throw new ErroDeRegra(`O prazo só pode ser estendido: ${novoPrazo} não é posterior a ${edicao.prazo}.`)
  }
}

/** Valida uma reivindicação de Fase 1 contra o Pool já formado (SPEC.md §4). */
export function validarReivindicacao(
  edicao: Edicao,
  reivindicacoes: readonly ReivindicacaoPool[],
  membroId: MembroId,
  styleId: EstiloId
): void {
  if (edicao.status !== 'aberta') {
    throw new ErroDeRegra('Esta Edição já foi fechada.')
  }
  if (!edicao.participantes.includes(membroId)) {
    throw new ErroDeRegra(`${membroId} não é participante desta Edição.`)
  }
  const jaReivindicou = reivindicacoes.find((reivindicacao) => reivindicacao.membroId === membroId)
  if (jaReivindicou) {
    throw new ErroDeRegra(`Você já reivindicou o Estilo ${jaReivindicou.styleId} nesta Edição.`)
  }
  const tomado = reivindicacoes.find((reivindicacao) => reivindicacao.styleId === styleId)
  if (tomado) {
    throw new ErroDeRegra(`O Estilo ${styleId} já foi reivindicado por outro participante.`)
  }
}
