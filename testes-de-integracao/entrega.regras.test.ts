import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const ANA = { nome: 'Ana', email: 'ana@exemplo.com', papel: 'organizador', status: 'ativo', uid: 'uid-ana' }
const CAIO = { nome: 'Caio', email: 'caio@exemplo.com', papel: 'membro-comum', status: 'ativo', uid: 'uid-caio' }
const ERICO = { nome: 'Erico', email: 'erico@exemplo.com', papel: 'membro-comum', status: 'ativo', uid: 'uid-erico' }

const EDICAO = {
  prazo: '2026-12-31',
  metaEntregas: 2,
  status: 'aberta',
  participantes: ['ana@exemplo.com', 'caio@exemplo.com'],
  fechadaEm: null
}

function entrega(styleId: string, quando = '2026-09-01T20:00:00.000Z') {
  return { styleId, observation: 'no bar do Zé', deliveredAt: quando }
}

let ambiente: RulesTestEnvironment

function como(email: string) {
  return ambiente.authenticatedContext(`uid-${email.split('@')[0]}`, { email }).firestore()
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
    for (const membro of [ANA, CAIO, ERICO]) {
      await setDoc(doc(db, 'membros', membro.email), membro)
    }
    await setDoc(doc(db, 'edicoes', 'edicao-1'), EDICAO)
    // Pool com dois Estilos, via o índice que as regras consultam.
    await setDoc(doc(db, 'edicoes', 'edicao-1', 'estilos-do-pool', '21A'), { membroId: 'ana@exemplo.com' })
    await setDoc(doc(db, 'edicoes', 'edicao-1', 'estilos-do-pool', '13C'), { membroId: 'caio@exemplo.com' })
  })
})

describe('registro de Entrega', () => {
  it('deixa o participante registrar a própria Entrega', async () => {
    const db = como('caio@exemplo.com')
    await assertSucceeds(setDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com'), { entregas: [entrega('21A')] }))
  })

  it('qualquer Membro ativo lê as Entregas', async () => {
    await assertSucceeds(getDoc(doc(como('erico@exemplo.com'), 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com')))
  })

  it('recusa Estilo que não está no Pool', async () => {
    const db = como('caio@exemplo.com')
    await assertFails(setDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com'), { entregas: [entrega('1A')] }))
  })

  it('nem o Organizador registra Entrega por outro', async () => {
    const db = como('ana@exemplo.com')
    await assertFails(setDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com'), { entregas: [entrega('21A')] }))
  })

  it('recusa quem não é participante', async () => {
    const db = como('erico@exemplo.com')
    await assertFails(setDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'erico@exemplo.com'), { entregas: [entrega('21A')] }))
  })

  it('recusa campo extra na Entrega, como a flag `delivered` do modelo antigo', async () => {
    const db = como('caio@exemplo.com')
    await assertFails(
      setDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com'), {
        entregas: [{ ...entrega('21A'), delivered: true }]
      })
    )
  })
})

describe('Entregas só crescem', () => {
  async function comUmaEntrega() {
    const db = como('caio@exemplo.com')
    await setDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com'), { entregas: [entrega('21A')] })
    return db
  }

  it('aceita acrescentar a segunda Entrega', async () => {
    const db = await comUmaEntrega()
    await assertSucceeds(
      updateDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com'), {
        entregas: [entrega('21A'), entrega('13C')]
      })
    )
  })

  it('recusa reescrever uma Entrega anterior', async () => {
    const db = await comUmaEntrega()
    await assertFails(
      updateDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com'), {
        entregas: [entrega('13C'), entrega('21A')]
      })
    )
  })

  it('recusa apagar Entregas encurtando a lista', async () => {
    const db = await comUmaEntrega()
    await assertFails(updateDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com'), { entregas: [] }))
  })

  it('recusa acrescentar duas de uma vez', async () => {
    const db = await comUmaEntrega()
    await assertFails(
      updateDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com'), {
        entregas: [entrega('21A'), entrega('13C'), entrega('21A')]
      })
    )
  })

  it('recusa passar da meta da Edição', async () => {
    const db = await comUmaEntrega()
    await updateDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com'), {
      entregas: [entrega('21A'), entrega('13C')]
    })
    await assertFails(
      updateDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com'), {
        entregas: [entrega('21A'), entrega('13C'), entrega('21A')]
      })
    )
  })

  it('nunca deixa apagar o documento de Entregas', async () => {
    const db = await comUmaEntrega()
    await assertFails(deleteDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com')))
  })
})

describe('Entrega atrasada', () => {
  it('continua permitida com a Edição já fechada', async () => {
    await ambiente.withSecurityRulesDisabled(async (contexto) => {
      await setDoc(doc(contexto.firestore(), 'edicoes', 'edicao-1'), {
        ...EDICAO,
        status: 'concluida',
        fechadaEm: '2026-10-01T00:00:00.000Z'
      })
    })
    const db = como('caio@exemplo.com')
    await assertSucceeds(
      setDoc(doc(db, 'edicoes', 'edicao-1', 'selecoes', 'caio@exemplo.com'), { entregas: [entrega('21A')] })
    )
  })
})
