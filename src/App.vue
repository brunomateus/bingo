<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      <RouterLink to="/">Início</RouterLink>
      <RouterLink to="/draw">Sorteio</RouterLink>
      <RouterLink to="/history">Histórico</RouterLink>
      <RouterLink to="/login">Login</RouterLink>
    </nav>
  </header>

  <main>
    <RouterView />
  </main>
</template>

<style>
#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, sans-serif;
}

header {
  line-height: 1.5;
  margin-bottom: 2rem;
}

nav {
  width: 100%;
  font-size: 1rem;
  text-align: center;
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  gap: 2rem;
}

nav a {
  text-decoration: none;
  color: #2c3e50;
  font-weight: bold;
}

nav a.router-link-exact-active {
  color: #42b883;
}

main {
  padding-top: 2rem;
}
</style>
