import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, type Firestore } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Membro } from '../src/domain/membro'
import { FirestoreRepositorioMembros } from '../src/repositorios/firestore-repositorio-membros'

// O repositório real contra o Firestore do emulador, com as regras de produção
// ligadas: garante que o schema gravado e o lido casam, e que o caminho feliz de
// cada operação passa pelas regras do SPEC.md §7.
const ANA = { nome: 'Ana', email: 'ana@exemplo.com', papel: 'organizador', status: 'ativo', uid: 'uid-ana' }

let ambiente: RulesTestEnvironment

function repositorioComo(email: string, uid: string): FirestoreRepositorioMembros {
  const db = ambiente.authenticatedContext(uid, { email }).firestore() as unknown as Firestore
  return new FirestoreRepositorioMembros(db)
}

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'demo-bingo-testes',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') }
  })
})

afterAll(async () => await ambiente.cleanup())

beforeEach(async () => {
  await ambiente.clearFirestore()
  await ambiente.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(doc(contexto.firestore(), 'membros', ANA.email), ANA)
  })
})

describe('FirestoreRepositorioMembros no emulador', () => {
  it('cadastra e relê um Membro pelo id, sem duplicar o e-mail no documento', async () => {
    const repositorio = repositorioComo('ana@exemplo.com', 'uid-ana')
    const bia: Membro = {
      id: 'bia@exemplo.com',
      nome: 'Bia',
      email: 'bia@exemplo.com',
      papel: 'membro-comum',
      status: 'ativo',
      uid: null
    }
    await repositorio.criar(bia)
    expect(await repositorio.buscarPorId('bia@exemplo.com')).toEqual(bia)
  })

  it('lista todos os Membros para um Organizador ativo', async () => {
    const repositorio = repositorioComo('ana@exemplo.com', 'uid-ana')
    await repositorio.criar({
      id: 'bia@exemplo.com',
      nome: 'Bia',
      email: 'bia@exemplo.com',
      papel: 'membro-comum',
      status: 'ativo',
      uid: null
    })
    expect((await repositorio.listar()).map((membro) => membro.nome).sort()).toEqual(['Ana', 'Bia'])
  })

  it('devolve null para Membro inexistente', async () => {
    const repositorio = repositorioComo('ana@exemplo.com', 'uid-ana')
    expect(await repositorio.buscarPorId('ninguem@exemplo.com')).toBeNull()
  })

  it('persiste papel e status escritos por um Organizador', async () => {
    const repositorio = repositorioComo('ana@exemplo.com', 'uid-ana')
    await repositorio.criar({
      id: 'bia@exemplo.com',
      nome: 'Bia',
      email: 'bia@exemplo.com',
      papel: 'membro-comum',
      status: 'ativo',
      uid: null
    })
    await repositorio.definirPapel('bia@exemplo.com', 'organizador')
    await repositorio.definirStatus('bia@exemplo.com', 'inativo')
    expect(await repositorio.buscarPorId('bia@exemplo.com')).toMatchObject({
      papel: 'organizador',
      status: 'inativo'
    })
  })

  it('vincula o uid do próprio Membro comum, como no primeiro login', async () => {
    await ambiente.withSecurityRulesDisabled(async (contexto) => {
      await setDoc(doc(contexto.firestore(), 'membros', 'caio@exemplo.com'), {
        nome: 'Caio',
        email: 'caio@exemplo.com',
        papel: 'membro-comum',
        status: 'ativo',
        uid: null
      })
    })
    const repositorio = repositorioComo('caio@exemplo.com', 'uid-caio')
    await repositorio.vincularUid('caio@exemplo.com', 'uid-caio')
    expect(await repositorio.buscarPorId('caio@exemplo.com')).toMatchObject({ uid: 'uid-caio' })
  })
})
