import { createRouter, createWebHistory, type Router } from 'vue-router'
import type { Sessao } from '../sessao/sessao'
import HomeView from '../views/HomeView.vue'

/** Quem pode abrir a rota (SPEC.md §2 e a tabela de acesso do §7). */
export type NivelDeAcesso = 'publico' | 'membro' | 'organizador'

declare module 'vue-router' {
  interface RouteMeta {
    acesso: NivelDeAcesso
  }
}

/**
 * Cria o roteador já com a guarda de acesso ligada à sessão.
 *
 * @example const roteador = criarRoteador(contexto.sessao)
 */
export function criarRoteador(sessao: Sessao): Router {
  const roteador = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
      { path: '/', name: 'home', component: HomeView, meta: { acesso: 'publico' } },
      { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { acesso: 'publico' } },
      {
        path: '/sorteio',
        name: 'sorteio',
        component: () => import('../views/SorteioView.vue'),
        meta: { acesso: 'membro' }
      },
      {
        path: '/historico',
        name: 'historico',
        component: () => import('../views/HistoricoView.vue'),
        meta: { acesso: 'membro' }
      },
      {
        path: '/membros',
        name: 'membros',
        component: () => import('../views/MembrosView.vue'),
        meta: { acesso: 'organizador' }
      }
    ]
  })

  roteador.beforeEach(async (destino) => {
    // Espera a revalidação inicial: sem isso, um F5 numa rota protegida cairia
    // no login antes de o provedor dizer que já havia sessão.
    await sessao.pronta()
    return destinoPermitido(sessao, destino.meta.acesso)
  })

  return roteador
}

function destinoPermitido(sessao: Sessao, acesso: NivelDeAcesso): true | { name: string } {
  if (acesso === 'publico') {
    return true
  }
  if (!sessao.membro.value) {
    return { name: 'login' }
  }
  if (acesso === 'organizador' && !sessao.ehOrganizador.value) {
    return { name: 'home' }
  }
  return true
}
