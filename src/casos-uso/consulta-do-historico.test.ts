import { beforeEach, describe, expect, it } from 'vitest'
import type { Edicao } from '../domain/edicao'
import type { Entrega } from '../domain/entrega'
import type { Membro } from '../domain/membro'
import { FakeRepositorioEdicoes } from '../repositorios/fake-repositorio-edicoes'
import { FakeRepositorioEntregas } from '../repositorios/fake-repositorio-entregas'
import { FakeRepositorioMembros } from '../repositorios/fake-repositorio-membros'
import { FakeRepositorioPool } from '../repositorios/fake-repositorio-pool'
import { ConsultaDoHistorico } from './consulta-do-historico'

function entrega(styleId: string): Entrega {
  return { styleId, observation: '', deliveredAt: '2026-07-15T20:00:00.000Z' }
}

function edicao(id: string, status: Edicao['status'], fechadaEm: string | null): Edicao {
  return { id, prazo: '2026-12-31', metaEntregas: 2, status, participantes: ['ana@x.com', 'caio@x.com'], fechadaEm }
}

const MEMBROS: Membro[] = [
  { id: 'ana@x.com', nome: 'Ana', email: 'ana@x.com', papel: 'organizador', status: 'ativo', uid: null },
  { id: 'caio@x.com', nome: 'Caio', email: 'caio@x.com', papel: 'membro-comum', status: 'inativo', uid: null }
]

describe('ConsultaDoHistorico', () => {
  let consulta: ConsultaDoHistorico

  beforeEach(() => {
    const edicoes = new FakeRepositorioEdicoes([
      edicao('julho', 'concluida', '2026-07-31T00:00:00.000Z'),
      edicao('agosto', 'concluida', '2026-08-31T00:00:00.000Z'),
      edicao('abortada', 'cancelada', '2026-06-30T00:00:00.000Z'),
      edicao('setembro', 'aberta', null)
    ])
    const entregas = new FakeRepositorioEntregas({
      julho: { 'ana@x.com': [entrega('21A'), entrega('13C')], 'caio@x.com': [entrega('21A')] },
      agosto: { 'ana@x.com': [entrega('1A')] },
      setembro: { 'ana@x.com': [entrega('21A')] }
    })
    const pool = new FakeRepositorioPool({
      julho: [
        { membroId: 'ana@x.com', styleId: '21A' },
        { membroId: 'caio@x.com', styleId: '13C' }
      ],
      setembro: [{ membroId: 'ana@x.com', styleId: '1A' }]
    })
    consulta = new ConsultaDoHistorico(edicoes, entregas, new FakeRepositorioMembros(MEMBROS), pool)
  })

  it('lista só Edições concluídas, da mais recente para a mais antiga', async () => {
    const { edicoes } = await consulta.carregar()
    expect(edicoes.map((item) => item.edicao.id)).toEqual(['agosto', 'julho'])
  })

  it('deixa a Edição cancelada fora do Histórico', async () => {
    const { edicoes, ranking } = await consulta.carregar()
    expect(edicoes.some((item) => item.edicao.id === 'abortada')).toBe(false)
    expect(ranking.reduce((soma, item) => soma + item.quantidade, 0)).toBe(4)
  })

  it('não conta a Edição em curso na produção nem no ranking', async () => {
    const { producao, ranking } = await consulta.carregar()
    const daAna = producao.find((linha) => linha.membroId === 'ana@x.com')
    expect(daAna?.entregas).toHaveLength(3)
    expect(ranking.find((item) => item.styleId === '21A')).toEqual({ styleId: '21A', quantidade: 2 })
  })

  it('conta a Edição em curso nas Pendências', async () => {
    const { pendencias } = await consulta.carregar()
    expect(pendencias).toContainEqual({ membroId: 'caio@x.com', edicaoId: 'setembro', quantidade: 2 })
    expect(pendencias).toContainEqual({ membroId: 'ana@x.com', edicaoId: 'setembro', quantidade: 1 })
  })

  it('mantém as Pendências das Edições já fechadas', async () => {
    const { pendencias } = await consulta.carregar()
    expect(pendencias).toContainEqual({ membroId: 'caio@x.com', edicaoId: 'julho', quantidade: 1 })
    expect(pendencias).toContainEqual({ membroId: 'caio@x.com', edicaoId: 'agosto', quantidade: 2 })
  })

  it('não gera Pendência de Edição cancelada', async () => {
    const { pendencias } = await consulta.carregar()
    expect(pendencias.some((linha) => linha.edicaoId === 'abortada')).toBe(false)
  })

  it('resolve nomes, inclusive de quem foi desativado', async () => {
    const { nomePorMembro } = await consulta.carregar()
    expect(nomePorMembro).toEqual({ 'ana@x.com': 'Ana', 'caio@x.com': 'Caio' })
  })

  it('indexa as Edições citadas, para a tela rotular cada linha de Pendência', async () => {
    const { edicaoPorId } = await consulta.carregar()
    expect(Object.keys(edicaoPorId).sort()).toEqual(['agosto', 'julho', 'setembro'])
  })

  it('traz o Pool de cada Edição citada, para quitar Entrega atrasada', async () => {
    const { poolPorEdicao } = await consulta.carregar()
    expect(poolPorEdicao['julho'].map((item) => item.styleId).sort()).toEqual(['13C', '21A'])
    expect(poolPorEdicao['setembro']).toHaveLength(1)
  })

  it('devolve tudo vazio quando nenhuma Edição foi concluída ainda', async () => {
    const vazio = new ConsultaDoHistorico(
      new FakeRepositorioEdicoes(),
      new FakeRepositorioEntregas(),
      new FakeRepositorioMembros(),
      new FakeRepositorioPool()
    )
    expect(await vazio.carregar()).toMatchObject({ edicoes: [], producao: [], ranking: [], pendencias: [] })
  })
})
