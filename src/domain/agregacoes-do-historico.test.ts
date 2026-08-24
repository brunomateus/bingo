import { describe, expect, it } from 'vitest'
import {
  contarEstilos,
  contarEstilosDeProducao,
  ordenarPorFechamento,
  pendenciasEmAberto,
  producaoPorMembro,
  rankingPorEstilo,
  type EdicaoComEntregas
} from './agregacoes-do-historico'
import type { Edicao } from './edicao'
import type { Entrega } from './entrega'

function entrega(styleId: string, quando = '2026-09-01T20:00:00.000Z'): Entrega {
  return { styleId, observation: '', deliveredAt: quando }
}

function edicao(id: string, fechadaEm: string | null, participantes = ['ana@x.com', 'caio@x.com']): Edicao {
  return {
    id,
    prazo: '2026-12-31',
    metaEntregas: 2,
    status: fechadaEm ? 'concluida' : 'aberta',
    participantes,
    fechadaEm
  }
}

const JULHO: EdicaoComEntregas = {
  edicao: edicao('julho', '2026-07-31T00:00:00.000Z'),
  entregasPorMembro: [
    { membroId: 'ana@x.com', entregas: [entrega('21A'), entrega('13C')] },
    { membroId: 'caio@x.com', entregas: [entrega('21A')] }
  ]
}

const AGOSTO: EdicaoComEntregas = {
  edicao: edicao('agosto', '2026-08-31T00:00:00.000Z'),
  entregasPorMembro: [{ membroId: 'ana@x.com', entregas: [entrega('1A')] }]
}

describe('ordenarPorFechamento', () => {
  it('põe a Edição mais recente primeiro', () => {
    expect(ordenarPorFechamento([JULHO, AGOSTO]).map((item) => item.edicao.id)).toEqual(['agosto', 'julho'])
  })

  it('não muta a lista recebida', () => {
    const original = [JULHO, AGOSTO]
    ordenarPorFechamento(original)
    expect(original.map((item) => item.edicao.id)).toEqual(['julho', 'agosto'])
  })

  it('coloca a Edição ainda aberta no topo, por não ter data de fechamento', () => {
    const emCurso: EdicaoComEntregas = { edicao: edicao('setembro', null), entregasPorMembro: [] }
    expect(ordenarPorFechamento([JULHO, emCurso]).map((item) => item.edicao.id)).toEqual(['julho', 'setembro'])
  })
})

describe('contarEstilos', () => {
  it('agrupa Estilos entregues por mais de um Membro', () => {
    expect(contarEstilos(JULHO.entregasPorMembro)).toEqual([
      { styleId: '21A', quantidade: 2 },
      { styleId: '13C', quantidade: 1 }
    ])
  })

  it('devolve lista vazia quando ninguém entregou', () => {
    expect(contarEstilos([])).toEqual([])
  })
})

describe('rankingPorEstilo', () => {
  it('soma as Entregas de todas as Edições, mais entregues primeiro', () => {
    expect(rankingPorEstilo([JULHO, AGOSTO])).toEqual([
      { styleId: '21A', quantidade: 2 },
      { styleId: '13C', quantidade: 1 },
      { styleId: '1A', quantidade: 1 }
    ])
  })

  it('desempata pelo id do Estilo, para a ordem ser estável', () => {
    const contagens = rankingPorEstilo([JULHO, AGOSTO])
    expect([contagens[1].styleId, contagens[2].styleId]).toEqual(['13C', '1A'])
  })
})

describe('producaoPorMembro', () => {
  it('junta as Entregas do Membro em todas as Edições, marcando de onde vieram', () => {
    const producao = producaoPorMembro([JULHO, AGOSTO])
    const daAna = producao.find((linha) => linha.membroId === 'ana@x.com')
    expect(daAna?.entregas.map((item) => [item.edicaoId, item.entrega.styleId])).toEqual([
      ['julho', '21A'],
      ['julho', '13C'],
      ['agosto', '1A']
    ])
  })

  it('não inventa linha para quem nunca entregou', () => {
    expect(producaoPorMembro([AGOSTO]).map((linha) => linha.membroId)).toEqual(['ana@x.com'])
  })

  it('preserva Membro que saiu da confraria, porque olha as Entregas e não a lista atual', () => {
    const comInativo: EdicaoComEntregas = {
      edicao: edicao('junho', '2026-06-30T00:00:00.000Z'),
      entregasPorMembro: [{ membroId: 'bia@x.com', entregas: [entrega('21A')] }]
    }
    expect(producaoPorMembro([comInativo]).map((linha) => linha.membroId)).toEqual(['bia@x.com'])
  })
})

describe('pendenciasEmAberto', () => {
  it('gera uma linha por (Membro, Edição) com o que falta', () => {
    expect(pendenciasEmAberto([JULHO])).toEqual([{ membroId: 'caio@x.com', edicaoId: 'julho', quantidade: 1 }])
  })

  it('omite quem já cumpriu a meta', () => {
    expect(pendenciasEmAberto([JULHO]).some((linha) => linha.membroId === 'ana@x.com')).toBe(false)
  })

  it('inclui a Edição em curso, não só as fechadas', () => {
    const emCurso: EdicaoComEntregas = { edicao: edicao('setembro', null), entregasPorMembro: [] }
    expect(pendenciasEmAberto([emCurso])).toEqual([
      { membroId: 'ana@x.com', edicaoId: 'setembro', quantidade: 2 },
      { membroId: 'caio@x.com', edicaoId: 'setembro', quantidade: 2 }
    ])
  })

  it('ignora Entregas de quem não é participante daquela Edição', () => {
    const comIntruso: EdicaoComEntregas = {
      edicao: edicao('julho', '2026-07-31T00:00:00.000Z', ['ana@x.com']),
      entregasPorMembro: [
        { membroId: 'ana@x.com', entregas: [entrega('21A'), entrega('13C')] },
        { membroId: 'zeca@x.com', entregas: [entrega('1A')] }
      ]
    }
    expect(pendenciasEmAberto([comIntruso])).toEqual([])
  })
})

describe('contarEstilosDeProducao', () => {
  it('conta quantas vezes o Membro entregou cada Estilo, somando Edições', () => {
    const daAna = producaoPorMembro([JULHO, AGOSTO]).find((linha) => linha.membroId === 'ana@x.com')!
    expect(contarEstilosDeProducao(daAna)).toEqual([
      { styleId: '13C', quantidade: 1 },
      { styleId: '1A', quantidade: 1 },
      { styleId: '21A', quantidade: 1 }
    ])
  })

  it('marca o Estilo repetido pelo mesmo Membro em Edições diferentes', () => {
    const repetido = producaoPorMembro([JULHO, { ...AGOSTO, entregasPorMembro: [{ membroId: 'ana@x.com', entregas: [entrega('21A')] }] }])
    expect(contarEstilosDeProducao(repetido[0])[0]).toEqual({ styleId: '21A', quantidade: 2 })
  })
})
