import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, type Firestore } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { FirestoreRepositorioEdicoes } from '../src/repositorios/firestore-repositorio-edicoes'
import { FirestoreRepositorioPool } from '../src/repositorios/firestore-repositorio-pool'

// Os dois pontos em que o Firestore — e não o domínio — é quem dá a garantia:
// a transação do singleton `estado/atual` e a unicidade por id de documento.
const ANA = { nome: 'Ana', email: 'ana@exemplo.com', papel: 'organizador', status: 'ativo', uid: 'uid-ana' }
const CAIO = { nome: 'Caio', email: 'caio@exemplo.com', papel: 'membro-comum', status: 'ativo', uid: 'uid-caio' }

const PARTICIPANTES = ['ana@exemplo.com', 'caio@exemplo.com']

let ambiente: RulesTestEnvironment

function bancoComo(email: string): Firestore {
  return ambiente.authenticatedContext(`uid-${email.split('@')[0]}`, { email }).firestore() as unknown as Firestore
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
    await setDoc(doc(db, 'membros', ANA.email), ANA)
    await setDoc(doc(db, 'membros', CAIO.email), CAIO)
  })
})

describe('FirestoreRepositorioEdicoes no emulador', () => {
  it('abre a Edição e passa a apontá-la como aberta', async () => {
    const repositorio = new FirestoreRepositorioEdicoes(bancoComo('ana@exemplo.com'))
    const edicao = await repositorio.abrir({ prazo: '2026-12-31', metaEntregas: 3, participantes: PARTICIPANTES })
    expect(await repositorio.buscarAberta()).toEqual(edicao)
  })

  it('recusa a segunda abertura enquanto a primeira está aberta', async () => {
    const repositorio = new FirestoreRepositorioEdicoes(bancoComo('ana@exemplo.com'))
    await repositorio.abrir({ prazo: '2026-12-31', metaEntregas: 3, participantes: PARTICIPANTES })
    await expect(
      repositorio.abrir({ prazo: '2027-01-31', metaEntregas: 3, participantes: PARTICIPANTES })
    ).rejects.toThrow('Já existe uma Edição aberta')
  })

  it('não deixa Edição aberta pendurada quando a abertura é recusada', async () => {
    const repositorio = new FirestoreRepositorioEdicoes(bancoComo('ana@exemplo.com'))
    const primeira = await repositorio.abrir({ prazo: '2026-12-31', metaEntregas: 3, participantes: PARTICIPANTES })
    await expect(
      repositorio.abrir({ prazo: '2027-01-31', metaEntregas: 3, participantes: PARTICIPANTES })
    ).rejects.toThrow()
    expect(await repositorio.buscarAberta()).toMatchObject({ id: primeira.id })
  })

  it('fecha, libera o singleton e permite a próxima Edição', async () => {
    const repositorio = new FirestoreRepositorioEdicoes(bancoComo('ana@exemplo.com'))
    const edicao = await repositorio.abrir({ prazo: '2026-12-31', metaEntregas: 3, participantes: PARTICIPANTES })
    await repositorio.fechar(edicao.id, 'concluida', '2026-12-31T12:00:00.000Z')
    expect(await repositorio.buscarAberta()).toBeNull()
    expect(await repositorio.buscarPorId(edicao.id)).toMatchObject({ status: 'concluida', metaEntregas: 3 })
    await expect(
      repositorio.abrir({ prazo: '2027-01-31', metaEntregas: 5, participantes: PARTICIPANTES })
    ).resolves.toMatchObject({ metaEntregas: 5 })
  })

  it('estende o prazo da Edição aberta', async () => {
    const repositorio = new FirestoreRepositorioEdicoes(bancoComo('ana@exemplo.com'))
    const edicao = await repositorio.abrir({ prazo: '2026-12-31', metaEntregas: 3, participantes: PARTICIPANTES })
    await repositorio.estenderPrazo(edicao.id, '2027-02-28')
    expect(await repositorio.buscarPorId(edicao.id)).toMatchObject({ prazo: '2027-02-28' })
  })

  it('devolve null quando nenhuma Edição foi aberta ainda', async () => {
    expect(await new FirestoreRepositorioEdicoes(bancoComo('caio@exemplo.com')).buscarAberta()).toBeNull()
  })

  it('lista para o Histórico só as concluídas, deixando aberta e cancelada de fora', async () => {
    const repositorio = new FirestoreRepositorioEdicoes(bancoComo('ana@exemplo.com'))
    const concluida = await repositorio.abrir({ prazo: '2026-12-31', metaEntregas: 3, participantes: PARTICIPANTES })
    await repositorio.fechar(concluida.id, 'concluida', '2026-12-31T12:00:00.000Z')
    const cancelada = await repositorio.abrir({ prazo: '2027-01-31', metaEntregas: 3, participantes: PARTICIPANTES })
    await repositorio.fechar(cancelada.id, 'cancelada', '2027-01-31T12:00:00.000Z')
    await repositorio.abrir({ prazo: '2027-02-28', metaEntregas: 3, participantes: PARTICIPANTES })

    const doHistorico = await repositorio.listarConcluidas()
    expect(doHistorico.map((edicao) => edicao.id)).toEqual([concluida.id])
  })

  it('deixa Membro comum ler o Histórico', async () => {
    const daAna = new FirestoreRepositorioEdicoes(bancoComo('ana@exemplo.com'))
    const edicao = await daAna.abrir({ prazo: '2026-12-31', metaEntregas: 3, participantes: PARTICIPANTES })
    await daAna.fechar(edicao.id, 'concluida', '2026-12-31T12:00:00.000Z')
    expect(await new FirestoreRepositorioEdicoes(bancoComo('caio@exemplo.com')).listarConcluidas()).toHaveLength(1)
  })
})

