import { collection, doc, getDoc, getDocs, runTransaction, type DocumentData, type Firestore } from 'firebase/firestore'
import type { EdicaoId } from '../domain/edicao'
import type { Entrega, EntregasDoMembro } from '../domain/entrega'
import type { MembroId } from '../domain/membro'
import type { RepositorioEntregas } from './repositorio-entregas'

const EDICOES = 'edicoes'
const SELECOES = 'selecoes'

/**
 * `RepositorioEntregas` sobre `edicoes/{id}/selecoes/{membroId}` (SPEC.md §7).
 * O registro roda em transação: relê a lista antes de acrescentar, então duas
 * abas do mesmo Membro não conseguem gravar o mesmo Estilo.
 *
 * @example new FirestoreRepositorioEntregas(db).registrar('edicao-1', 'ana@x.com', entrega)
 */
export class FirestoreRepositorioEntregas implements RepositorioEntregas {
  private readonly db: Firestore

  constructor(db: Firestore) {
    this.db = db
  }

  async listarPorEdicao(edicaoId: EdicaoId): Promise<EntregasDoMembro[]> {
    const resultado = await getDocs(collection(this.db, EDICOES, edicaoId, SELECOES))
    return resultado.docs.map((documento) => ({
      membroId: documento.id,
      entregas: paraEntregas(documento.id, documento.data())
    }))
  }

  async buscarDoMembro(edicaoId: EdicaoId, membroId: MembroId): Promise<Entrega[]> {
    const documento = await getDoc(doc(this.db, EDICOES, edicaoId, SELECOES, membroId))
    return documento.exists() ? paraEntregas(membroId, documento.data()) : []
  }

  async registrar(edicaoId: EdicaoId, membroId: MembroId, entrega: Entrega): Promise<void> {
    const referencia = doc(this.db, EDICOES, edicaoId, SELECOES, membroId)
    await runTransaction(this.db, async (transacao) => {
      const documento = await transacao.get(referencia)
      const atuais = documento.exists() ? paraEntregas(membroId, documento.data()) : []
      if (atuais.some((registrada) => registrada.styleId === entrega.styleId)) {
        throw new Error(
          `Entrega duplicada em ${edicaoId}/${membroId}: ${entrega.styleId}. Esperado um styleId ainda não entregue.`
        )
      }
      transacao.set(referencia, { entregas: [...atuais, entrega] })
    })
  }
}

/** Converte o documento cru na lista de Entregas, falhando alto se o schema não bater. */
export function paraEntregas(membroId: MembroId, dados: DocumentData): Entrega[] {
  if (!Array.isArray(dados.entregas)) {
    throw new Error(
      `selecoes/${membroId} tem entregas inválidas: ${JSON.stringify(dados.entregas)}. Esperado uma lista.`
    )
  }
  return dados.entregas.map((item: unknown) => paraEntrega(membroId, item))
}

function paraEntrega(membroId: MembroId, item: unknown): Entrega {
  const entrega = item as Partial<Entrega>
  if (typeof entrega?.styleId !== 'string' || typeof entrega.deliveredAt !== 'string') {
    throw new Error(
      `selecoes/${membroId} tem Entrega inválida: ${JSON.stringify(item)}. ` +
        'Esperado { styleId, observation, deliveredAt } com textos.'
    )
  }
  return { styleId: entrega.styleId, observation: entrega.observation ?? '', deliveredAt: entrega.deliveredAt }
}
