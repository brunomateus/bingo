import { describe, expect, it } from 'vitest'
import type { Edicao } from '../domain/edicao'
import type { Membro } from '../domain/membro'
import { FakeRepositorioEdicoes } from '../repositorios/fake-repositorio-edicoes'
import { FakeRepositorioEntregas } from '../repositorios/fake-repositorio-entregas'
import { FakeRepositorioMembros } from '../repositorios/fake-repositorio-membros'
import { FakeRepositorioPool } from '../repositorios/fake-repositorio-pool'
import { ConsultaDaEdicaoAtual } from './consulta-da-edicao-atual'

const ABERTA: Edicao = {
  id: 'edicao-1',
  prazo: '2026-12-31',
  metaEntregas: 3,
  status: 'aberta',
  participantes: ['ana@exemplo.com'],
  fechadaEm: null
}

const ANA: Membro = {
  id: 'ana@exemplo.com',
  nome: 'Ana',
  email: 'ana@exemplo.com',
  papel: 'organizador',
  status: 'ativo',
  uid: null
}

function consulta(edicoes: Edicao[], pool: Record<string, { membroId: string; styleId: string }[]> = {}) {
  return new ConsultaDaEdicaoAtual(
    new FakeRepositorioEdicoes(edicoes),
    new FakeRepositorioPool(pool),
    new FakeRepositorioMembros([ANA]),
    new FakeRepositorioEntregas({
      'edicao-1': { 'ana@exemplo.com': [{ styleId: '21A', observation: '', deliveredAt: '2026-09-01T00:00:00.000Z' }] }
    })
  )
}

describe('ConsultaDaEdicaoAtual', () => {
  it('junta Edição aberta, Pool e nomes numa leitura só', async () => {
    const carregada = await consulta([ABERTA], { 'edicao-1': [{ membroId: 'ana@exemplo.com', styleId: '21A' }] })
    expect(await carregada.carregar()).toEqual({
      edicao: ABERTA,
      reivindicacoes: [{ membroId: 'ana@exemplo.com', styleId: '21A' }],
      entregasPorMembro: [
        {
          membroId: 'ana@exemplo.com',
          entregas: [{ styleId: '21A', observation: '', deliveredAt: '2026-09-01T00:00:00.000Z' }]
        }
      ],
      nomePorMembro: { 'ana@exemplo.com': 'Ana' },
      membrosAtivos: ['ana@exemplo.com']
    })
  })

  it('devolve Pool vazio quando não há Edição aberta, sem consultar a subcoleção', async () => {
    const carregada = await consulta([{ ...ABERTA, status: 'concluida', fechadaEm: '2026-01-01' }])
    expect(await carregada.carregar()).toMatchObject({ edicao: null, reivindicacoes: [], entregasPorMembro: [] })
  })

  it('traz o nome de Membros inativos também, para o Histórico não perder quem saiu', async () => {
    const consultaComInativo = new ConsultaDaEdicaoAtual(
      new FakeRepositorioEdicoes([ABERTA]),
      new FakeRepositorioPool(),
      new FakeRepositorioMembros([ANA, { ...ANA, id: 'bia@exemplo.com', nome: 'Bia', status: 'inativo' }]),
      new FakeRepositorioEntregas()
    )
    const carregada = await consultaComInativo.carregar()
    expect(carregada.nomePorMembro).toEqual({ 'ana@exemplo.com': 'Ana', 'bia@exemplo.com': 'Bia' })
    expect(carregada.membrosAtivos).toEqual(['ana@exemplo.com'])
  })
})
