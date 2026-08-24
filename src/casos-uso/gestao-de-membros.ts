import { ErroDeRegra } from '../domain/erro-de-regra'
import { motivoParaProtegerOrganizador } from '../domain/guarda-organizador'
import type { Membro, MembroId } from '../domain/membro'
import { membroIdDoEmail } from '../domain/membro-id'
import type { RepositorioMembros } from '../repositorios/repositorio-membros'

/**
 * As ações do Organizador sobre a lista de Membros (SPEC.md §2). Recebe o
 * repositório por construtor para rodar sobre o fake nos testes.
 *
 * @example await new GestaoDeMembros(repositorio).cadastrar('Ana', 'ana@exemplo.com')
 */
export class GestaoDeMembros {
  private readonly repositorio: RepositorioMembros

  constructor(repositorio: RepositorioMembros) {
    this.repositorio = repositorio
  }

  /** Todos os Membros, ativos e inativos, em ordem alfabética de nome. */
  async listar(): Promise<Membro[]> {
    const membros = await this.repositorio.listar()
    return membros.sort((um, outro) => um.nome.localeCompare(outro.nome, 'pt-BR'))
  }

  /** Cadastra um Membro comum ativo; papel e status iniciais não são escolhidos aqui. */
  async cadastrar(nome: string, email: string): Promise<Membro> {
    const nomeLimpo = nome.trim()
    if (nomeLimpo === '') {
      throw new ErroDeRegra('Informe o nome do Membro.')
    }
    const id = membroIdDoEmail(email)
    await this.recusarEmailJaCadastrado(id)
    const membro: Membro = { id, nome: nomeLimpo, email: id, papel: 'membro-comum', status: 'ativo', uid: null }
    await this.repositorio.criar(membro)
    return membro
  }

  async promover(id: MembroId): Promise<void> {
    const membro = await this.exigirMembroAtivo(id, 'promover')
    if (membro.papel === 'organizador') {
      throw new ErroDeRegra(`${membro.nome} já é Organizador.`)
    }
    await this.repositorio.definirPapel(id, 'organizador')
  }

  async rebaixar(id: MembroId): Promise<void> {
    const membro = await this.exigirMembroAtivo(id, 'rebaixar')
    if (membro.papel !== 'organizador') {
      throw new ErroDeRegra(`${membro.nome} já é Membro comum.`)
    }
    await this.recusarSeUltimoOrganizador(id)
    await this.repositorio.definirPapel(id, 'membro-comum')
  }

  /** "Remover da confraria" é soft delete: o registro e o Histórico continuam. */
  async desativar(id: MembroId): Promise<void> {
    await this.exigirMembroAtivo(id, 'desativar')
    await this.recusarSeUltimoOrganizador(id)
    await this.repositorio.definirStatus(id, 'inativo')
  }

  async reativar(id: MembroId): Promise<void> {
    const membro = await this.exigirMembro(id)
    if (membro.status === 'ativo') {
      throw new ErroDeRegra(`${membro.nome} já está ativo.`)
    }
    await this.repositorio.definirStatus(id, 'ativo')
  }

  private async recusarEmailJaCadastrado(id: MembroId): Promise<void> {
    const existente = await this.repositorio.buscarPorId(id)
    if (existente) {
      throw new ErroDeRegra(`Já existe um Membro com o e-mail ${id}: ${existente.nome}.`)
    }
  }

  private async recusarSeUltimoOrganizador(id: MembroId): Promise<void> {
    const motivo = motivoParaProtegerOrganizador(await this.repositorio.listar(), id)
    if (motivo) {
      throw new ErroDeRegra(motivo)
    }
  }

  /** Membro inativo não tem papel editável: a única ação disponível é Reativar. */
  private async exigirMembroAtivo(id: MembroId, acao: string): Promise<Membro> {
    const membro = await this.exigirMembro(id)
    if (membro.status !== 'ativo') {
      throw new ErroDeRegra(`Não é possível ${acao} ${membro.nome}: o Membro está inativo. Reative-o antes.`)
    }
    return membro
  }

  private async exigirMembro(id: MembroId): Promise<Membro> {
    const membro = await this.repositorio.buscarPorId(id)
    if (!membro) {
      throw new ErroDeRegra(`Membro não encontrado: ${id}.`)
    }
    return membro
  }
}
