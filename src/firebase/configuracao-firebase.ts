import type { FirebaseOptions } from 'firebase/app'

/** Variáveis de ambiente que a build precisa para falar com o projeto Firebase. */
const VARIAVEIS_OBRIGATORIAS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID'
] as const

export type AmbienteFirebase = Record<string, string | boolean | undefined>

/**
 * Lê a configuração do Firebase do ambiente da build (`import.meta.env`), em vez
 * de credenciais no código. Falha na inicialização, com os nomes das variáveis
 * faltantes, em vez de deixar o app quebrar na primeira query.
 *
 * @example lerConfiguracaoFirebase(import.meta.env)
 */
export function lerConfiguracaoFirebase(ambiente: AmbienteFirebase): FirebaseOptions {
  const faltantes = VARIAVEIS_OBRIGATORIAS.filter((nome) => !ambiente[nome])
  if (faltantes.length > 0) {
    throw new Error(
      `Configuração do Firebase incompleta: ${faltantes.join(', ')} ausente(s). ` +
        'Defina-as em .env.local (veja .env.example) ou nos secrets do workflow de deploy.'
    )
  }
  return {
    apiKey: String(ambiente.VITE_FIREBASE_API_KEY),
    authDomain: String(ambiente.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: String(ambiente.VITE_FIREBASE_PROJECT_ID),
    storageBucket: ambiente.VITE_FIREBASE_STORAGE_BUCKET ? String(ambiente.VITE_FIREBASE_STORAGE_BUCKET) : undefined,
    messagingSenderId: ambiente.VITE_FIREBASE_MESSAGING_SENDER_ID
      ? String(ambiente.VITE_FIREBASE_MESSAGING_SENDER_ID)
      : undefined,
    appId: String(ambiente.VITE_FIREBASE_APP_ID)
  }
}

/** Aponta o app para o Firebase Emulator Suite quando `VITE_FIREBASE_EMULADOR=true`. */
export function usaEmulador(ambiente: AmbienteFirebase): boolean {
  return ambiente.VITE_FIREBASE_EMULADOR === 'true' || ambiente.VITE_FIREBASE_EMULADOR === true
}
