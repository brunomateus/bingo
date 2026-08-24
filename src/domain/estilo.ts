/** Id BJCP de um Estilo, ex.: "21A". */
export type EstiloId = string

/** Faixa numérica de uma característica do Estilo (OG, FG, IBU, SRM, ABV). */
export interface FaixaNumerica {
  minimo: number
  maximo: number
}

/**
 * Um Estilo do guia BJCP 2021.
 *
 * Só os campos que podemos redistribuir: identificação, categoria e faixas
 * numéricas. O texto descritivo do guia é copyright BJCP (SPEC.md §6).
 * As faixas são opcionais porque 17 dos 110 estilos (categorias de cerveja
 * especial, ex.: 28A Brett Beer) não declaram nenhuma.
 *
 * @example
 * const americanIpa: Estilo = { id: '21A', nome: 'American IPA', categoria: 'IPA', categoriaId: '21' }
 */
export interface Estilo {
  id: EstiloId
  nome: string
  categoria: string
  categoriaId: string
  densidadeOriginal?: FaixaNumerica
  densidadeFinal?: FaixaNumerica
  amargor?: FaixaNumerica
  cor?: FaixaNumerica
  teorAlcoolico?: FaixaNumerica
}
