import { describe, expect, it } from 'vitest'
import type { Edicao } from './edicao'
import type { ReivindicacaoPool } from './entrega'
import type { Estilo } from './estilo'
import {
  dataLocalISO,
  estilosNaoReivindicados,
  faseDaEdicao,
  participantesPendentes,
  prazoVencido,
  resultadoDoFechamento,
  validarAbertura,
  validarExtensaoDePrazo,
  validarReivindicacao
} from './regras-da-edicao'

function edicao(sobrescritas: Partial<Edicao> = {}): Edicao {
  return {
    id: 'edicao-1',
    prazo: '2026-12-31',
    metaEntregas: 3,
    status: 'aberta',
    participantes: ['ana@x.com', 'caio@x.com'],
    fechadaEm: null,
    ...sobrescritas
  }
}

const POOL_COMPLETO: ReivindicacaoPool[] = [
  { membroId: 'ana@x.com', styleId: '21A' },
  { membroId: 'caio@x.com', styleId: '13C' }
]

describe('faseDaEdicao', () => {
  it('fica no Pool enquanto faltar participante', () => {
    expect(faseDaEdicao(edicao(), [POOL_COMPLETO[0]])).toBe('pool')
  })

  it('avança para Entregas quando todo participante tem Estilo', () => {
    expect(faseDaEdicao(edicao(), POOL_COMPLETO)).toBe('entregas')
  })

  it('mostra Fechamento para Edição concluída ou cancelada, mesmo com Pool completo', () => {
    expect(faseDaEdicao(edicao({ status: 'concluida' }), POOL_COMPLETO)).toBe('fechamento')
    expect(faseDaEdicao(edicao({ status: 'cancelada' }), [])).toBe('fechamento')
  })

  it('trata Edição sem participantes como já fora do Pool', () => {
    expect(faseDaEdicao(edicao({ participantes: [] }), [])).toBe('entregas')
  })
})

describe('participantesPendentes', () => {
  it('lista quem ainda não reivindicou, na ordem do snapshot', () => {
    expect(participantesPendentes(edicao(), [POOL_COMPLETO[1]])).toEqual(['ana@x.com'])
  })

  it('ignora reivindicação de quem não é participante', () => {
    const intruso: ReivindicacaoPool = { membroId: 'bia@x.com', styleId: '1A' }
    expect(participantesPendentes(edicao(), [intruso])).toEqual(['ana@x.com', 'caio@x.com'])
  })
})

describe('estilosNaoReivindicados', () => {
  const catalogo: Estilo[] = [
    { id: '21A', nome: 'American IPA', categoria: 'IPA', categoriaId: '21' },
    { id: '13C', nome: 'English Porter', categoria: 'Brown British Beer', categoriaId: '13' },
    { id: '1A', nome: 'American Light Lager', categoria: 'Standard American Beer', categoriaId: '1' }
  ]

  it('remove do catálogo os Estilos já no Pool', () => {
    expect(estilosNaoReivindicados(catalogo, POOL_COMPLETO).map((estilo) => estilo.id)).toEqual(['1A'])
  })

  it('devolve o catálogo inteiro quando o Pool está vazio', () => {
    expect(estilosNaoReivindicados(catalogo, [])).toHaveLength(3)
  })
})

describe('resultadoDoFechamento', () => {
  it('cancela quando não houve Estilo reivindicado nem Entrega', () => {
    expect(resultadoDoFechamento([], 0)).toBe('cancelada')
  })

  it('conclui quando houve ao menos uma reivindicação', () => {
    expect(resultadoDoFechamento([POOL_COMPLETO[0]], 0)).toBe('concluida')
  })

  it('conclui quando houve Entrega mesmo sem Pool', () => {
    expect(resultadoDoFechamento([], 1)).toBe('concluida')
  })
})

describe('prazoVencido', () => {
  it('não vence no próprio dia do prazo', () => {
    expect(prazoVencido(edicao({ prazo: '2026-08-23' }), new Date(2026, 7, 23, 23, 59))).toBe(false)
  })

  it('vence no dia seguinte', () => {
    expect(prazoVencido(edicao({ prazo: '2026-08-23' }), new Date(2026, 7, 24, 0, 1))).toBe(true)
  })

  it('usa a data local, não UTC: 21h em BRT ainda é o mesmo dia', () => {
    expect(dataLocalISO(new Date(2026, 7, 23, 21, 0))).toBe('2026-08-23')
  })
})

