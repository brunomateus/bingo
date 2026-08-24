import { beforeEach, describe, expect, it } from 'vitest'
import type { Edicao } from '../domain/edicao'
import type { Membro } from '../domain/membro'
import { faseDaEdicao } from '../domain/regras-da-edicao'
import { FakeRepositorioEdicoes } from '../repositorios/fake-repositorio-edicoes'
import { FakeRepositorioEntregas } from '../repositorios/fake-repositorio-entregas'
import { FakeRepositorioMembros } from '../repositorios/fake-repositorio-membros'
import { FakeRepositorioPool } from '../repositorios/fake-repositorio-pool'
import { CicloDaEdicao } from './ciclo-da-edicao'

const HOJE = new Date(2026, 7, 23)

function membro(nome: string, status: Membro['status'] = 'ativo'): Membro {
  const email = `${nome.toLowerCase()}@exemplo.com`
  return { id: email, nome, email, papel: 'membro-comum', status, uid: null }
}

describe('CicloDaEdicao', () => {
  let edicoes: FakeRepositorioEdicoes
  let pool: FakeRepositorioPool
  let membros: FakeRepositorioMembros
  let entregas: FakeRepositorioEntregas
  let ciclo: CicloDaEdicao

  beforeEach(() => {
    edicoes = new FakeRepositorioEdicoes()
    pool = new FakeRepositorioPool()
    membros = new FakeRepositorioMembros([membro('Ana'), membro('Caio'), membro('Bia', 'inativo')])
    entregas = new FakeRepositorioEntregas()
    ciclo = new CicloDaEdicao(edicoes, pool, membros, entregas, () => HOJE)
  })

  describe('abrir', () => {
    it('faz snapshot só dos Membros ativos', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 3)
      expect(edicao.participantes).toEqual(['ana@exemplo.com', 'caio@exemplo.com'])
      expect(edicao).toMatchObject({ status: 'aberta', metaEntregas: 3, fechadaEm: null })
    })

    it('congela o snapshot: quem entra depois não vira participante', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 3)
      await membros.criar(membro('Dina'))
      expect((await edicoes.buscarPorId(edicao.id))?.participantes).toEqual(['ana@exemplo.com', 'caio@exemplo.com'])
    })

    it('recusa uma segunda Edição enquanto a anterior não fecha', async () => {
      await ciclo.abrir('2026-09-30', 3)
      await expect(ciclo.abrir('2026-10-30', 3)).rejects.toThrow('ainda está aberta')
    })

    it('libera a próxima Edição depois do fechamento', async () => {
      const primeira = await ciclo.abrir('2026-09-30', 3)
      await ciclo.fechar(primeira.id)
      await expect(ciclo.abrir('2026-10-30', 5)).resolves.toMatchObject({ metaEntregas: 5 })
    })

    it('recusa prazo no passado e meta inválida', async () => {
      await expect(ciclo.abrir('2026-08-01', 3)).rejects.toThrow('já passou')
      await expect(ciclo.abrir('2026-09-30', 0)).rejects.toThrow('Meta de Entregas inválida')
    })

    it('recusa abrir sem Membro ativo', async () => {
      await membros.definirStatus('ana@exemplo.com', 'inativo')
      await membros.definirStatus('caio@exemplo.com', 'inativo')
      await expect(ciclo.abrir('2026-09-30', 3)).rejects.toThrow('Nenhum Membro ativo')
    })
  })

  describe('estenderPrazo', () => {
    it('adia o prazo da Edição aberta', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 3)
      await ciclo.estenderPrazo(edicao.id, '2026-10-31')
      expect(await edicoes.buscarPorId(edicao.id)).toMatchObject({ prazo: '2026-10-31' })
    })

    it('recusa encurtar', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 3)
      await expect(ciclo.estenderPrazo(edicao.id, '2026-09-01')).rejects.toThrow('só pode ser estendido')
    })
  })

  describe('forcarAvancoDaFase1', () => {
    let edicao: Edicao

    beforeEach(async () => {
      edicao = await ciclo.abrir('2026-09-30', 3)
      await pool.reivindicar(edicao.id, { membroId: 'ana@exemplo.com', styleId: '21A' })
    })

    it('completa o Pool pelos pendentes e, com isso, avança a fase', async () => {
      await ciclo.forcarAvancoDaFase1(edicao.id, { 'caio@exemplo.com': '13C' })
      const reivindicacoes = await pool.listar(edicao.id)
      expect(reivindicacoes).toHaveLength(2)
      expect(faseDaEdicao(edicao, reivindicacoes)).toBe('entregas')
    })

    it('não mexe em quem já tinha reivindicado', async () => {
      await ciclo.forcarAvancoDaFase1(edicao.id, { 'ana@exemplo.com': '1A', 'caio@exemplo.com': '13C' })
      const daAna = (await pool.listar(edicao.id)).filter((r) => r.membroId === 'ana@exemplo.com')
      expect(daAna).toEqual([{ membroId: 'ana@exemplo.com', styleId: '21A' }])
    })

    it('exige uma escolha para cada pendente, nomeando quem faltou', async () => {
      await expect(ciclo.forcarAvancoDaFase1(edicao.id, {})).rejects.toThrow('Faltou: caio@exemplo.com')
    })

    it('recusa Estilo que já está no Pool', async () => {
      await expect(ciclo.forcarAvancoDaFase1(edicao.id, { 'caio@exemplo.com': '21A' })).rejects.toThrow(
        'escolhido duas vezes'
      )
    })

    it('recusa id de Estilo fora do guia BJCP', async () => {
      await expect(ciclo.forcarAvancoDaFase1(edicao.id, { 'caio@exemplo.com': '99Z' })).rejects.toThrow('desconhecido')
    })

    it('não grava nada quando alguma escolha é inválida', async () => {
      await expect(ciclo.forcarAvancoDaFase1(edicao.id, { 'caio@exemplo.com': '99Z' })).rejects.toThrow()
      expect(await pool.listar(edicao.id)).toHaveLength(1)
    })
  })

  describe('fechar', () => {
    it('cancela quando nada foi reivindicado', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 3)
      expect(await ciclo.fechar(edicao.id)).toBe('cancelada')
      expect(await edicoes.buscarPorId(edicao.id)).toMatchObject({ status: 'cancelada', fechadaEm: HOJE.toISOString() })
    })

    it('conclui quando houve atividade no Pool', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 3)
      await pool.reivindicar(edicao.id, { membroId: 'ana@exemplo.com', styleId: '21A' })
      expect(await ciclo.fechar(edicao.id)).toBe('concluida')
    })

    it('conclui quando houve Entrega, mesmo sem nada no Pool', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 3)
      await entregas.registrar(edicao.id, 'ana@exemplo.com', {
        styleId: '21A',
        observation: '',
        deliveredAt: HOJE.toISOString()
      })
      expect(await ciclo.fechar(edicao.id)).toBe('concluida')
    })

    it('libera o singleton de Edição aberta', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 3)
      await ciclo.fechar(edicao.id)
      expect(await edicoes.buscarAberta()).toBeNull()
    })

    it('recusa fechar duas vezes', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 3)
      await ciclo.fechar(edicao.id)
      await expect(ciclo.fechar(edicao.id)).rejects.toThrow('já foi fechada')
    })
  })

  describe('fecharSePossivel', () => {
    it('não fecha com prazo em aberto e metas por cumprir', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 3)
      expect(await ciclo.fecharSePossivel(edicao)).toBeNull()
    })

    it('fecha quando o prazo já passou, com o resultado que a atividade determina', async () => {
      const edicao = await ciclo.abrir('2026-08-23', 3)
      await pool.reivindicar(edicao.id, { membroId: 'ana@exemplo.com', styleId: '21A' })
      const cicloDepois = new CicloDaEdicao(edicoes, pool, membros, entregas, () => new Date(2026, 7, 24))
      expect(await cicloDepois.fecharSePossivel(edicao)).toBe('concluida')
      expect(await edicoes.buscarAberta()).toBeNull()
    })

    it('fecha antes do prazo quando todo participante cumpriu a meta', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 1)
      await pool.reivindicar(edicao.id, { membroId: 'ana@exemplo.com', styleId: '21A' })
      for (const membroId of ['ana@exemplo.com', 'caio@exemplo.com']) {
        await entregas.registrar(edicao.id, membroId, {
          styleId: '21A',
          observation: '',
          deliveredAt: HOJE.toISOString()
        })
      }
      expect(await ciclo.fecharSePossivel(edicao)).toBe('concluida')
    })

    it('não fecha enquanto um participante ainda deve Entregas', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 1)
      await entregas.registrar(edicao.id, 'ana@exemplo.com', {
        styleId: '21A',
        observation: '',
        deliveredAt: HOJE.toISOString()
      })
      expect(await ciclo.fecharSePossivel(edicao)).toBeNull()
    })

    it('ignora Edição já fechada', async () => {
      const edicao = await ciclo.abrir('2026-09-30', 3)
      await ciclo.fechar(edicao.id)
      const fechada = await edicoes.buscarPorId(edicao.id)
      expect(await ciclo.fecharSePossivel(fechada!)).toBeNull()
    })
  })
})
