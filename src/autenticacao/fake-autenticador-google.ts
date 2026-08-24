import type { AutenticadorGoogle, CredencialGoogle } from './autenticador-google'

/**
 * Autenticador em memória para testes. `entrarComGoogle` devolve a credencial
 * programada em `proximaCredencial`, simulando a escolha de conta no popup.
 *
 * @example const autenticador = new FakeAutenticadorGoogle({ uid: 'uid-1', email: 'ana@exemplo.com' })
 */
export class FakeAutenticadorGoogle implements AutenticadorGoogle {
  proximaCredencial: CredencialGoogle | null
  credencialAtual: CredencialGoogle | null = null
  saidasSolicitadas = 0

  private readonly ouvintes = new Set<(credencial: CredencialGoogle | null) => void>()

  constructor(proximaCredencial: CredencialGoogle | null = null) {
    this.proximaCredencial = proximaCredencial
  }

  async entrarComGoogle(): Promise<CredencialGoogle> {
    if (!this.proximaCredencial) {
      throw new Error('Nenhuma credencial programada no fake. Esperado definir `proximaCredencial` antes.')
    }
    this.emitir(this.proximaCredencial)
    return this.proximaCredencial
  }

  async sair(): Promise<void> {
    this.saidasSolicitadas += 1
    this.emitir(null)
  }

  observarCredencial(ouvinte: (credencial: CredencialGoogle | null) => void): () => void {
    this.ouvintes.add(ouvinte)
    ouvinte(this.credencialAtual)
    return () => this.ouvintes.delete(ouvinte)
  }

  private emitir(credencial: CredencialGoogle | null): void {
    this.credencialAtual = credencial
    for (const ouvinte of this.ouvintes) {
      ouvinte(credencial)
    }
  }
}
