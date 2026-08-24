import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GestaoDeMembros } from '../casos-uso/gestao-de-membros'
import type { Membro } from '../domain/membro'
import { FakeRepositorioMembros } from '../repositorios/fake-repositorio-membros'
import { usarListaDeMembros, type ListaDeMembros } from './usar-lista-de-membros'

function membro(nome: string, papel: Membro['papel'], status: Membro['status'] = 'ativo'): Membro {
  const email = `${nome.toLowerCase()}@exemplo.com`
  return { id: email, nome, email, papel, status, uid: null }
}

describe('usarListaDeMembros', () => {
  let repositorio: FakeRepositorioMembros
  let lista: ListaDeMembros

  beforeEach(async () => {
    repositorio = new FakeRepositorioMembros([membro('Ana', 'organizador'), membro('Caio', 'membro-comum')])
    lista = usarListaDeMembros(new GestaoDeMembros(repositorio))
    await lista.recarregar()
  })

  it('separa os cards por status', async () => {
    await lista.desativar('caio@exemplo.com')
    expect(lista.ativos.value.map((m) => m.nome)).toEqual(['Ana'])
    expect(lista.inativos.value.map((m) => m.nome)).toEqual(['Caio'])
  })

  it('cadastra e já reflete o novo Membro na grade de ativos', async () => {
    expect(await lista.cadastrar('Bia', 'bia@exemplo.com')).toBe(true)
    expect(lista.ativos.value.map((m) => m.nome)).toEqual(['Ana', 'Bia', 'Caio'])
  })

  it('mostra a recusa e não cadastra quando o e-mail repete', async () => {
    expect(await lista.cadastrar('Outra', 'ana@exemplo.com')).toBe(false)
    expect(lista.erro.value).toMatch(/Já existe um Membro/)
    expect(lista.ativos.value).toHaveLength(2)
  })

  it('alterna o papel nos dois sentidos', async () => {
    await lista.alternarPapel(lista.ativos.value[1])
    expect(await repositorio.buscarPorId('caio@exemplo.com')).toMatchObject({ papel: 'organizador' })
    await lista.alternarPapel(lista.ativos.value[1])
    expect(await repositorio.buscarPorId('caio@exemplo.com')).toMatchObject({ papel: 'membro-comum' })
  })

  it('protege o último Organizador ativo, e libera quando há outro', async () => {
    expect(lista.motivoDeProtecao('ana@exemplo.com')).toMatch(/Último Organizador ativo/)
    expect(lista.motivoDeProtecao('caio@exemplo.com')).toBeNull()
    await lista.alternarPapel(lista.ativos.value[1])
    expect(lista.motivoDeProtecao('ana@exemplo.com')).toBeNull()
  })

  it('limpa o erro anterior quando a ação seguinte dá certo', async () => {
    await lista.desativar('ana@exemplo.com')
    expect(lista.erro.value).not.toBeNull()
    await lista.desativar('caio@exemplo.com')
    expect(lista.erro.value).toBeNull()
  })

  it('reativa um Membro inativo', async () => {
    await lista.desativar('caio@exemplo.com')
    await lista.reativar('caio@exemplo.com')
    expect(lista.ativos.value.map((m) => m.nome)).toEqual(['Ana', 'Caio'])
  })

  it('esconde falha técnica atrás de mensagem genérica', async () => {
    const consoleErro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const gestaoQuebrada = { desativar: () => Promise.reject(new Error('offline')) } as unknown as GestaoDeMembros
    const listaQuebrada = usarListaDeMembros(gestaoQuebrada)
    await listaQuebrada.desativar('ana@exemplo.com')
    expect(listaQuebrada.erro.value).toMatch(/Verifique sua conexão/)
    consoleErro.mockRestore()
  })
})
