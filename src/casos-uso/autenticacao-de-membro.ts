import type { AutenticadorGoogle, CredencialGoogle } from '../autenticacao/autenticador-google'
import { ErroDeRegra } from '../domain/erro-de-regra'
import type { Membro } from '../domain/membro'
import { membroIdDoEmail } from '../domain/membro-id'
import type { RepositorioMembros } from '../repositorios/repositorio-membros'

/** Resultado de uma revalidação de sessão: o Membro autenticado ou o motivo da recusa. */
export type ResultadoDaSessao =
  | { membro: Membro; recusa: null }
  | { membro: null; recusa: ErroDeRegra | null }

/**
 * Porteiro do login (SPEC.md §2): só entra quem tem conta Google cujo e-mail
 * corresponde a um Membro cadastrado e ativo. A checagem roda em toda tentativa
 * de login e a cada mudança de sessão, não só na primeira — um Membro desativado
 * enquanto estava logado perde o acesso na revalidação seguinte.
 *
 * @example const membro = await new AutenticacaoDeMembro(autenticador, repositorio).entrar()
 */
export class AutenticacaoDeMembro {
  private readonly autenticador: AutenticadorGoogle
  private readonly repositorio: RepositorioMembros

  constructor(autenticador: AutenticadorGoogle, repositorio: RepositorioMembros) {
    this.autenticador = autenticador
    this.repositorio = repositorio
  }

  /** Abre o login do Google e valida a credencial; encerra a sessão se ela for recusada. */
  async entrar(): Promise<Membro> {
    const credencial = await this.autenticador.entrarComGoogle()
    return await this.validar(credencial)
  }

  async sair(): Promise<void> {
    await this.autenticador.sair()
  }

  /**
   * Reage a cada mudança de sessão do provedor, revalidando o Membro. Devolve a
   * função que cancela a inscrição.
   */
  observarSessao(ouvinte: (resultado: ResultadoDaSessao) => void): () => void {
    return this.autenticador.observarCredencial((credencial) => {
      if (!credencial) {
        ouvinte({ membro: null, recusa: null })
        return
      }
      this.validar(credencial).then(
        (membro) => ouvinte({ membro, recusa: null }),
        (erro: unknown) => ouvinte({ membro: null, recusa: comoErroDeRegra(erro) })
      )
    })
  }

  private async validar(credencial: CredencialGoogle): Promise<Membro> {
    const membro = await this.buscarMembroDaCredencial(credencial)
    if (membro.uid === null) {
      await this.repositorio.vincularUid(membro.id, credencial.uid)
      return { ...membro, uid: credencial.uid }
    }
    if (membro.uid !== credencial.uid) {
      throw await this.recusa(
        `A conta Google usada não é a vinculada a ${membro.email}. Peça a um Organizador para revincular o acesso.`
      )
    }
    return membro
  }

  private async buscarMembroDaCredencial(credencial: CredencialGoogle): Promise<Membro> {
    const membro = await this.repositorio.buscarPorId(membroIdDoEmail(credencial.email))
    if (!membro) {
      throw await this.recusa(`O e-mail ${credencial.email} não está cadastrado como Membro da confraria.`)
    }
    if (membro.status !== 'ativo') {
      throw await this.recusa(`O Membro ${membro.nome} está inativo e não pode entrar.`)
    }
    return membro
  }

  /** Encerra a sessão do provedor antes de recusar: quem o domínio barrou não fica logado. */
  private async recusa(mensagem: string): Promise<ErroDeRegra> {
    await this.autenticador.sair()
    return new ErroDeRegra(mensagem)
  }
}

function comoErroDeRegra(erro: unknown): ErroDeRegra {
  return erro instanceof ErroDeRegra ? erro : new ErroDeRegra(`Falha ao validar a sessão: ${String(erro)}`)
}
