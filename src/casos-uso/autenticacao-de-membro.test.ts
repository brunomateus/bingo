import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeAutenticadorGoogle } from '../autenticacao/fake-autenticador-google'
import type { Membro } from '../domain/membro'
import { FakeRepositorioMembros } from '../repositorios/fake-repositorio-membros'
import { AutenticacaoDeMembro, type ResultadoDaSessao } from './autenticacao-de-membro'

function membro(sobrescritas: Partial<Membro> = {}): Membro {
  return {
    id: 'ana@exemplo.com',
    nome: 'Ana',
    email: 'ana@exemplo.com',
    papel: 'organizador',
    status: 'ativo',
    uid: null,
    ...sobrescritas
  }
}

const CREDENCIAL_DA_ANA = { uid: 'uid-ana', email: 'Ana@Exemplo.com' }

describe('AutenticacaoDeMembro', () => {
  let repositorio: FakeRepositorioMembros
  let autenticador: FakeAutenticadorGoogle
  let autenticacao: AutenticacaoDeMembro

  beforeEach(() => {
    repositorio = new FakeRepositorioMembros([membro()])
    autenticador = new FakeAutenticadorGoogle(CREDENCIAL_DA_ANA)
    autenticacao = new AutenticacaoDeMembro(autenticador, repositorio)
  })

  it('deixa entrar quem é Membro ativo, casando o e-mail sem depender da caixa', async () => {
    expect(await autenticacao.entrar()).toMatchObject({ nome: 'Ana', uid: 'uid-ana' })
  })

  it('vincula o uid no primeiro login e o mantém nos seguintes', async () => {
    await autenticacao.entrar()
    expect(await repositorio.buscarPorId('ana@exemplo.com')).toMatchObject({ uid: 'uid-ana' })
    await autenticacao.entrar()
    expect(await repositorio.buscarPorId('ana@exemplo.com')).toMatchObject({ uid: 'uid-ana' })
  })

  it('recusa e-mail não cadastrado, encerrando a sessão do provedor', async () => {
    autenticador.proximaCredencial = { uid: 'uid-x', email: 'estranho@exemplo.com' }
    await expect(autenticacao.entrar()).rejects.toThrow('estranho@exemplo.com não está cadastrado')
    expect(autenticador.saidasSolicitadas).toBe(1)
  })

  it('recusa Membro inativo, revalidando o status a cada login e não só no primeiro', async () => {
    await autenticacao.entrar()
    await repositorio.definirStatus('ana@exemplo.com', 'inativo')
    await expect(autenticacao.entrar()).rejects.toThrow('está inativo')
    expect(autenticador.saidasSolicitadas).toBe(1)
  })

  it('recusa outra conta Google no e-mail de um Membro já vinculado', async () => {
    await autenticacao.entrar()
    autenticador.proximaCredencial = { uid: 'outro-uid', email: 'ana@exemplo.com' }
    await expect(autenticacao.entrar()).rejects.toThrow('não é a vinculada')
  })

  describe('observarSessao', () => {
    it('emite o Membro quando o provedor traz uma credencial válida', async () => {
      const ouvinte = vi.fn<(resultado: ResultadoDaSessao) => void>()
      autenticacao.observarSessao(ouvinte)
      await autenticacao.entrar()
      await vi.waitFor(() =>
        expect(ouvinte).toHaveBeenCalledWith({ membro: expect.objectContaining({ nome: 'Ana' }), recusa: null })
      )
    })

    it('emite recusa, sem membro, quando a sessão restaurada não passa mais na validação', async () => {
      await repositorio.definirStatus('ana@exemplo.com', 'inativo')
      autenticador.credencialAtual = CREDENCIAL_DA_ANA
      const ouvinte = vi.fn<(resultado: ResultadoDaSessao) => void>()
      autenticacao.observarSessao(ouvinte)
      await vi.waitFor(() =>
        expect(ouvinte).toHaveBeenCalledWith({ membro: null, recusa: expect.objectContaining({ name: 'ErroDeRegra' }) })
      )
    })

    it('emite sessão vazia ao sair e para de notificar depois de cancelada', async () => {
      const ouvinte = vi.fn<(resultado: ResultadoDaSessao) => void>()
      const cancelar = autenticacao.observarSessao(ouvinte)
      ouvinte.mockClear()
      cancelar()
      await autenticacao.sair()
      expect(ouvinte).not.toHaveBeenCalled()
    })
  })
})
