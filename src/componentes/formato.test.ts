import { describe, expect, it } from 'vitest'
import type { Edicao } from '../domain/edicao'
import { dataCurta, rotuloDaEdicao } from './formato'

function edicao(sobrescritas: Partial<Edicao> = {}): Edicao {
  return {
    id: 'edicao-1',
    prazo: '2026-12-31',
    metaEntregas: 3,
    status: 'concluida',
    participantes: [],
    fechadaEm: '2026-07-31T23:10:00.000Z',
    ...sobrescritas
  }
}

describe('dataCurta', () => {
  it('converte ISO para o formato brasileiro', () => {
    expect(dataCurta('2026-07-31')).toBe('31/07/2026')
  })

  it('ignora o horário, sem escorregar de dia por fuso', () => {
    expect(dataCurta('2026-07-31T23:10:00.000Z')).toBe('31/07/2026')
  })

  it('devolve o valor original quando não reconhece o formato', () => {
    expect(dataCurta('ontem')).toBe('ontem')
  })
})

describe('rotuloDaEdicao', () => {
  it('cita a Edição fechada pela data de fechamento', () => {
    expect(rotuloDaEdicao(edicao())).toBe('Edição encerrada em 31/07/2026')
  })

  it('cita a Edição aberta pelo prazo', () => {
    expect(rotuloDaEdicao(edicao({ status: 'aberta', fechadaEm: null }))).toBe('Edição em curso (prazo 31/12/2026)')
  })

  it('cai no prazo quando a Edição fechada não tem data de fechamento', () => {
    expect(rotuloDaEdicao(edicao({ fechadaEm: null }))).toBe('Edição encerrada em 31/12/2026')
  })

  it('não quebra com Edição que sumiu do índice', () => {
    expect(rotuloDaEdicao(undefined)).toBe('Edição desconhecida')
  })
})
