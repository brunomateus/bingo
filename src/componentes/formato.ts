import type { Edicao } from '../domain/edicao'

/**
 * Data em pt-BR a partir de um ISO (`2026-07-31` ou timestamp completo).
 * Corta o horário antes de converter para não escorregar um dia por fuso.
 *
 * @example dataCurta('2026-07-31T00:00:00.000Z') // '31/07/2026'
 */
export function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  if (!ano || !mes || !dia) {
    return iso
  }
  return `${dia}/${mes}/${ano}`
}

/** Como uma Edição é citada na tela — ela não tem nome nem número (SPEC.md §3). */
export function rotuloDaEdicao(edicao: Edicao | undefined): string {
  if (!edicao) {
    return 'Edição desconhecida'
  }
  if (edicao.status === 'aberta') {
    return `Edição em curso (prazo ${dataCurta(edicao.prazo)})`
  }
  return `Edição encerrada em ${dataCurta(edicao.fechadaEm ?? edicao.prazo)}`
}
