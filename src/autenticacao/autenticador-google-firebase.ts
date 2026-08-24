import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type Auth, type User } from 'firebase/auth'
import type { AutenticadorGoogle, CredencialGoogle } from './autenticador-google'

/**
 * `AutenticadorGoogle` sobre o Firebase Auth. Único ponto do projeto que conhece
 * `signInWithPopup` e companhia.
 *
 * @example new AutenticadorGoogleFirebase(auth).entrarComGoogle()
 */
export class AutenticadorGoogleFirebase implements AutenticadorGoogle {
  private readonly auth: Auth
  private readonly provedor = new GoogleAuthProvider()

  constructor(auth: Auth) {
    this.auth = auth
    // Sem isso o Google reusa silenciosamente a última conta, o que atrapalha
    // quem tem conta pessoal e conta da confraria no mesmo navegador.
    this.provedor.setCustomParameters({ prompt: 'select_account' })
  }

  async entrarComGoogle(): Promise<CredencialGoogle> {
    const resultado = await signInWithPopup(this.auth, this.provedor)
    return paraCredencial(resultado.user)
  }

  async sair(): Promise<void> {
    await signOut(this.auth)
  }

  observarCredencial(ouvinte: (credencial: CredencialGoogle | null) => void): () => void {
    return onAuthStateChanged(this.auth, (usuario) => ouvinte(usuario ? paraCredencial(usuario) : null))
  }
}

function paraCredencial(usuario: User): CredencialGoogle {
  if (!usuario.email) {
    throw new Error(`Conta Google sem e-mail (uid ${usuario.uid}). Esperado um provedor que exponha o e-mail.`)
  }
  return { uid: usuario.uid, email: usuario.email }
}
