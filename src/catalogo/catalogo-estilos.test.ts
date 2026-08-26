import { describe, expect, it } from 'vitest'
import { ErroDeRegra } from '../domain/erro-de-regra'
import { encontrarEstilo, exigirEstilo, listarEstilos } from './catalogo-estilos'

describe('catalogo-estilos', () => {
  it('expõe os 110 estilos do guia BJCP 2021', () => {
    expect(listarEstilos()).toHaveLength(110)
  })

  it('não publica o texto descritivo do guia, que é copyright BJCP', () => {
    const camposPublicados = new Set(listarEstilos().flatMap((estilo) => Object.keys(estilo)))
    expect([...camposPublicados].sort()).toEqual([
      'amargor',
      'categoria',
      'categoriaId',
      'cor',
      'densidadeFinal',
      'densidadeOriginal',
      'id',
      'nome',
      'teorAlcoolico'
    ])
  })

  it('encontra um estilo pelo id BJCP', () => {
    expect(encontrarEstilo('21A')).toMatchObject({ nome: 'American IPA', categoria: 'IPA' })
  })

  it('devolve undefined para id desconhecido, sem quebrar o Histórico', () => {
    expect(encontrarEstilo('99Z')).toBeUndefined()
  })

  it('exigirEstilo recusa id desconhecido como regra de negócio, com o valor recebido', () => {
    expect(() => exigirEstilo('99Z')).toThrow('"99Z"')
    expect(() => exigirEstilo('99Z')).toThrow(ErroDeRegra)
  })

  it('mantém estilos sem faixas numéricas, como 28A Brett Beer', () => {
    expect(encontrarEstilo('28A')).toEqual({
      id: '28A',
      nome: 'Brett Beer',
      categoria: 'American Wild Ale',
      categoriaId: '28'
    })
  })
})
