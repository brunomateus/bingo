import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConsultaDoHistorico } from '../casos-uso/consulta-do-historico'
import { RegistroDeEntregas } from '../casos-uso/registro-de-entregas'
import type { Edicao } from '../domain/edicao'
import type { Entrega } from '../domain/entrega'
import type { Membro } from '../domain/membro'
import { FakeRepositorioEdicoes } from '../repositorios/fake-repositorio-edicoes'
import { FakeRepositorioEntregas } from '../repositorios/fake-repositorio-entregas'
import { FakeRepositorioMembros } from '../repositorios/fake-repositorio-membros'
import { FakeRepositorioPool } from '../repositorios/fake-repositorio-pool'
import { usarHistorico, type HistoricoNaTela } from './usar-historico'

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

describe('usarHistorico', () => {
  let historico: HistoricoNaTela

  beforeEach(async () => {
    const edicoes = new FakeRepositorioEdicoes([
      edicao('julho', 'concluida', '2026-07-31T00:00:00.000Z'),
      edicao('setembro', 'aberta', null)
    ])
    const entregas = new FakeRepositorioEntregas({
      julho: { 'caio@x.com': [entrega('21A'), entrega('13C')], 'ana@x.com': [entrega('21A')] }
    })
    const pool = new FakeRepositorioPool({
      julho: [
        { membroId: 'ana@x.com', styleId: '21A' },
        { membroId: 'caio@x.com', styleId: '13C' }
      ]
    })
    const membros = new FakeRepositorioMembros(MEMBROS)
    historico = usarHistorico(
      new ConsultaDoHistorico(edicoes, entregas, membros, pool),
      new RegistroDeEntregas(edicoes, pool, entregas, () => new Date('2026-09-10T12:00:00.000Z')),
      ref(MEMBROS[0])
    )
    await historico.recarregar()
  })

  it('abre na aba de Edições', () => {
    expect(historico.aba.value).toBe('edicoes')
  })

  it('traz as Edições concluídas com os Estilos entregues nelas', () => {
    expect(historico.edicoes.value[0].edicao.id).toBe('julho')
    expect(historico.edicoes.value[0].entregasPorMembro).toHaveLength(2)
  })

  it('ordena a produção por nome do Membro', () => {
    expect(historico.producao.value.map((linha) => historico.nomeDe(linha.membroId))).toEqual(['Ana', 'Caio'])
  })

  it('conta os Estilos que um Membro entregou', () => {
    const doCaio = historico.producao.value.find((linha) => linha.membroId === 'caio@x.com')!
    expect(historico.estilosDe(doCaio).map((item) => item.styleId)).toEqual(['13C', '21A'])
  })

  it('rankeia por vezes entregues', () => {
    expect(historico.ranking.value[0]).toEqual({ styleId: '21A', quantidade: 2 })
  })

  it('rotula a Edição fechada pela data de fechamento e a aberta pelo prazo', () => {
    expect(historico.rotuloDe('julho')).toBe('Edição encerrada em 31/07/2026')
    expect(historico.rotuloDe('setembro')).toBe('Edição em curso (prazo 31/12/2026)')
  })

  it('mostra o nome de Membro inativo, que o Histórico preserva', () => {
    expect(historico.nomeDe('caio@x.com')).toBe('Caio')
  })

  it('cai no id quando o Membro não é conhecido', () => {
    expect(historico.nomeDe('sumido@x.com')).toBe('sumido@x.com')
  })

  it('traz cada Membro devedor uma vez só, com o total e a Edição em curso antes das fechadas', () => {
    expect(historico.pendencias.value).toEqual([
      {
        membroId: 'ana@x.com',
        total: 3,
        porEdicao: [
          { membroId: 'ana@x.com', edicaoId: 'setembro', quantidade: 2 },
          { membroId: 'ana@x.com', edicaoId: 'julho', quantidade: 1 }
        ]
      },
      { membroId: 'caio@x.com', total: 2, porEdicao: [{ membroId: 'caio@x.com', edicaoId: 'setembro', quantidade: 2 }] }
    ])
  })

  describe('Entrega atrasada', () => {
    it('reconhece as linhas de Pendência do próprio Membro logado', () => {
      expect(historico.ehMinha('ana@x.com')).toBe(true)
      expect(historico.ehMinha('caio@x.com')).toBe(false)
    })

    it('oferece os Estilos do Pool daquela Edição que o Membro ainda não entregou nela', () => {
      expect(historico.estilosEntregaveisEm('julho').map((estilo) => estilo.id)).toEqual(['13C'])
    })

    it('quita a Pendência de uma Edição já encerrada e some com a linha', async () => {
      await historico.quitarEntrega('julho', '13C', 'entregue atrasado')
      const daAna = historico.pendencias.value.find((devedor) => devedor.membroId === 'ana@x.com')!
      expect(daAna.total).toBe(2)
      expect(daAna.porEdicao.some((linha) => linha.edicaoId === 'julho')).toBe(false)
      expect(historico.ranking.value.find((item) => item.styleId === '13C')?.quantidade).toBe(2)
    })

    it('mostra a recusa quando o Estilo não está no Pool daquela Edição', async () => {
      await historico.quitarEntrega('julho', '1A', '')
      expect(historico.erro.value).toMatch(/não está no Pool/)
    })
  })

  it('mostra mensagem genérica quando a carga falha', async () => {
    const consoleErro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const quebrada = { carregar: () => Promise.reject(new Error('offline')) } as unknown as ConsultaDoHistorico
    const comFalha = usarHistorico(quebrada, {} as RegistroDeEntregas, ref(MEMBROS[0]))
    await comFalha.recarregar()
    expect(comFalha.erro.value).toMatch(/Verifique sua conexão/)
    expect(comFalha.edicoes.value).toEqual([])
    consoleErro.mockRestore()
  })
})
