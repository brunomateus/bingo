import { computed, readonly, ref, type ComputedRef, type DeepReadonly, type Ref } from 'vue'
import type { AutenticacaoDeMembro } from '../casos-uso/autenticacao-de-membro'
import { ErroDeRegra } from '../domain/erro-de-regra'
import type { Membro } from '../domain/membro'

/** Estado reativo de quem está logado, alimentado pela revalidação do SPEC.md §2. */
export interface Sessao {
  membro: DeepReadonly<Ref<Membro | null>>
  /** Motivo da última recusa de login (e-mail não cadastrado, Membro inativo...). */
  recusa: Readonly<Ref<string | null>>
  /** `true` até o provedor dizer se havia sessão restaurada — evita piscar a tela de login. */
  carregando: Readonly<Ref<boolean>>
  ehOrganizador: ComputedRef<boolean>
  entrar(): Promise<void>
  sair(): Promise<void>
  /** Resolve quando a primeira revalidação termina; usado pelas guardas de rota. */
  pronta(): Promise<void>
}

/**
 * Cria a sessão e já se inscreve nas mudanças do provedor, de modo que um Membro
 * desativado enquanto logado caia na revalidação seguinte.
 *
 * @example const sessao = criarSessao(new AutenticacaoDeMembro(autenticador, repositorio))
 */
export function criarSessao(autenticacao: AutenticacaoDeMembro): Sessao {
  const membro = ref<Membro | null>(null)
  const recusa = ref<string | null>(null)
  const carregando = ref(true)
  let sinalizarPronta: () => void
  const primeiraValidacao = new Promise<void>((resolver) => {
    sinalizarPronta = resolver
  })

  autenticacao.observarSessao((resultado) => {
    membro.value = resultado.membro
    recusa.value = resultado.recusa?.message ?? null
    carregando.value = false
    sinalizarPronta()
  })

  async function entrar(): Promise<void> {
    recusa.value = null
    carregando.value = true
    try {
      membro.value = await autenticacao.entrar()
    } catch (erro) {
      membro.value = null
      recusa.value = mensagemDeRecusa(erro)
    } finally {
      carregando.value = false
    }
  }

  async function sair(): Promise<void> {
    await autenticacao.sair()
    membro.value = null
    recusa.value = null
  }

  return {
    membro: readonly(membro),
    recusa: readonly(recusa),
    carregando: readonly(carregando),
    ehOrganizador: computed(() => membro.value?.papel === 'organizador'),
    entrar,
    sair,
    pronta: () => primeiraValidacao
  }
}

/** Só mensagem de regra vai para a tela; falha técnica vira um aviso genérico e sobe no console. */
function mensagemDeRecusa(erro: unknown): string {
  if (erro instanceof ErroDeRegra) {
    return erro.message
  }
  console.error('Falha no login', erro)
  return 'Não foi possível completar o login. Tente novamente.'
}
