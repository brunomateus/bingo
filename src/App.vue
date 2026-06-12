<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import bingoLogo from './assets/bingo.png'
</script>

<template>
  <header class="logo-container">
    <img :src="bingoLogo" alt="Bingo Logo" class="logo-img" />
    <h1 class="brand-name">Confraria</h1>
    <nav class="main-nav">
      <RouterLink to="/">Início</RouterLink>
      <RouterLink to="/draw">Sorteio</RouterLink>
      <RouterLink to="/history">Histórico</RouterLink>
      <RouterLink to="/login">Login</RouterLink>
    </nav>
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

.content-wrapper {
  flex-grow: 1;
  padding: 2rem;
}
</style>
