<template>
  <div class="home">
    <h1>Confraria de Cervejeiros</h1>
    <p>Bem-vindo ao sistema de sorteio de estilos BJCP.</p>
    <div class="actions">
      <router-link to="/sorteio" class="btn">Sorteio Atual</router-link>
      <router-link to="/historico" class="btn btn-secondary">Ver Histórico</router-link>
    </div>
  </div>
</template>

<style scoped>
.home {
  text-align: center;
  padding: 2rem;
}
.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}
.btn {
  padding: 0.5rem 1rem;
  background-color: #42b883;
  color: white;
  text-decoration: none;
  border-radius: 4px;
}
.btn-secondary {
  background-color: #35495e;
}
</style>
