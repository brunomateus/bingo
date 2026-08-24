<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { usarContexto } from '../app/contexto-do-app'

const { sessao } = usarContexto()
const roteador = useRouter()

// Login validado pelo domínio leva direto pra Home; a revalidação de sessão
// (SPEC.md §2) pode também chegar sozinha, sem clique.
watch(
  () => sessao.membro.value,
  (membro) => {
    if (membro) {
      roteador.push({ name: 'home' })
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="login">
    <h1>Entrar</h1>
    <p>Só Membros cadastrados e ativos da confraria conseguem entrar.</p>
    <button type="button" class="botao-google" :disabled="sessao.carregando.value" @click="sessao.entrar()">
      {{ sessao.carregando.value ? 'Verificando…' : 'Entrar com Google' }}
    </button>
    <p v-if="sessao.recusa.value" class="recusa" role="alert">{{ sessao.recusa.value }}</p>
  </div>
</template>

<style scoped>
.login {
  max-width: 420px;
  margin: 3rem auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.botao-google {
  align-self: center;
  background: var(--stout);
  color: white;
  border: none;
  padding: 0.7rem 1.4rem;
  border-radius: 8px;
  font-weight: 600;
}
.botao-google:disabled {
  opacity: 0.6;
  cursor: progress;
}
.recusa {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: rgba(192, 57, 43, 0.08);
  border: 1px solid rgba(192, 57, 43, 0.3);
  color: #c0392b;
}
</style>
