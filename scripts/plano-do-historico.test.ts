import { describe, expect, it } from 'vitest'
import {
  documentoDeMembro,
  documentosDaRodada,
  emailsCitados,
  idDaEdicao,
  idDoEstilo,
  planejarHistorico,
  ultimoDiaDoMes
} from './plano-do-historico.mjs'
import { contarEstilos, pendenciasEmAberto } from '../src/domain/agregacoes-do-historico'
import { paraEdicao } from '../src/repositorios/firestore-repositorio-edicoes'
import { paraEntregas } from '../src/repositorios/firestore-repositorio-entregas'

const CATALOGO = [{ id: '7B' }, { id: '25B' }, { id: 'X4' }]
const MEMBROS = {
  'ana@x.com': { nome: 'Ana', status: 'ativo' },
  'bia@x.com': { nome: 'Bia', status: 'ativo' },
  'caio@x.com': { nome: 'Caio', status: 'inativo' }
}

function arquivo(rodada: Record<string, unknown>) {
  return {
    edicoes: [
      {
        2025: [
          {
            prazo: 'setembro',
            estilo: '7B Altbier',
            participantes: ['ana@x.com', 'bia@x.com'],
            pendencias: [],
            responsavel: 'ana@x.com',
            ...rodada
          }
        ]
      }
    ]
  }
}

function planejar(rodada: Record<string, unknown> = {}) {
  return planejarHistorico(arquivo(rodada), CATALOGO, MEMBROS)[0]
}

describe('ultimoDiaDoMes', () => {
  it('fecha fevereiro no dia 29 em ano bissexto', () => {
    expect(ultimoDiaDoMes(2024, 2)).toBe('2024-02-29')
  })

  it('zera à esquerda mês e dia', () => {
    expect(ultimoDiaDoMes(2025, 3)).toBe('2025-03-31')
  })
})

describe('idDoEstilo', () => {
  it('pega o primeiro token do rótulo, ignorando a variante depois dos dois-pontos', () => {
    expect(idDoEstilo('21B Specialty IPA: Rye IPA')).toBe('21B')
  })
})

describe('idDaEdicao', () => {
  it('é determinístico, para reexecutar a carga sem duplicar', () => {
    expect(idDaEdicao(2025, 9)).toBe('historico-2025-09')
  })
})

describe('planejarHistorico', () => {
  it('lê o mês com acento e o typo "fevereio" do arquivo de origem', () => {
    expect(planejar({ prazo: 'fevereio' }).data).toBe('2025-02-28')
    expect(planejar({ prazo: 'março', estilo: 'X4 Catharina Sour' }).data).toBe('2025-03-31')
  })

  it('trata quem não está em pendencias como quem entregou', () => {
    const rodada = planejar({ pendencias: ['bia@x.com'] })
    expect(rodada.entregaram).toEqual(['ana@x.com'])
    expect(rodada.pendentes).toEqual(['bia@x.com'])
  })

  it('inclui o responsável nos participantes quando a lista o omite', () => {
    const rodada = planejar({ participantes: ['bia@x.com'], responsavel: 'ana@x.com' })
    expect(rodada.participantes).toEqual(['bia@x.com', 'ana@x.com'])
  })

  it('ordena as rodadas da mais antiga para a mais recente', () => {
    const duasEdicoes = {
      edicoes: [
        {
          2025: [
            arquivo({ prazo: 'novembro', estilo: '25B Saison' }).edicoes[0][2025][0],
            arquivo({}).edicoes[0][2025][0]
          ]
        }
      ]
    }
    expect(planejarHistorico(duasEdicoes, CATALOGO, MEMBROS).map((rodada) => rodada.id)).toEqual([
      'historico-2025-09',
      'historico-2025-11'
    ])
  })

  it('recusa Estilo fora do catálogo BJCP', () => {
    expect(() => planejar({ estilo: '12B Rye IPA' })).toThrow(/12B/)
  })

  it('recusa e-mail sem cadastro no arquivo de Membros', () => {
    expect(() => planejar({ participantes: ['ana@x.com', 'zeca@x.com'] })).toThrow(/zeca@x.com/)
  })

  it('recusa pendência de quem não participou', () => {
    expect(() => planejar({ pendencias: ['caio@x.com'] })).toThrow(/caio@x.com/)
  })
})

