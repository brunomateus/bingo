import { inject, type InjectionKey } from 'vue'
import { AutenticadorGoogleFirebase } from '../autenticacao/autenticador-google-firebase'
import { AutenticacaoDeMembro } from '../casos-uso/autenticacao-de-membro'
import { CicloDaEdicao } from '../casos-uso/ciclo-da-edicao'
import { ConsultaDaEdicaoAtual } from '../casos-uso/consulta-da-edicao-atual'
import { ConsultaDoHistorico } from '../casos-uso/consulta-do-historico'
import { GestaoDeMembros } from '../casos-uso/gestao-de-membros'
import { RegistroDeEntregas } from '../casos-uso/registro-de-entregas'
import { SorteioDoPool } from '../casos-uso/sorteio-do-pool'
import type { AmbienteFirebase } from '../firebase/configuracao-firebase'
import { criarServicosFirebase } from '../firebase/servicos-firebase'
import { FirestoreRepositorioEdicoes } from '../repositorios/firestore-repositorio-edicoes'
import { FirestoreRepositorioEntregas } from '../repositorios/firestore-repositorio-entregas'
import { FirestoreRepositorioMembros } from '../repositorios/firestore-repositorio-membros'
import { FirestoreRepositorioPool } from '../repositorios/firestore-repositorio-pool'
import { criarSessao, type Sessao } from '../sessao/sessao'

/** Serviços que as telas consomem, montados uma vez no início da aplicação. */
export interface ContextoDoApp {
  sessao: Sessao
  gestaoDeMembros: GestaoDeMembros
  consultaDaEdicaoAtual: ConsultaDaEdicaoAtual
  cicloDaEdicao: CicloDaEdicao
  sorteioDoPool: SorteioDoPool
  registroDeEntregas: RegistroDeEntregas
  consultaDoHistorico: ConsultaDoHistorico
}

export const CHAVE_CONTEXTO: InjectionKey<ContextoDoApp> = Symbol('contexto-do-app')

/**
 * Composition root: o único lugar que liga Firebase, repositórios e casos de uso.
 * Todo o resto recebe as peças prontas, o que mantém as telas testáveis com fakes.
 *
 * @example const contexto = criarContextoDoApp(import.meta.env)
 */
export function criarContextoDoApp(ambiente: AmbienteFirebase): ContextoDoApp {
  const { db, auth } = criarServicosFirebase(ambiente)
  const repositorioMembros = new FirestoreRepositorioMembros(db)
  const repositorioEdicoes = new FirestoreRepositorioEdicoes(db)
  const repositorioPool = new FirestoreRepositorioPool(db)
  const repositorioEntregas = new FirestoreRepositorioEntregas(db)
  const autenticacao = new AutenticacaoDeMembro(new AutenticadorGoogleFirebase(auth), repositorioMembros)
  return {
    sessao: criarSessao(autenticacao),
    gestaoDeMembros: new GestaoDeMembros(repositorioMembros),
    consultaDaEdicaoAtual: new ConsultaDaEdicaoAtual(
      repositorioEdicoes,
      repositorioPool,
      repositorioMembros,
      repositorioEntregas
    ),
    cicloDaEdicao: new CicloDaEdicao(repositorioEdicoes, repositorioPool, repositorioMembros, repositorioEntregas),
    sorteioDoPool: new SorteioDoPool(repositorioEdicoes, repositorioPool),
    registroDeEntregas: new RegistroDeEntregas(repositorioEdicoes, repositorioPool, repositorioEntregas),
    consultaDoHistorico: new ConsultaDoHistorico(
      repositorioEdicoes,
      repositorioEntregas,
      repositorioMembros,
      repositorioPool
    )
  }
}

/** Acessa o contexto de dentro de um componente. */
export function usarContexto(): ContextoDoApp {
  const contexto = inject(CHAVE_CONTEXTO)
  if (!contexto) {
    throw new Error('Contexto do app ausente. Esperado `app.provide(CHAVE_CONTEXTO, criarContextoDoApp(...))`.')
  }
  return contexto
}
