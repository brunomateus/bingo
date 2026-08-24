import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { lerConfiguracaoFirebase, usaEmulador, type AmbienteFirebase } from './configuracao-firebase'

/** Portas declaradas em firebase.json — precisam bater com as do emulador. */
const PORTA_AUTH = 9099
const PORTA_FIRESTORE = 8080

export interface ServicosFirebase {
  db: Firestore
  auth: Auth
}

/**
 * Ponto único de inicialização do Firebase (composition root). Os repositórios
 * recebem `db`/`auth` por parâmetro, e não importam este módulo, para continuarem
 * testáveis com fakes.
 *
 * @example const { db, auth } = criarServicosFirebase(import.meta.env)
 */
export function criarServicosFirebase(ambiente: AmbienteFirebase): ServicosFirebase {
  const app = initializeApp(lerConfiguracaoFirebase(ambiente))
  const servicos: ServicosFirebase = { db: getFirestore(app), auth: getAuth(app) }
  if (usaEmulador(ambiente)) {
    conectarEmuladores(servicos)
  }
  return servicos
}

function conectarEmuladores({ db, auth }: ServicosFirebase): void {
  connectAuthEmulator(auth, `http://127.0.0.1:${PORTA_AUTH}`, { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', PORTA_FIRESTORE)
}
