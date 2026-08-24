<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { usarContexto } from './app/contexto-do-app'
import bingoLogo from './assets/bingo.png'

const { sessao } = usarContexto()
</script>

<template>
  <header class="logo-container">
    <img :src="bingoLogo" alt="Bingo Logo" class="logo-img" />
    <h1 class="brand-name">Confraria</h1>
    <nav class="main-nav">
      <RouterLink to="/">Início</RouterLink>
      <template v-if="sessao.membro.value">
        <RouterLink to="/sorteio">Sorteio</RouterLink>
        <RouterLink to="/historico">Histórico</RouterLink>
        <RouterLink v-if="sessao.ehOrganizador.value" to="/membros">Membros</RouterLink>
      </template>
      <RouterLink v-else to="/login">Entrar</RouterLink>
    </nav>
    <div v-if="sessao.membro.value" class="sessao">
      <span class="nome-do-membro">{{ sessao.membro.value.nome }}</span>
      <button type="button" class="botao-sair" @click="sessao.sair()">Sair</button>
    </div>
  </header>

  <main class="content-wrapper">
    <RouterView />
  </main>
</template>

<style>
.main-nav {
  margin-left: auto;
  display: flex;
  gap: 1.5rem;
}

.main-nav a {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  color: var(--stout);
}

.main-nav a.router-link-exact-active {
  background-color: var(--amber);
  color: white;
}

.sessao {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: 1.5rem;
  padding-left: 1.5rem;
  border-left: 1px solid var(--border);
}

.nome-do-membro {
  font-weight: 600;
  color: var(--stout);
}

.botao-sair {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.3rem 0.7rem;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text);
}

.content-wrapper {
  flex-grow: 1;
  padding: 2rem;
}
</style>
