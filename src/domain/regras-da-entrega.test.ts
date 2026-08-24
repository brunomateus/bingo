import { describe, expect, it } from 'vitest'
import type { Edicao } from './edicao'
import type { Entrega, EntregasDoMembro, ReivindicacaoPool } from './entrega'
import type { Estilo } from './estilo'
import {
  entregasDe,
  estilosEntregaveis,
  pendencia,
  todosCumpriramAMeta,
  validarEntrega
} from './regras-da-entrega'

const EDICAO: Edicao = {
  id: 'edicao-1',
  prazo: '2026-12-31',
  metaEntregas: 2,
  status: 'aberta',
  participantes: ['ana@x.com', 'caio@x.com'],
  fechadaEm: null
}

const POOL: ReivindicacaoPool[] = [
  { membroId: 'ana@x.com', styleId: '21A' },
  { membroId: 'caio@x.com', styleId: '13C' }
]

function entrega(styleId: string): Entrega {
  return { styleId, observation: 'entregue no bar', deliveredAt: '2026-09-01T20:00:00.000Z' }
}

describe('pendencia', () => {
  it('desconta as Entregas já feitas', () => {
    expect(pendencia(3, [entrega('21A')])).toBe(2)
  })

  it('zera quando a meta é cumprida e não fica negativa', () => {
    expect(pendencia(2, [entrega('21A'), entrega('13C')])).toBe(0)
    expect(pendencia(1, [entrega('21A'), entrega('13C')])).toBe(0)
  })
})

describe('entregasDe', () => {
  it('devolve lista vazia para quem ainda não entregou', () => {
    expect(entregasDe([], 'ana@x.com')).toEqual([])
  })

  it('encontra as Entregas do Membro pedido', () => {
    const registros: EntregasDoMembro[] = [{ membroId: 'ana@x.com', entregas: [entrega('21A')] }]
    expect(entregasDe(registros, 'ana@x.com')).toHaveLength(1)
  })
})

describe('todosCumpriramAMeta', () => {
  it('é falso enquanto alguém tem Pendência', () => {
    const registros: EntregasDoMembro[] = [{ membroId: 'ana@x.com', entregas: [entrega('21A'), entrega('13C')] }]
    expect(todosCumpriramAMeta(EDICAO, registros)).toBe(false)
  })

  it('é verdadeiro quando todo participante zerou', () => {
    const registros: EntregasDoMembro[] = [
      { membroId: 'ana@x.com', entregas: [entrega('21A'), entrega('13C')] },
      { membroId: 'caio@x.com', entregas: [entrega('13C'), entrega('21A')] }
    ]
    expect(todosCumpriramAMeta(EDICAO, registros)).toBe(true)
  })

  it('ignora quem não é participante', () => {
    const registros: EntregasDoMembro[] = [
      { membroId: 'ana@x.com', entregas: [entrega('21A'), entrega('13C')] },
      { membroId: 'caio@x.com', entregas: [entrega('13C'), entrega('21A')] },
      { membroId: 'zeca@x.com', entregas: [] }
    ]
    expect(todosCumpriramAMeta(EDICAO, registros)).toBe(true)
  })
})

describe('estilosEntregaveis', () => {
  const catalogo: Estilo[] = [
    { id: '21A', nome: 'American IPA', categoria: 'IPA', categoriaId: '21' },
    { id: '13C', nome: 'English Porter', categoria: 'Brown British Beer', categoriaId: '13' },
    { id: '1A', nome: 'American Light Lager', categoria: 'Standard American Beer', categoriaId: '1' }
  ]

  it('restringe ao Pool da Edição', () => {
    expect(estilosEntregaveis(catalogo, POOL, []).map((estilo) => estilo.id)).toEqual(['21A', '13C'])
  })

  it('remove os que o próprio Membro já entregou', () => {
    expect(estilosEntregaveis(catalogo, POOL, [entrega('21A')]).map((estilo) => estilo.id)).toEqual(['13C'])
  })
})

describe('validarEntrega', () => {
  it('aceita Estilo do Pool ainda não entregue pelo Membro', () => {
    expect(() => validarEntrega(EDICAO, POOL, [], 'ana@x.com', '13C')).not.toThrow()
  })

  it('aceita registro em Edição já fechada: Pendência não expira', () => {
    const fechada: Edicao = { ...EDICAO, status: 'concluida', fechadaEm: '2026-10-01T00:00:00.000Z' }
    expect(() => validarEntrega(fechada, POOL, [], 'ana@x.com', '21A')).not.toThrow()
  })

  it('recusa quem não é participante', () => {
    expect(() => validarEntrega(EDICAO, POOL, [], 'zeca@x.com', '21A')).toThrow('não é participante')
  })

  it('recusa Estilo fora do Pool', () => {
    expect(() => validarEntrega(EDICAO, POOL, [], 'ana@x.com', '1A')).toThrow('não está no Pool')
  })

  it('recusa o mesmo Estilo duas vezes pelo mesmo Membro', () => {
    expect(() => validarEntrega(EDICAO, POOL, [entrega('21A')], 'ana@x.com', '21A')).toThrow('já entregou o Estilo 21A')
  })

  it('deixa dois Membros diferentes entregarem o mesmo Estilo do Pool', () => {
    expect(() => validarEntrega(EDICAO, POOL, [], 'caio@x.com', '21A')).not.toThrow()
  })

  it('recusa passar da meta', () => {
    const cumpriu = [entrega('21A'), entrega('13C')]
    expect(() => validarEntrega(EDICAO, POOL, cumpriu, 'ana@x.com', '1A')).toThrow('já cumpriu as 2 Entregas')
  })
})
