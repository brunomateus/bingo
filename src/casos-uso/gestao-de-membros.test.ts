import { beforeEach, describe, expect, it } from 'vitest'
import type { Membro } from '../domain/membro'
import { FakeRepositorioMembros } from '../repositorios/fake-repositorio-membros'
import { GestaoDeMembros } from './gestao-de-membros'

function membro(nome: string, papel: Membro['papel'], status: Membro['status'] = 'ativo'): Membro {
  const email = `${nome.toLowerCase()}@exemplo.com`
  return { id: email, nome, email, papel, status, uid: null }
}

describe('GestaoDeMembros', () => {
  let repositorio: FakeRepositorioMembros
  let gestao: GestaoDeMembros

  beforeEach(() => {
    repositorio = new FakeRepositorioMembros([membro('Ana', 'organizador'), membro('Caio', 'membro-comum')])
    gestao = new GestaoDeMembros(repositorio)
  })

  describe('listar', () => {
    it('ordena por nome, misturando ativos e inativos', async () => {
      await repositorio.criar(membro('Bia', 'membro-comum', 'inativo'))
      expect((await gestao.listar()).map((m) => m.nome)).toEqual(['Ana', 'Bia', 'Caio'])
    })
  })

  describe('cadastrar', () => {
    it('cria Membro comum ativo, sem uid, com o e-mail normalizado como id', async () => {
      expect(await gestao.cadastrar('  Bia  ', ' Bia@Exemplo.COM ')).toEqual({
        id: 'bia@exemplo.com',
        nome: 'Bia',
        email: 'bia@exemplo.com',
        papel: 'membro-comum',
        status: 'ativo',
        uid: null
      })
    })

    it('recusa e-mail já cadastrado, dizendo de quem é', async () => {
      await expect(gestao.cadastrar('Outra Ana', 'ANA@exemplo.com')).rejects.toThrow(/ana@exemplo.com: Ana/)
    })

    it('recusa nome vazio', async () => {
      await expect(gestao.cadastrar('   ', 'nova@exemplo.com')).rejects.toThrow('Informe o nome')
    })

    it('propaga e-mail inválido com o valor recebido', async () => {
      await expect(gestao.cadastrar('Bia', 'sem-arroba')).rejects.toThrow('"sem-arroba"')
    })
  })

  describe('promover e rebaixar', () => {
    it('promove um Membro comum ativo', async () => {
      await gestao.promover('caio@exemplo.com')
      expect(await repositorio.buscarPorId('caio@exemplo.com')).toMatchObject({ papel: 'organizador' })
    })

    it('rebaixa um Organizador quando há outro ativo', async () => {
      await gestao.promover('caio@exemplo.com')
      await gestao.rebaixar('ana@exemplo.com')
      expect(await repositorio.buscarPorId('ana@exemplo.com')).toMatchObject({ papel: 'membro-comum' })
    })

    it('recusa rebaixar o último Organizador ativo', async () => {
      await expect(gestao.rebaixar('ana@exemplo.com')).rejects.toThrow(/Último Organizador ativo/)
      expect(await repositorio.buscarPorId('ana@exemplo.com')).toMatchObject({ papel: 'organizador' })
    })

    it('não conta Organizador inativo como reserva ao rebaixar', async () => {
      await repositorio.criar(membro('Bia', 'organizador', 'inativo'))
      await expect(gestao.rebaixar('ana@exemplo.com')).rejects.toThrow(/Último Organizador ativo/)
    })

    it('recusa editar papel de Membro inativo', async () => {
      await gestao.desativar('caio@exemplo.com')
      await expect(gestao.promover('caio@exemplo.com')).rejects.toThrow(/inativo. Reative-o antes/)
    })
  })

  describe('desativar e reativar', () => {
    it('desativa sem apagar o registro', async () => {
      await gestao.desativar('caio@exemplo.com')
      expect(await repositorio.buscarPorId('caio@exemplo.com')).toMatchObject({ status: 'inativo', nome: 'Caio' })
    })

    it('recusa desativar o último Organizador ativo', async () => {
      await expect(gestao.desativar('ana@exemplo.com')).rejects.toThrow(/Último Organizador ativo/)
    })

    it('libera desativar o Organizador depois de promover outro', async () => {
      await gestao.promover('caio@exemplo.com')
      await gestao.desativar('ana@exemplo.com')
      expect(await repositorio.buscarPorId('ana@exemplo.com')).toMatchObject({ status: 'inativo' })
    })

    it('reativa preservando o papel que o Membro tinha', async () => {
      await gestao.promover('caio@exemplo.com')
      await gestao.desativar('ana@exemplo.com')
      await gestao.reativar('ana@exemplo.com')
      expect(await repositorio.buscarPorId('ana@exemplo.com')).toMatchObject({ status: 'ativo', papel: 'organizador' })
    })

    it('reporta o id de um Membro inexistente', async () => {
      await expect(gestao.desativar('ninguem@exemplo.com')).rejects.toThrow('ninguem@exemplo.com')
    })
  })
})
