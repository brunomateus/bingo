import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const ANA = { nome: 'Ana', email: 'ana@exemplo.com', papel: 'organizador', status: 'ativo', uid: 'uid-ana' }
const CAIO = { nome: 'Caio', email: 'caio@exemplo.com', papel: 'membro-comum', status: 'ativo', uid: 'uid-caio' }
const ERICO = { nome: 'Erico', email: 'erico@exemplo.com', papel: 'membro-comum', status: 'ativo', uid: 'uid-erico' }

const EDICAO_ABERTA = {
  prazo: '2026-12-31',
  metaEntregas: 3,
  status: 'aberta',
  participantes: ['ana@exemplo.com', 'caio@exemplo.com'],
  fechadaEm: null
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
    await setDoc(doc(db, 'edicoes', 'edicao-1'), EDICAO_ABERTA)
    await setDoc(doc(db, 'estado', 'atual'), { edicaoAbertaId: 'edicao-1' })
  })
})

describe('estado/atual', () => {
  it('qualquer Membro ativo lê qual Edição está aberta', async () => {
    await assertSucceeds(getDoc(doc(como('caio@exemplo.com'), 'estado', 'atual')))
  })

  it('só Organizador escreve o ponteiro da Edição aberta', async () => {
    await assertFails(setDoc(doc(como('caio@exemplo.com'), 'estado', 'atual'), { edicaoAbertaId: null }))
    await assertSucceeds(setDoc(doc(como('ana@exemplo.com'), 'estado', 'atual'), { edicaoAbertaId: null }))
  })

  it('recusa campo extra no singleton', async () => {
    const db = como('ana@exemplo.com')
    await assertFails(setDoc(doc(db, 'estado', 'atual'), { edicaoAbertaId: null, extra: 1 }))
  })
})

describe('coleção edicoes', () => {
  const NOVA = { ...EDICAO_ABERTA, participantes: ['ana@exemplo.com'] }

  it('Membro ativo lê a Edição e a lista', async () => {
    await assertSucceeds(getDoc(doc(como('caio@exemplo.com'), 'edicoes', 'edicao-1')))
    await assertSucceeds(getDocs(collection(como('caio@exemplo.com'), 'edicoes')))
  })

  it('só Organizador cria Edição', async () => {
    await assertFails(setDoc(doc(como('caio@exemplo.com'), 'edicoes', 'edicao-2'), NOVA))
    await assertSucceeds(setDoc(doc(como('ana@exemplo.com'), 'edicoes', 'edicao-2'), NOVA))
  })

  it('recusa Edição nascendo fechada ou com meta inválida', async () => {
    const db = como('ana@exemplo.com')
    await assertFails(setDoc(doc(db, 'edicoes', 'edicao-3'), { ...NOVA, status: 'concluida' }))
    await assertFails(setDoc(doc(db, 'edicoes', 'edicao-4'), { ...NOVA, metaEntregas: 0 }))
  })

  it('deixa o Organizador estender o prazo e fechar', async () => {
    const db = como('ana@exemplo.com')
    await assertSucceeds(updateDoc(doc(db, 'edicoes', 'edicao-1'), { prazo: '2027-01-31' }))
    await assertSucceeds(updateDoc(doc(db, 'edicoes', 'edicao-1'), { status: 'concluida', fechadaEm: '2026-12-31' }))
  })

  it('congela meta de Entregas e participantes depois da abertura', async () => {
    const db = como('ana@exemplo.com')
    await assertFails(updateDoc(doc(db, 'edicoes', 'edicao-1'), { metaEntregas: 5 }))
    await assertFails(updateDoc(doc(db, 'edicoes', 'edicao-1'), { participantes: ['ana@exemplo.com'] }))
  })

  it('nunca deixa apagar uma Edição', async () => {
    await assertFails(deleteDoc(doc(como('ana@exemplo.com'), 'edicoes', 'edicao-1')))
  })
})

describe('Fase 1: pool', () => {
  it('deixa o participante reivindicar o próprio Estilo', async () => {
    const db = como('caio@exemplo.com')
    await assertSucceeds(setDoc(doc(db, 'edicoes', 'edicao-1', 'pool', 'caio@exemplo.com'), { styleId: '21A' }))
  })

  it('impede reivindicar em nome de outro participante', async () => {
    const db = como('caio@exemplo.com')
    await assertFails(setDoc(doc(db, 'edicoes', 'edicao-1', 'pool', 'ana@exemplo.com'), { styleId: '21A' }))
  })

  it('deixa o Organizador reivindicar por quem não agiu (forçar avanço)', async () => {
    const db = como('ana@exemplo.com')
    await assertSucceeds(setDoc(doc(db, 'edicoes', 'edicao-1', 'pool', 'caio@exemplo.com'), { styleId: '13C' }))
  })

  it('impede quem não é participante de entrar no Pool', async () => {
    const db = como('erico@exemplo.com')
    await assertFails(setDoc(doc(db, 'edicoes', 'edicao-1', 'pool', 'erico@exemplo.com'), { styleId: '21A' }))
  })

  it('impede trocar ou apagar o Estilo já reivindicado', async () => {
    const db = como('caio@exemplo.com')
    await setDoc(doc(db, 'edicoes', 'edicao-1', 'pool', 'caio@exemplo.com'), { styleId: '21A' })
    await assertFails(updateDoc(doc(db, 'edicoes', 'edicao-1', 'pool', 'caio@exemplo.com'), { styleId: '1A' }))
    await assertFails(deleteDoc(doc(db, 'edicoes', 'edicao-1', 'pool', 'caio@exemplo.com')))
  })

  it('impede reivindicar em Edição fechada', async () => {
    await ambiente.withSecurityRulesDisabled(async (contexto) => {
      await setDoc(doc(contexto.firestore(), 'edicoes', 'edicao-1'), { ...EDICAO_ABERTA, status: 'concluida' })
    })
    const db = como('caio@exemplo.com')
    await assertFails(setDoc(doc(db, 'edicoes', 'edicao-1', 'pool', 'caio@exemplo.com'), { styleId: '21A' }))
  })

  it('recusa campo fora do schema da reivindicação', async () => {
    const db = como('caio@exemplo.com')
    await assertFails(
      setDoc(doc(db, 'edicoes', 'edicao-1', 'pool', 'caio@exemplo.com'), { styleId: '21A', delivered: true })
    )
  })
})

describe('unicidade do Estilo no Pool', () => {
  it('recusa o segundo participante que tenta o mesmo Estilo', async () => {
    const caio = como('caio@exemplo.com')
    await assertSucceeds(
      setDoc(doc(caio, 'edicoes', 'edicao-1', 'estilos-do-pool', '21A'), { membroId: 'caio@exemplo.com' })
    )
    const ana = como('ana@exemplo.com')
    await assertFails(
      setDoc(doc(ana, 'edicoes', 'edicao-1', 'estilos-do-pool', '21A'), { membroId: 'ana@exemplo.com' })
    )
  })

  it('impede registrar o índice em nome de outro', async () => {
    const db = como('caio@exemplo.com')
    await assertFails(setDoc(doc(db, 'edicoes', 'edicao-1', 'estilos-do-pool', '1A'), { membroId: 'ana@exemplo.com' }))
  })
})

describe('nada é apagado', () => {
  it('nem o singleton de estado', async () => {
    await assertFails(deleteDoc(doc(como('ana@exemplo.com'), 'estado', 'atual')))
  })
})
