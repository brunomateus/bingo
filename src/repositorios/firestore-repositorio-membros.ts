import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type DocumentData,
  type Firestore
} from 'firebase/firestore'
import type { Membro, MembroId, Papel, StatusMembro } from '../domain/membro'
import type { RepositorioMembros } from './repositorio-membros'

const COLECAO = 'membros'
const PAPEIS: readonly Papel[] = ['organizador', 'membro-comum']
const STATUS: readonly StatusMembro[] = ['ativo', 'inativo']

/**
 * `RepositorioMembros` sobre a coleção `membros` do Firestore (SPEC.md §7).
 * Recebe o `Firestore` por construtor — quem o cria é o composition root.
 *
 * @example new FirestoreRepositorioMembros(db).buscarPorId('ana@exemplo.com')
 */
export class FirestoreRepositorioMembros implements RepositorioMembros {
  private readonly db: Firestore

  constructor(db: Firestore) {
    this.db = db
  }

  async listar(): Promise<Membro[]> {
    const resultado = await getDocs(collection(this.db, COLECAO))
    return resultado.docs.map((documento) => paraMembro(documento.id, documento.data()))
  }

  async buscarPorId(id: MembroId): Promise<Membro | null> {
    const documento = await getDoc(doc(this.db, COLECAO, id))
    return documento.exists() ? paraMembro(documento.id, documento.data()) : null
  }

  async criar(membro: Membro): Promise<void> {
    const { id, ...campos } = membro
    await setDoc(doc(this.db, COLECAO, id), campos)
  }

  async definirPapel(id: MembroId, papel: Papel): Promise<void> {
    await updateDoc(doc(this.db, COLECAO, id), { papel })
  }

  async definirStatus(id: MembroId, status: StatusMembro): Promise<void> {
    await updateDoc(doc(this.db, COLECAO, id), { status })
  }

  async vincularUid(id: MembroId, uid: string): Promise<void> {
    await updateDoc(doc(this.db, COLECAO, id), { uid })
  }
}

/** Converte o documento cru num `Membro`, falhando alto se o schema não bater. */
export function paraMembro(id: MembroId, dados: DocumentData): Membro {
  return {
    id,
    nome: exigirTexto(dados.nome, 'nome', id),
    email: exigirTexto(dados.email, 'email', id),
    papel: exigirUmDentre(dados.papel, PAPEIS, 'papel', id),
    status: exigirUmDentre(dados.status, STATUS, 'status', id),
    uid: typeof dados.uid === 'string' ? dados.uid : null
  }
}

function exigirTexto(valor: unknown, campo: string, id: MembroId): string {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new Error(`membros/${id} tem ${campo} inválido: ${JSON.stringify(valor)}. Esperado um texto não vazio.`)
  }
  return valor
}

function exigirUmDentre<T extends string>(valor: unknown, aceitos: readonly T[], campo: string, id: MembroId): T {
  if (typeof valor !== 'string' || !aceitos.includes(valor as T)) {
    throw new Error(
      `membros/${id} tem ${campo} inválido: ${JSON.stringify(valor)}. Esperado um de ${aceitos.join(' | ')}.`
    )
  }
  return valor as T
}
