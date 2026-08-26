import { beforeEach, describe, expect, it } from 'vitest'
import type { Edicao } from '../domain/edicao'
import { FakeRepositorioEdicoes } from '../repositorios/fake-repositorio-edicoes'
import { FakeRepositorioPool } from '../repositorios/fake-repositorio-pool'
import { SorteioDoPool } from './sorteio-do-pool'

const EDICAO_ABERTA: Edicao = {
  id: 'edicao-1',
  prazo: '2026-12-31',
  metaEntregas: 3,
  status: 'aberta',
  participantes: ['ana@exemplo.com', 'caio@exemplo.com'],
  fechadaEm: null
}

describe('SorteioDoPool', () => {
  let pool: FakeRepositorioPool
  let sorteio: SorteioDoPool

  beforeEach(() => {
    pool = new FakeRepositorioPool()
    sorteio = new SorteioDoPool(new FakeRepositorioEdicoes([EDICAO_ABERTA]), pool)
  })

  it('registra a reivindicação do participante', async () => {
    await sorteio.reivindicar('edicao-1', 'ana@exemplo.com', '21A')
    expect(await pool.listar('edicao-1')).toEqual([{ membroId: 'ana@exemplo.com', styleId: '21A' }])
  })

  it('recusa o mesmo Estilo para dois participantes', async () => {
    await sorteio.reivindicar('edicao-1', 'ana@exemplo.com', '21A')
    await expect(sorteio.reivindicar('edicao-1', 'caio@exemplo.com', '21A')).rejects.toThrow(
      'já foi reivindicado por outro'
    )
  })

  it('recusa a segunda reivindicação do mesmo participante', async () => {
    await sorteio.reivindicar('edicao-1', 'ana@exemplo.com', '21A')
    await expect(sorteio.reivindicar('edicao-1', 'ana@exemplo.com', '1A')).rejects.toThrow(
      'já reivindicou o Estilo 21A'
    )
  })

  it('recusa quem não é participante da Edição', async () => {
    await expect(sorteio.reivindicar('edicao-1', 'bia@exemplo.com', '1A')).rejects.toThrow('não é participante')
  })

  it('recusa Estilo fora do guia BJCP, sem gravar', async () => {
    await expect(sorteio.reivindicar('edicao-1', 'ana@exemplo.com', '99Z')).rejects.toThrow('desconhecido')
    expect(await pool.listar('edicao-1')).toHaveLength(0)
  })

  it('recusa Edição inexistente', async () => {
    await expect(sorteio.reivindicar('edicao-9', 'ana@exemplo.com', '1A')).rejects.toThrow('não encontrada: edicao-9')
  })

  it('recusa reivindicar em Edição fechada', async () => {
    const fechada: Edicao = { ...EDICAO_ABERTA, id: 'edicao-2', status: 'concluida', fechadaEm: '2026-01-01' }
    const sorteioFechado = new SorteioDoPool(new FakeRepositorioEdicoes([fechada]), pool)
    await expect(sorteioFechado.reivindicar('edicao-2', 'ana@exemplo.com', '1A')).rejects.toThrow('já foi fechada')
  })
})
