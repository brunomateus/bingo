import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { GestaoDeMembros } from '../casos-uso/gestao-de-membros'
import { ErroDeRegra } from '../domain/erro-de-regra'
import { motivoParaProtegerOrganizador } from '../domain/guarda-organizador'
import type { Membro, MembroId } from '../domain/membro'

/** Estado da tela de gestão de Membros: a lista, a guarda por card e o erro da última ação. */
export interface ListaDeMembros {
  ativos: ComputedRef<Membro[]>
  inativos: ComputedRef<Membro[]>
  carregando: Readonly<Ref<boolean>>
  erro: Readonly<Ref<string | null>>
  /** Aviso ⚠ do card quando o Membro é o último Organizador ativo; `null` se as ações estão liberadas. */
  motivoDeProtecao(id: MembroId): string | null
  recarregar(): Promise<void>
  cadastrar(nome: string, email: string): Promise<boolean>
  alternarPapel(membro: Membro): Promise<void>
  desativar(id: MembroId): Promise<void>
  reativar(id: MembroId): Promise<void>
}

/**
 * View-model da tela de Membros. Não decide regra nenhuma: delega em
 * `GestaoDeMembros` e só traduz o resultado para a tela.
 *
 * @example const lista = usarListaDeMembros(contexto.gestaoDeMembros)
 */
export function usarListaDeMembros(gestao: GestaoDeMembros): ListaDeMembros {
  const membros = ref<Membro[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)

  async function recarregar(): Promise<void> {
    carregando.value = true
    try {
      membros.value = await gestao.listar()
    } finally {
      carregando.value = false
    }
  }

  /** Roda a ação, guarda a recusa de regra para a tela e recarrega quando dá certo. */
  async function executar(acao: () => Promise<void>): Promise<boolean> {
    erro.value = null
    try {
      await acao()
      await recarregar()
      return true
    } catch (falha) {
      erro.value = mensagemDeFalha(falha)
      return false
    }
  }

  return {
    ativos: computed(() => membros.value.filter((membro) => membro.status === 'ativo')),
    inativos: computed(() => membros.value.filter((membro) => membro.status === 'inativo')),
    carregando,
    erro,
    motivoDeProtecao: (id) => motivoParaProtegerOrganizador(membros.value, id),
    recarregar,
    cadastrar: (nome, email) => executar(async () => void (await gestao.cadastrar(nome, email))),
    alternarPapel: async (membro) => {
      await executar(() => (membro.papel === 'organizador' ? gestao.rebaixar(membro.id) : gestao.promover(membro.id)))
    },
    desativar: async (id) => void (await executar(() => gestao.desativar(id))),
    reativar: async (id) => void (await executar(() => gestao.reativar(id)))
  }
}

function mensagemDeFalha(falha: unknown): string {
  if (falha instanceof ErroDeRegra) {
    return falha.message
  }
  console.error('Falha ao gerir membros', falha)
  return 'Não foi possível concluir a ação. Verifique sua conexão e tente novamente.'
}
