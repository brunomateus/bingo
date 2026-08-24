import { beforeEach, describe, expect, it } from 'vitest'
import type { Edicao } from '../domain/edicao'
import { FakeRepositorioEdicoes } from '../repositorios/fake-repositorio-edicoes'
import { FakeRepositorioEntregas } from '../repositorios/fake-repositorio-entregas'
import { FakeRepositorioPool } from '../repositorios/fake-repositorio-pool'
import { RegistroDeEntregas } from './registro-de-entregas'

const MOMENTO = new Date('2026-09-01T20:00:00.000Z')

const EDICAO: Edicao = {
  id: 'edicao-1',
  prazo: '2026-12-31',
  metaEntregas: 2,
  status: 'aberta',
  participantes: ['ana@exemplo.com', 'caio@exemplo.com'],
  fechadaEm: null
}

const POOL = {
  'edicao-1': [
    { membroId: 'ana@exemplo.com', styleId: '21A' },
    { membroId: 'caio@exemplo.com', styleId: '13C' }
  ]
}

describe('RegistroDeEntregas', () => {
  let entregas: FakeRepositorioEntregas
  let registro: RegistroDeEntregas

  beforeEach(() => {
    entregas = new FakeRepositorioEntregas()
    registro = new RegistroDeEntregas(
      new FakeRepositorioEdicoes([EDICAO]),
      new FakeRepositorioPool(POOL),
      entregas,
      () => MOMENTO
    )
  })

  it('registra a Entrega com Estilo, observação e instante', async () => {
    expect(await registro.registrar('edicao-1', 'ana@exemplo.com', '21A', 'no bar do Zé')).toEqual({
      styleId: '21A',
      observation: 'no bar do Zé',
      deliveredAt: MOMENTO.toISOString()
    })
    expect(await entregas.buscarDoMembro('edicao-1', 'ana@exemplo.com')).toHaveLength(1)
  })

  it('aceita observação vazia', async () => {
    await expect(registro.registrar('edicao-1', 'ana@exemplo.com', '21A', '')).resolves.toMatchObject({
      observation: ''
    })
  })

  it('recusa Estilo fora do Pool, mesmo sendo BJCP válido', async () => {
    await expect(registro.registrar('edicao-1', 'ana@exemplo.com', '1A', '')).rejects.toThrow('não está no Pool')
  })

  it('recusa id que nem existe no guia BJCP', async () => {
    await expect(registro.registrar('edicao-1', 'ana@exemplo.com', '99Z', '')).rejects.toThrow('desconhecido')
  })

  it('recusa repetir o Estilo que o próprio Membro já entregou', async () => {
    await registro.registrar('edicao-1', 'ana@exemplo.com', '21A', '')
    await expect(registro.registrar('edicao-1', 'ana@exemplo.com', '21A', '')).rejects.toThrow('já entregou o Estilo')
  })

  it('deixa outro Membro entregar o mesmo Estilo do Pool', async () => {
    await registro.registrar('edicao-1', 'ana@exemplo.com', '21A', '')
    await expect(registro.registrar('edicao-1', 'caio@exemplo.com', '21A', '')).resolves.toBeDefined()
  })

  it('recusa passar da meta da Edição', async () => {
    await registro.registrar('edicao-1', 'ana@exemplo.com', '21A', '')
    await registro.registrar('edicao-1', 'ana@exemplo.com', '13C', '')
    await expect(registro.registrar('edicao-1', 'ana@exemplo.com', '1A', '')).rejects.toThrow('já cumpriu as 2')
  })

  it('recusa quem não é participante', async () => {
    await expect(registro.registrar('edicao-1', 'zeca@exemplo.com', '21A', '')).rejects.toThrow('não é participante')
  })

  it('aceita Entrega atrasada, com a Edição já fechada', async () => {
    const fechada: Edicao = { ...EDICAO, status: 'concluida', fechadaEm: '2026-10-01T00:00:00.000Z' }
    const atrasado = new RegistroDeEntregas(
      new FakeRepositorioEdicoes([fechada]),
      new FakeRepositorioPool(POOL),
      entregas,
      () => MOMENTO
    )
    await expect(atrasado.registrar('edicao-1', 'ana@exemplo.com', '21A', 'atrasada')).resolves.toBeDefined()
  })

  it('recusa Edição inexistente', async () => {
    await expect(registro.registrar('edicao-9', 'ana@exemplo.com', '21A', '')).rejects.toThrow('não encontrada')
  })
})
