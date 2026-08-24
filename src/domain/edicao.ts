import type { MembroId } from './membro'

export type EdicaoId = string

/** `aberta` enquanto o Sorteio corre; `cancelada` = fechada sem nenhuma atividade (SPEC.md §3). */
export type StatusEdicao = 'aberta' | 'concluida' | 'cancelada'

/** Em que uma Edição fechada pode terminar (SPEC.md §3): `aberta` não é resultado. */
export type ResultadoDeFechamento = Extract<StatusEdicao, 'concluida' | 'cancelada'>

/** Passo do Sorteio mostrado no stepper (CONTEXT.md: Fase 1 / Fase 2 / Fechamento). */
export type FaseDaEdicao = 'pool' | 'entregas' | 'fechamento'

/**
 * Uma rodada do Bingo. `participantes` é um snapshot dos Membros ativos no momento
 * da abertura e `metaEntregas` é fixa depois disso — só o `prazo` é extensível.
 * `fechadaEm` alimenta a lista cronológica do Histórico (SPEC.md §5).
 *
 * A fase NÃO é um campo: ela é derivada do Pool por `faseDaEdicao()`. Um campo
 * exigiria que o último participante a reivindicar escrevesse no documento da
 * Edição — escrita que as regras reservam ao Organizador — e abriria espaço para
 * fase e Pool divergirem. Ver `regras-da-edicao.ts`.
 */
export interface Edicao {
  id: EdicaoId
  prazo: string
  metaEntregas: number
  status: StatusEdicao
  participantes: MembroId[]
  fechadaEm: string | null
}

/** Meta de Entregas por participante sugerida no formulário de abertura (SPEC.md §3). */
export const META_ENTREGAS_PADRAO = 3