describe('validarAbertura', () => {
  const agora = new Date(2026, 7, 23)
  const validos = { prazo: '2026-09-30', metaEntregas: 1, participantes: ['ana@x.com'] }

  it('aceita o formulário preenchido corretamente', () => {
    expect(() => validarAbertura(validos, agora)).not.toThrow()
  })

  it('aceita prazo no próprio dia de hoje', () => {
    expect(() => validarAbertura({ ...validos, prazo: '2026-08-23' }, agora)).not.toThrow()
  })

  it('recusa prazo no passado', () => {
    expect(() => validarAbertura({ ...validos, prazo: '2026-08-22' }, agora)).toThrow('já passou')
  })

  it('recusa prazo mal formatado, mostrando o valor', () => {
    expect(() => validarAbertura({ ...validos, prazo: '30/09/2026' }, agora)).toThrow('"30/09/2026"')
  })

  it.each([0, -1, 2.5])('recusa meta de Entregas %s', (metaEntregas) => {
    expect(() => validarAbertura({ ...validos, metaEntregas }, agora)).toThrow(String(metaEntregas))
  })

  it('aceita meta igual ao número de participantes: o Pool inteiro', () => {
    const tres = { ...validos, metaEntregas: 3, participantes: ['ana@x.com', 'bia@x.com', 'caio@x.com'] }
    expect(() => validarAbertura(tres, agora)).not.toThrow()
  })

  it('recusa meta maior que o Pool, porque seria impossível de cumprir', () => {
    const demais = { ...validos, metaEntregas: 4, participantes: ['ana@x.com', 'bia@x.com', 'caio@x.com'] }
    expect(() => validarAbertura(demais, agora)).toThrow('com 3 participantes o Pool terá 3 Estilos')
  })

  it('recusa abrir sem nenhum Membro ativo', () => {
    expect(() => validarAbertura({ ...validos, participantes: [] }, agora)).toThrow('Nenhum Membro ativo')
  })
})

describe('validarReivindicacao', () => {
  it('aceita participante estreando com Estilo livre', () => {
    expect(() => validarReivindicacao(edicao(), [POOL_COMPLETO[1]], 'ana@x.com', '1A')).not.toThrow()
  })

  it('recusa Edição fechada', () => {
    expect(() => validarReivindicacao(edicao({ status: 'concluida' }), [], 'ana@x.com', '1A')).toThrow('já foi fechada')
  })

  it('recusa quem não é participante', () => {
    expect(() => validarReivindicacao(edicao(), [], 'bia@x.com', '1A')).toThrow('bia@x.com não é participante')
  })

  it('recusa segunda reivindicação do mesmo Membro, lembrando o Estilo dele', () => {
    expect(() => validarReivindicacao(edicao(), POOL_COMPLETO, 'ana@x.com', '1A')).toThrow('já reivindicou o Estilo 21A')
  })

  it('recusa Estilo que outro participante já levou', () => {
    expect(() => validarReivindicacao(edicao(), [POOL_COMPLETO[1]], 'ana@x.com', '13C')).toThrow(
      'já foi reivindicado por outro'
    )
  })
})

describe('validarExtensaoDePrazo', () => {
  it('aceita adiar o prazo', () => {
    expect(() => validarExtensaoDePrazo(edicao({ prazo: '2026-09-30' }), '2026-10-15')).not.toThrow()
  })

  it('recusa encurtar ou repetir o prazo, mostrando as duas datas', () => {
    expect(() => validarExtensaoDePrazo(edicao({ prazo: '2026-09-30' }), '2026-09-01')).toThrow(
      '2026-09-01 não é posterior a 2026-09-30'
    )
    expect(() => validarExtensaoDePrazo(edicao({ prazo: '2026-09-30' }), '2026-09-30')).toThrow('só pode ser estendido')
  })

  it('recusa mexer no prazo de Edição fechada', () => {
    expect(() => validarExtensaoDePrazo(edicao({ status: 'concluida' }), '2027-01-01')).toThrow('Edição aberta')
  })
})
