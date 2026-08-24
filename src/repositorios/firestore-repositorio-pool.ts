import { collection, doc, getDocs, writeBatch, type Firestore } from 'firebase/firestore'
import type { EdicaoId } from '../domain/edicao'
import type { ReivindicacaoPool } from '../domain/entrega'
import type { RepositorioPool } from './repositorio-pool'

const EDICOES = 'edicoes'
const POOL = 'pool'
// Índice de unicidade: um documento por Estilo reivindicado, com o id sendo o
// próprio styleId. É o que dá a "unicidade garantida por regra de escrita" do
// SPEC.md §7 — o Firestore não deixa criar duas vezes o mesmo id, e as regras só
// permitem `create` nessa subcoleção, nunca `update`.
const ESTILOS_DO_POOL = 'estilos-do-pool'

/**
 * `RepositorioPool` sobre `edicoes/{id}/pool` (SPEC.md §7). Cada reivindicação
 * escreve dois documentos no mesmo lote atômico: o do Membro e o do Estilo.
 *
 * @example new FirestoreRepositorioPool(db).listar('edicao-1')
 */
export class FirestoreRepositorioPool implements RepositorioPool {
  private readonly db: Firestore

  constructor(db: Firestore) {
    this.db = db
  }

  async listar(edicaoId: EdicaoId): Promise<ReivindicacaoPool[]> {
    const resultado = await getDocs(collection(this.db, EDICOES, edicaoId, POOL))
    return resultado.docs.map((documento) => ({
      membroId: documento.id,
      styleId: String(documento.data().styleId)
    }))
  }

  async reivindicar(edicaoId: EdicaoId, reivindicacao: ReivindicacaoPool): Promise<void> {
    await this.reivindicarEmNomeDeOutros(edicaoId, [reivindicacao])
  }

  async reivindicarEmNomeDeOutros(edicaoId: EdicaoId, reivindicacoes: readonly ReivindicacaoPool[]): Promise<void> {
    const lote = writeBatch(this.db)
    for (const { membroId, styleId } of reivindicacoes) {
      lote.set(doc(this.db, EDICOES, edicaoId, POOL, membroId), { styleId })
      lote.set(doc(this.db, EDICOES, edicaoId, ESTILOS_DO_POOL, styleId), { membroId })
    }
    await lote.commit()
  }
}
