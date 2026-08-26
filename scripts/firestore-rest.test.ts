import { afterEach, describe, expect, it } from 'vitest'
import { ClienteFirestoreRest, raizDaApi } from './firestore-rest.mjs'

const HOST_ORIGINAL = process.env.FIRESTORE_EMULATOR_HOST

afterEach(() => {
  if (HOST_ORIGINAL === undefined) {
    delete process.env.FIRESTORE_EMULATOR_HOST
    return
  }
  process.env.FIRESTORE_EMULATOR_HOST = HOST_ORIGINAL
})

describe('raizDaApi', () => {
  it('fala com o Firestore de verdade quando não há emulador', () => {
    delete process.env.FIRESTORE_EMULATOR_HOST
    expect(raizDaApi()).toBe('https://firestore.googleapis.com/v1')
  })

  it('desvia para o emulador local quando FIRESTORE_EMULATOR_HOST está setado', () => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
    expect(raizDaApi()).toBe('http://127.0.0.1:8080/v1')
  })
})

describe('ClienteFirestoreRest', () => {
  it('assume acesso de owner quando não recebe token — o caso do emulador', () => {
    expect(new ClienteFirestoreRest('demo-bingo', null).token).toBe('owner')
  })

  it('preserva o token de conta de serviço quando ele existe', () => {
    expect(new ClienteFirestoreRest('bingo-real', 'ya29.token').token).toBe('ya29.token')
  })
})
