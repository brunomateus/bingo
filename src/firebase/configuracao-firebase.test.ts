import { describe, expect, it } from 'vitest'
import { lerConfiguracaoFirebase, usaEmulador } from './configuracao-firebase'

const AMBIENTE_COMPLETO = {
  VITE_FIREBASE_API_KEY: 'chave',
  VITE_FIREBASE_AUTH_DOMAIN: 'bingo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'bingo',
  VITE_FIREBASE_APP_ID: 'app-1'
}

describe('lerConfiguracaoFirebase', () => {
  it('monta as opções a partir das variáveis obrigatórias', () => {
    expect(lerConfiguracaoFirebase(AMBIENTE_COMPLETO)).toMatchObject({ projectId: 'bingo', appId: 'app-1' })
  })

  it('mantém opcionais como undefined quando não declaradas', () => {
    expect(lerConfiguracaoFirebase(AMBIENTE_COMPLETO).storageBucket).toBeUndefined()
  })

  it('nomeia todas as variáveis faltantes no erro', () => {
    const erro = () => lerConfiguracaoFirebase({ VITE_FIREBASE_API_KEY: 'chave' })
    expect(erro).toThrow('VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID')
  })

  it('trata variável vazia como ausente', () => {
    expect(() => lerConfiguracaoFirebase({ ...AMBIENTE_COMPLETO, VITE_FIREBASE_APP_ID: '' })).toThrow(
      'VITE_FIREBASE_APP_ID'
    )
  })
})

describe('usaEmulador', () => {
  it('liga só com o opt-in explícito', () => {
    expect(usaEmulador({ VITE_FIREBASE_EMULADOR: 'true' })).toBe(true)
    expect(usaEmulador({ VITE_FIREBASE_EMULADOR: 'false' })).toBe(false)
    expect(usaEmulador({})).toBe(false)
  })
})
