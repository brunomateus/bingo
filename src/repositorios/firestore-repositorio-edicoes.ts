import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
  type DocumentData,
  type Firestore
} from 'firebase/firestore'
import type { Edicao, EdicaoId, ResultadoDeFechamento, StatusEdicao } from '../domain/edicao'
import { ErroDeRegra } from '../domain/erro-de-regra'
import type { DadosDaNovaEdicao, RepositorioEdicoes } from './repositorio-edicoes'

const COLECAO = 'edicoes'
const STATUS: readonly StatusEdicao[] = ['aberta', 'concluida', 'cancelada']

/**
 * `RepositorioEdicoes` sobre `edicoes` + o singleton `estado/atual` (SPEC.md §7).
 * Abrir e fechar são transações sobre os dois documentos: é o que impede, de fato,
 * dois Organizadores abrirem Edições simultâneas.
 *
 * @example new FirestoreRepositorioEdicoes(db).buscarAberta()
 */
export class FirestoreRepositorioEdicoes implements RepositorioEdicoes {
  private readonly db: Firestore

  constructor(db: Firestore) {
    this.db = db
  }

  async buscarAberta(): Promise<Edicao | null> {
    const estado = await getDoc(this.referenciaDoEstado())
    const idAberta = estado.exists() ? estado.data().edicaoAbertaId : null
    return typeof idAberta === 'string' ? await this.buscarPorId(idAberta) : null
  }

  /**
   * Ordena no cliente de propósito: `where` + `orderBy` em campos diferentes
   * exigiria um índice composto, e o volume esperado é pequeno (SPEC.md §5).
   */
  async listarConcluidas(): Promise<Edicao[]> {
    const consulta = query(collection(this.db, COLECAO), where('status', '==', 'concluida'))
    const resultado = await getDocs(consulta)
    return resultado.docs.map((documento) => paraEdicao(documento.id, documento.data()))
  }

  async buscarPorId(id: EdicaoId): Promise<Edicao | null> {
    const documento = await getDoc(doc(this.db, COLECAO, id))
    return documento.exists() ? paraEdicao(documento.id, documento.data()) : null
  }

  async abrir(dados: DadosDaNovaEdicao): Promise<Edicao> {
    const referencia = doc(collection(this.db, COLECAO))
    const edicao: Edicao = { id: referencia.id, status: 'aberta', fechadaEm: null, ...dados }
    await runTransaction(this.db, async (transacao) => {
      const estado = await transacao.get(this.referenciaDoEstado())
      const idAberta = estado.exists() ? estado.data().edicaoAbertaId : null
      if (idAberta) {
        throw new ErroDeRegra(`Já existe uma Edição aberta (${idAberta}). Feche-a antes de abrir a próxima.`)
      }
      const { id: _id, ...campos } = edicao
      transacao.set(referencia, campos)
      transacao.set(this.referenciaDoEstado(), { edicaoAbertaId: referencia.id })
    })
    return edicao
  }

  async estenderPrazo(id: EdicaoId, prazo: string): Promise<void> {
    await updateDoc(doc(this.db, COLECAO, id), { prazo })
  }

  async fechar(id: EdicaoId, status: ResultadoDeFechamento, fechadaEm: string): Promise<void> {
    await runTransaction(this.db, async (transacao) => {
      const estado = await transacao.get(this.referenciaDoEstado())
      transacao.update(doc(this.db, COLECAO, id), { status, fechadaEm })
      if (estado.exists() && estado.data().edicaoAbertaId === id) {
        transacao.set(this.referenciaDoEstado(), { edicaoAbertaId: null })
      }
    })
  }

  private referenciaDoEstado() {
    return doc(this.db, 'estado', 'atual')
  }
}

/** Converte o documento cru numa `Edicao`, falhando alto se o schema não bater. */
export function paraEdicao(id: EdicaoId, dados: DocumentData): Edicao {
  if (typeof dados.status !== 'string' || !STATUS.includes(dados.status as StatusEdicao)) {
    throw new Error(
      `edicoes/${id} tem status inválido: ${JSON.stringify(dados.status)}. Esperado um de ${STATUS.join(' | ')}.`
    )
  }
  if (!Number.isInteger(dados.metaEntregas) || dados.metaEntregas < 1) {
    throw new Error(
      `edicoes/${id} tem metaEntregas inválida: ${JSON.stringify(dados.metaEntregas)}. Esperado inteiro >= 1.`
    )
  }
  if (!Array.isArray(dados.participantes)) {
    throw new Error(
      `edicoes/${id} tem participantes inválidos: ${JSON.stringify(dados.participantes)}. Esperado uma lista de ids.`
    )
  }
  return {
    id,
    prazo: String(dados.prazo),
    metaEntregas: dados.metaEntregas,
    status: dados.status as StatusEdicao,
    participantes: dados.participantes.map(String),
    fechadaEm: typeof dados.fechadaEm === 'string' ? dados.fechadaEm : null
  }
}
