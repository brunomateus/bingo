import { describe, expect, it } from 'vitest'
import type { Membro } from '../domain/membro'
import { FakeRepositorioMembros } from './fake-repositorio-membros'

function umMembro(sobrescritas: Partial<Membro> = {}): Membro {
  return {
    id: 'fulano@exemplo.com',
    nome: 'Fulano',
    email: 'fulano@exemplo.com',
    papel: 'membro-comum',
    status: 'ativo',
    uid: null,
    ...sobrescritas
  }
}

describe('FakeRepositorioMembros', () => {
  it('devolve por id o membro criado', async () => {
    const repositorio = new FakeRepositorioMembros()
    await repositorio.criar(umMembro())
    expect(await repositorio.buscarPorId('fulano@exemplo.com')).toMatchObject({ nome: 'Fulano' })
  })

  it('devolve null para membro não cadastrado', async () => {
    expect(await new FakeRepositorioMembros().buscarPorId('ninguem@exemplo.com')).toBeNull()
  })

  it('aplica papel, status e uid isoladamente', async () => {
    const repositorio = new FakeRepositorioMembros([umMembro()])
    await repositorio.definirPapel('fulano@exemplo.com', 'organizador')
    await repositorio.definirStatus('fulano@exemplo.com', 'inativo')
    await repositorio.vincularUid('fulano@exemplo.com', 'uid-1')
    expect(await repositorio.buscarPorId('fulano@exemplo.com')).toMatchObject({
      papel: 'organizador',
      status: 'inativo',
      uid: 'uid-1'
    })
  })

  it('não deixa o chamador mutar o estado interno pela referência devolvida', async () => {
    const repositorio = new FakeRepositorioMembros([umMembro()])
    const lido = await repositorio.buscarPorId('fulano@exemplo.com')
    lido!.nome = 'Outro'
    expect(await repositorio.buscarPorId('fulano@exemplo.com')).toMatchObject({ nome: 'Fulano' })
  })

  it('recusa e-mail duplicado informando o id', async () => {
    const repositorio = new FakeRepositorioMembros([umMembro()])
    await expect(repositorio.criar(umMembro())).rejects.toThrow('"fulano@exemplo.com"')
  })

  it('reporta o id ao editar membro inexistente', async () => {
    const repositorio = new FakeRepositorioMembros()
    await expect(repositorio.definirPapel('ninguem@exemplo.com', 'organizador')).rejects.toThrow(
      '"ninguem@exemplo.com"'
    )
  })
})
