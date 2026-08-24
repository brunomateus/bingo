import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, type Firestore } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Entrega } from '../src/domain/entrega'
import { FirestoreRepositorioEntregas } from '../src/repositorios/firestore-repositorio-entregas'

// A garantia que só o Firestore dá aqui: a transação que impede o mesmo Membro
// de gravar duas vezes o mesmo Estilo (duas abas abertas, por exemplo).
const CAIO = { nome: 'Caio', email: 'caio@exemplo.com', papel: 'membro-comum', status: 'ativo', uid: 'uid-caio' }

const EDICAO = {
  prazo: '2026-12-31',
  metaEntregas: 2,
  status: 'aberta',
  participantes: ['caio@exemplo.com'],
  fechadaEm: null
}

function entrega(styleId: string): Entrega {
  return { styleId, observation: 'no bar do Zé', deliveredAt: '2026-09-01T20:00:00.000Z' }
}

let ambiente: RulesTestEnvironment

function repositorio(): FirestoreRepositorioEntregas {
  const db = ambiente
    .authenticatedContext('uid-caio', { email: 'caio@exemplo.com' })
    .firestore() as unknown as Firestore
  return new FirestoreRepositorioEntregas(db)
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
    const db = contexto.firestore()
    await setDoc(doc(db, 'membros', CAIO.email), CAIO)
    await setDoc(doc(db, 'edicoes', 'edicao-1'), EDICAO)
    await setDoc(doc(db, 'edicoes', 'edicao-1', 'estilos-do-pool', '21A'), { membroId: 'caio@exemplo.com' })
    await setDoc(doc(db, 'edicoes', 'edicao-1', 'estilos-do-pool', '13C'), { membroId: 'caio@exemplo.com' })
  })
})

describe('FirestoreRepositorioEntregas no emulador', () => {
  it('grava a primeira Entrega e relê o que gravou', async () => {
    const entregas = repositorio()
    await entregas.registrar('edicao-1', 'caio@exemplo.com', entrega('21A'))
    expect(await entregas.buscarDoMembro('edicao-1', 'caio@exemplo.com')).toEqual([entrega('21A')])
  })

  it('acrescenta a segunda sem perder a primeira', async () => {
    const entregas = repositorio()
    await entregas.registrar('edicao-1', 'caio@exemplo.com', entrega('21A'))
    await entregas.registrar('edicao-1', 'caio@exemplo.com', entrega('13C'))
    expect((await entregas.buscarDoMembro('edicao-1', 'caio@exemplo.com')).map((e) => e.styleId)).toEqual(['21A', '13C'])
  })

  it('recusa o mesmo Estilo duas vezes, mesmo sem checagem prévia no cliente', async () => {
    const entregas = repositorio()
    await entregas.registrar('edicao-1', 'caio@exemplo.com', entrega('21A'))
    await expect(entregas.registrar('edicao-1', 'caio@exemplo.com', entrega('21A'))).rejects.toThrow(
      'Entrega duplicada'
    )
    expect(await entregas.buscarDoMembro('edicao-1', 'caio@exemplo.com')).toHaveLength(1)
  })

  it('lista as Entregas da Edição por Membro', async () => {
    const entregas = repositorio()
    await entregas.registrar('edicao-1', 'caio@exemplo.com', entrega('21A'))
    expect(await entregas.listarPorEdicao('edicao-1')).toEqual([
      { membroId: 'caio@exemplo.com', entregas: [entrega('21A')] }
    ])
  })

  it('devolve lista vazia para quem ainda não entregou', async () => {
    expect(await repositorio().buscarDoMembro('edicao-1', 'caio@exemplo.com')).toEqual([])
  })
})
