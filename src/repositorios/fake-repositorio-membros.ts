import type { Membro, MembroId, Papel, StatusMembro } from '../domain/membro'
import type { RepositorioMembros } from './repositorio-membros'

/**
 * Repositório de Membros em memória para testes. É só armazenamento: as regras
 * de negócio (guarda do último Organizador, revalidação de login) vivem nos casos
 * de uso, não aqui, senão os testes validariam o dublê em vez do domínio.
 *
 * @example const repositorio = new FakeRepositorioMembros([umMembro])
 */
export class FakeRepositorioMembros implements RepositorioMembros {
  private readonly membrosPorId = new Map<MembroId, Membro>()

  constructor(membrosIniciais: readonly Membro[] = []) {
    for (const membro of membrosIniciais) {
      this.membrosPorId.set(membro.id, { ...membro })
    }
  }

  async listar(): Promise<Membro[]> {
    return [...this.membrosPorId.values()].map((membro) => ({ ...membro }))
  }

  async buscarPorId(id: MembroId): Promise<Membro | null> {
    const membro = this.membrosPorId.get(id)
    return membro ? { ...membro } : null
  }

  async criar(membro: Membro): Promise<void> {
    if (this.membrosPorId.has(membro.id)) {
      throw new Error(`Membro já cadastrado: ${JSON.stringify(membro.id)}. Esperado um e-mail ainda não usado.`)
    }
    this.membrosPorId.set(membro.id, { ...membro })
  }

  async definirPapel(id: MembroId, papel: Papel): Promise<void> {
    this.membrosPorId.set(id, { ...this.exigirMembro(id), papel })
  }

  async definirStatus(id: MembroId, status: StatusMembro): Promise<void> {
    this.membrosPorId.set(id, { ...this.exigirMembro(id), status })
  }

  async vincularUid(id: MembroId, uid: string): Promise<void> {
    this.membrosPorId.set(id, { ...this.exigirMembro(id), uid })
  }

  private exigirMembro(id: MembroId): Membro {
    const membro = this.membrosPorId.get(id)
    if (!membro) {
      throw new Error(`Membro inexistente: ${JSON.stringify(id)}. Esperado o id de um Membro já cadastrado.`)
    }
    return membro
  }
}
