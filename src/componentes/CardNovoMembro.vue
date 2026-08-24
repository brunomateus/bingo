<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ cadastrar: [nome: string, email: string] }>()

const abrindoFormulario = ref(false)
const nome = ref('')
const email = ref('')

function enviar(): void {
  emit('cadastrar', nome.value.trim(), email.value.trim())
  nome.value = ''
  email.value = ''
  abrindoFormulario.value = false
}
</script>

<template>
  <button v-if="!abrindoFormulario" type="button" class="card-tracejado" @click="abrindoFormulario = true">
    + Novo membro
  </button>
  <!-- Sem campo de papel/status: todo cadastro nasce Membro comum ativo (SPEC.md §2). -->
  <form v-else class="card-tracejado formulario" @submit.prevent="enviar">
    <input v-model="nome" type="text" placeholder="Nome" required />
    <input v-model="email" type="email" placeholder="E-mail" required />
    <div class="acoes">
      <button type="submit" class="botao-primario">Cadastrar</button>
      <button type="button" class="botao-texto" @click="abrindoFormulario = false">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.card-tracejado {
  border: 2px dashed var(--border);
  border-radius: 12px;
  background: transparent;
  color: var(--text);
  font-weight: 600;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.formulario {
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  align-items: stretch;
}
.formulario input {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: inherit;
}
.acoes {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.botao-primario {
  background: var(--stout);
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
}
.botao-texto {
  background: none;
  border: none;
  color: var(--text);
  font-size: 0.85rem;
}
</style>
