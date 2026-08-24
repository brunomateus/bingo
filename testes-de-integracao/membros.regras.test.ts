import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const PROJETO = 'demo-bingo-regras'

const ANA = { nome: 'Ana', email: 'ana@exemplo.com', papel: 'organizador', status: 'ativo', uid: 'uid-ana' }
const CAIO = { nome: 'Caio', email: 'caio@exemplo.com', papel: 'membro-comum', status: 'ativo', uid: null }
const DINA = { nome: 'Dina', email: 'dina@exemplo.com', papel: 'organizador', status: 'inativo', uid: null }
const ERICO = { nome: 'Erico', email: 'erico@exemplo.com', papel: 'membro-comum', status: 'ativo', uid: 'uid-erico' }

let ambiente: RulesTestEnvironment

/** Contexto autenticado como a conta Google daquele e-mail. */
function como(email: string, uid = `uid-${email.split('@')[0]}`) {
  return ambiente.authenticatedContext(uid, { email }).firestore()
}

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: PROJETO,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') }
  })
})

afterAll(async () => await ambiente.cleanup())

beforeEach(async () => {
  await ambiente.clearFirestore()
  await ambiente.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore()
    await setDoc(doc(db, 'membros', ANA.email), ANA)
    await setDoc(doc(db, 'membros', CAIO.email), CAIO)
    await setDoc(doc(db, 'membros', DINA.email), DINA)
    await setDoc(doc(db, 'membros', ERICO.email), ERICO)
  })
})

describe('leitura de membros', () => {
  it('deixa qualquer autenticado ler o próprio registro (é o que valida o login)', async () => {
    await assertSucceeds(getDoc(doc(como('caio@exemplo.com'), 'membros', 'caio@exemplo.com')))
  })

  it('casa o e-mail do token com o id do documento sem depender da caixa', async () => {
    await assertSucceeds(getDoc(doc(como('Caio@Exemplo.COM'), 'membros', 'caio@exemplo.com')))
  })

  // Decisão consciente: Membro ativo lê a lista inteira porque o Sorteio e o
  // Histórico precisam do nome dos participantes. Como o id do documento é o
  // e-mail, isso expõe os e-mails — o §7 pedia restringi-los, e não dá com este id.
  it('deixa Membro comum ativo ler os demais registros', async () => {
    await assertSucceeds(getDoc(doc(como('caio@exemplo.com'), 'membros', 'ana@exemplo.com')))
    await assertSucceeds(getDocs(collection(como('caio@exemplo.com'), 'membros')))
  })

  it('impede Membro inativo de ler os registros dos outros', async () => {
    await assertFails(getDocs(collection(como('dina@exemplo.com'), 'membros')))
  })

  it('deixa Organizador ativo listar todos', async () => {
    await assertSucceeds(getDocs(collection(como('ana@exemplo.com'), 'membros')))
  })

  it('não dá poder de Organizador a quem está inativo', async () => {
    await assertFails(
      setDoc(doc(como('dina@exemplo.com'), 'membros', 'nova@exemplo.com'), {
        nome: 'Nova',
        email: 'nova@exemplo.com',
        papel: 'membro-comum',
        status: 'ativo',
        uid: null
      })
    )
  })

  it('bloqueia quem não está autenticado', async () => {
    await assertFails(getDoc(doc(ambiente.unauthenticatedContext().firestore(), 'membros', 'ana@exemplo.com')))
  })
})

