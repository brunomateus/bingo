import { describe, expect, it, vi } from 'vitest'
import { FakeAutenticadorGoogle } from '../autenticacao/fake-autenticador-google'
import { AutenticacaoDeMembro } from '../casos-uso/autenticacao-de-membro'
import type { Membro } from '../domain/membro'
import { FakeRepositorioMembros } from '../repositorios/fake-repositorio-membros'
import { criarSessao } from './sessao'

const ANA: Membro = {
  id: 'ana@exemplo.com',
  nome: 'Ana',
  email: 'ana@exemplo.com',
  papel: 'organizador',
  status: 'ativo',
  uid: null
}

function montarSessao(membros: Membro[] = [ANA], credencial = { uid: 'uid-ana', email: 'ana@exemplo.com' }) {
  const repositorio = new FakeRepositorioMembros(membros)
  const autenticador = new FakeAutenticadorGoogle(credencial)
  return { repositorio, autenticador, sessao: criarSessao(new AutenticacaoDeMembro(autenticador, repositorio)) }
}

describe('criarSessao', () => {
  it('começa carregando e fica pronta quando o provedor responde que não há sessão', async () => {
    const { sessao } = montarSessao()
    await sessao.pronta()
    expect(sessao.carregando.value).toBe(false)
    expect(sessao.membro.value).toBeNull()
  })

  it('publica o Membro e o papel após o login', async () => {
    const { sessao } = montarSessao()
    await sessao.entrar()
    expect(sessao.membro.value).toMatchObject({ nome: 'Ana' })
    expect(sessao.ehOrganizador.value).toBe(true)
  })

  it('não considera Membro comum como Organizador', async () => {
    const { sessao } = montarSessao([{ ...ANA, papel: 'membro-comum' }])
    await sessao.entrar()
    expect(sessao.ehOrganizador.value).toBe(false)
  })

  it('expõe a recusa de regra na tela, sem logar ninguém', async () => {
    const { sessao } = montarSessao([{ ...ANA, status: 'inativo' }])
    await sessao.entrar()
    expect(sessao.membro.value).toBeNull()
    expect(sessao.recusa.value).toMatch(/está inativo/)
    expect(sessao.carregando.value).toBe(false)
  })

  it('esconde detalhe técnico atrás de mensagem genérica', async () => {
    const consoleErro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { autenticador, sessao } = montarSessao()
    autenticador.proximaCredencial = null
    await sessao.entrar()
    expect(sessao.recusa.value).toBe('Não foi possível completar o login. Tente novamente.')
    expect(consoleErro).toHaveBeenCalled()
    consoleErro.mockRestore()
  })

  it('limpa o Membro ao sair', async () => {
    const { sessao } = montarSessao()
    await sessao.entrar()
    await sessao.sair()
    expect(sessao.membro.value).toBeNull()
  })

  it('derruba a sessão restaurada de quem foi desativado enquanto estava logado', async () => {
    const { repositorio, autenticador } = montarSessao()
    await repositorio.definirStatus('ana@exemplo.com', 'inativo')
    autenticador.credencialAtual = { uid: 'uid-ana', email: 'ana@exemplo.com' }
    const sessao = criarSessao(new AutenticacaoDeMembro(autenticador, repositorio))
    await vi.waitFor(() => expect(sessao.recusa.value).toMatch(/está inativo/))
    expect(sessao.membro.value).toBeNull()
  })
})