describe('FirestoreRepositorioPool no emulador', () => {
  async function edicaoAberta(): Promise<string> {
    const repositorio = new FirestoreRepositorioEdicoes(bancoComo('ana@exemplo.com'))
    const edicao = await repositorio.abrir({ prazo: '2026-12-31', metaEntregas: 3, participantes: PARTICIPANTES })
    return edicao.id
  }

  it('grava e relê a reivindicação do participante', async () => {
    const edicaoId = await edicaoAberta()
    const pool = new FirestoreRepositorioPool(bancoComo('caio@exemplo.com'))
    await pool.reivindicar(edicaoId, { membroId: 'caio@exemplo.com', styleId: '21A' })
    expect(await pool.listar(edicaoId)).toEqual([{ membroId: 'caio@exemplo.com', styleId: '21A' }])
  })

  it('recusa dois participantes no mesmo Estilo, sem depender de checagem no cliente', async () => {
    const edicaoId = await edicaoAberta()
    await new FirestoreRepositorioPool(bancoComo('caio@exemplo.com')).reivindicar(edicaoId, {
      membroId: 'caio@exemplo.com',
      styleId: '21A'
    })
    const daAna = new FirestoreRepositorioPool(bancoComo('ana@exemplo.com'))
    await expect(daAna.reivindicar(edicaoId, { membroId: 'ana@exemplo.com', styleId: '21A' })).rejects.toThrow()
    expect(await daAna.listar(edicaoId)).toHaveLength(1)
  })

  it('recusa o mesmo participante reivindicando duas vezes', async () => {
    const edicaoId = await edicaoAberta()
    const pool = new FirestoreRepositorioPool(bancoComo('caio@exemplo.com'))
    await pool.reivindicar(edicaoId, { membroId: 'caio@exemplo.com', styleId: '21A' })
    await expect(pool.reivindicar(edicaoId, { membroId: 'caio@exemplo.com', styleId: '1A' })).rejects.toThrow()
  })

  it('grava em lote as reivindicações do forçar avanço', async () => {
    const edicaoId = await edicaoAberta()
    const pool = new FirestoreRepositorioPool(bancoComo('ana@exemplo.com'))
    await pool.reivindicarEmNomeDeOutros(edicaoId, [
      { membroId: 'ana@exemplo.com', styleId: '21A' },
      { membroId: 'caio@exemplo.com', styleId: '13C' }
    ])
    expect(await pool.listar(edicaoId)).toHaveLength(2)
  })
})