describe('cadastro de membros', () => {
  const NOVO = { nome: 'Bia', email: 'bia@exemplo.com', papel: 'membro-comum', status: 'ativo', uid: null }

  it('deixa Organizador ativo cadastrar', async () => {
    await assertSucceeds(setDoc(doc(como('ana@exemplo.com'), 'membros', NOVO.email), NOVO))
  })

  it('impede Membro comum de cadastrar', async () => {
    await assertFails(setDoc(doc(como('caio@exemplo.com'), 'membros', NOVO.email), NOVO))
  })

  it('recusa papel fora do domínio', async () => {
    const db = como('ana@exemplo.com')
    await assertFails(setDoc(doc(db, 'membros', NOVO.email), { ...NOVO, papel: 'admin' }))
  })

  it('recusa documento cujo campo email não bate com o id', async () => {
    const db = como('ana@exemplo.com')
    await assertFails(setDoc(doc(db, 'membros', 'bia@exemplo.com'), { ...NOVO, email: 'outra@exemplo.com' }))
  })

  it('recusa campo extra fora do schema do SPEC.md §2', async () => {
    const db = como('ana@exemplo.com')
    await assertFails(setDoc(doc(db, 'membros', NOVO.email), { ...NOVO, telefone: '999' }))
  })

  it('recusa cadastro já vindo com uid vinculado', async () => {
    const db = como('ana@exemplo.com')
    await assertFails(setDoc(doc(db, 'membros', NOVO.email), { ...NOVO, uid: 'uid-forjado' }))
  })
})

describe('edição de papel e status', () => {
  it('deixa Organizador ativo promover, rebaixar e desativar', async () => {
    const db = como('ana@exemplo.com')
    await assertSucceeds(updateDoc(doc(db, 'membros', 'caio@exemplo.com'), { papel: 'organizador' }))
    await assertSucceeds(updateDoc(doc(db, 'membros', 'caio@exemplo.com'), { status: 'inativo' }))
  })

  it('impede Membro comum de se promover', async () => {
    const db = como('caio@exemplo.com')
    await assertFails(updateDoc(doc(db, 'membros', 'caio@exemplo.com'), { papel: 'organizador' }))
  })

  it('impede Membro comum de editar outro', async () => {
    const db = como('caio@exemplo.com')
    await assertFails(updateDoc(doc(db, 'membros', 'ana@exemplo.com'), { status: 'inativo' }))
  })

  it('nunca deixa apagar um registro: remoção é soft delete', async () => {
    await assertFails(deleteDoc(doc(como('ana@exemplo.com'), 'membros', 'caio@exemplo.com')))
  })
})

describe('vínculo do uid no primeiro login', () => {
  it('deixa o próprio Membro gravar seu uid quando ainda não há vínculo', async () => {
    const db = como('caio@exemplo.com', 'uid-caio')
    await assertSucceeds(updateDoc(doc(db, 'membros', 'caio@exemplo.com'), { uid: 'uid-caio' }))
  })

  it('recusa gravar um uid diferente do da própria sessão', async () => {
    const db = como('caio@exemplo.com', 'uid-caio')
    await assertFails(updateDoc(doc(db, 'membros', 'caio@exemplo.com'), { uid: 'uid-de-outro' }))
  })

  it('recusa o próprio Membro revincular um registro que já tem uid', async () => {
    const db = como('erico@exemplo.com', 'uid-novo-do-erico')
    await assertFails(updateDoc(doc(db, 'membros', 'erico@exemplo.com'), { uid: 'uid-novo-do-erico' }))
  })

  // Escape hatch da mensagem de recusa do login: quem troca de conta Google
  // precisa de um Organizador para refazer o vínculo.
  it('deixa um Organizador revincular o uid de outro Membro', async () => {
    const db = como('ana@exemplo.com', 'uid-ana')
    await assertSucceeds(updateDoc(doc(db, 'membros', 'erico@exemplo.com'), { uid: 'uid-novo-do-erico' }))
  })

  it('recusa carona de outro campo junto com o uid', async () => {
    const db = como('caio@exemplo.com', 'uid-caio')
    await assertFails(updateDoc(doc(db, 'membros', 'caio@exemplo.com'), { uid: 'uid-caio', papel: 'organizador' }))
  })

  it('recusa vincular uid no registro de outro Membro', async () => {
    const db = como('caio@exemplo.com', 'uid-caio')
    await assertFails(updateDoc(doc(db, 'membros', 'dina@exemplo.com'), { uid: 'uid-caio' }))
  })
})