describe('documentosDaRodada', () => {
  it('grava Edição concluída com meta 1 e data no fechamento', () => {
    const [edicao] = documentosDaRodada(planejar())
    expect(edicao).toEqual({
      caminho: 'edicoes/historico-2025-09',
      campos: {
        prazo: '2025-09-30',
        metaEntregas: 1,
        status: 'concluida',
        participantes: ['ana@x.com', 'bia@x.com'],
        fechadaEm: '2025-09-30'
      }
    })
  })

  it('põe só o responsável no Pool, com o índice de unicidade do Estilo', () => {
    const [, pool, indice] = documentosDaRodada(planejar())
    expect(pool).toEqual({ caminho: 'edicoes/historico-2025-09/pool/ana@x.com', campos: { styleId: '7B' } })
    expect(indice).toEqual({
      caminho: 'edicoes/historico-2025-09/estilos-do-pool/7B',
      campos: { membroId: 'ana@x.com' }
    })
  })

  it('não gera Entrega para quem ficou devendo', () => {
    const caminhos = documentosDaRodada(planejar({ pendencias: ['bia@x.com'] })).map((documento) => documento.caminho)
    expect(caminhos).toContain('edicoes/historico-2025-09/selecoes/ana@x.com')
    expect(caminhos).not.toContain('edicoes/historico-2025-09/selecoes/bia@x.com')
  })

  it('carimba a Entrega com a data de fechamento e observação vazia', () => {
    const entrega = documentosDaRodada(planejar()).find((documento) => documento.caminho.includes('selecoes/bia'))
    expect(entrega?.campos).toEqual({ entregas: [{ styleId: '7B', observation: '', deliveredAt: '2025-09-30' }] })
  })
})

describe('emailsCitados', () => {
  it('reúne os participantes de todas as rodadas, sem repetir', () => {
    expect(emailsCitados([planejar(), planejar({ participantes: ['caio@x.com'], responsavel: 'caio@x.com' })])).toEqual(
      ['ana@x.com', 'bia@x.com', 'caio@x.com']
    )
  })
})

describe('documentoDeMembro', () => {
  it('cria sempre como Membro comum sem uid: o papel é decidido no app', () => {
    expect(documentoDeMembro('ana@x.com', MEMBROS['ana@x.com'])).toEqual({
      caminho: 'membros/ana@x.com',
      campos: { nome: 'Ana', email: 'ana@x.com', papel: 'membro-comum', status: 'ativo', uid: null }
    })
  })

  it('recusa cadastro sem nome', () => {
    expect(() => documentoDeMembro('ana@x.com', { nome: '  ', status: 'ativo' })).toThrow(/ana@x.com/)
  })

  it('recusa status fora de ativo/inativo', () => {
    expect(() => documentoDeMembro('ana@x.com', { nome: 'Ana', status: 'suspenso' })).toThrow(/suspenso/)
  })
})

// Prova que a carga produz documentos que o app consegue ler: os parsers e as
// agregações do Histórico rodam sobre exatamente o que seria gravado.
describe('compatibilidade com os parsers do app', () => {
  const rodada = planejar({ participantes: ['ana@x.com', 'bia@x.com'], pendencias: ['bia@x.com'] })
  const documentos = documentosDaRodada(rodada)
  const semCaminho = (trecho: string) => documentos.find((documento) => documento.caminho.includes(trecho))!.campos

  it('a Edição passa por paraEdicao', () => {
    expect(paraEdicao(rodada.id, semCaminho('edicoes/historico-2025-09'))).toEqual({
      id: 'historico-2025-09',
      prazo: '2025-09-30',
      metaEntregas: 1,
      status: 'concluida',
      participantes: ['ana@x.com', 'bia@x.com'],
      fechadaEm: '2025-09-30'
    })
  })

  it('a Entrega passa por paraEntregas', () => {
    expect(paraEntregas('ana@x.com', semCaminho('selecoes/ana@x.com'))).toEqual([
      { styleId: '7B', observation: '', deliveredAt: '2025-09-30' }
    ])
  })

  it('o Histórico mostra a Pendência de quem não entregou, e só dela', () => {
    const edicao = paraEdicao(rodada.id, semCaminho('edicoes/historico-2025-09'))
    const entregasPorMembro = [
      { membroId: 'ana@x.com', entregas: paraEntregas('ana@x.com', semCaminho('selecoes/ana@x.com')) }
    ]
    expect(pendenciasEmAberto([{ edicao, entregasPorMembro }])).toEqual([
      { membroId: 'bia@x.com', edicaoId: 'historico-2025-09', quantidade: 1 }
    ])
  })

  it('o ranking conta uma Entrega do Estilo único por participante que entregou', () => {
    const entregas = rodada.entregaram.map((membroId) => ({
      membroId,
      entregas: paraEntregas(membroId, semCaminho(`selecoes/${membroId}`))
    }))
    expect(contarEstilos(entregas)).toEqual([{ styleId: '7B', quantidade: 1 }])
  })
})
