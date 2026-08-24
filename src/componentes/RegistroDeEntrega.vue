<script setup lang="ts">
import { ref } from 'vue'
import type { Estilo, EstiloId } from '../domain/estilo'

defineProps<{
  estilosEntregaveis: readonly Estilo[]
  pendencia: number
}>()

const emit = defineEmits<{ registrar: [styleId: EstiloId, observation: string] }>()

const escolhido = ref<EstiloId>('')
const observacao = ref('')

function registrar(): void {
  if (!escolhido.value) {
    return
  }
  emit('registrar', escolhido.value, observacao.value.trim())
  escolhido.value = ''
  observacao.value = ''
}
</script>

<template>
  <!-- O Estilo da Entrega só é escolhido aqui, no ato — nunca antecipadamente
       (SPEC.md §4). A observação hoje serve para o local da entrega. -->
  <section class="registro">
    <h3>Registrar Entrega</h3>
    <p class="pendencia">
      {{ pendencia === 1 ? 'Falta 1 Entrega' : `Faltam ${pendencia} Entregas` }} para você cumprir esta Edição.
    </p>
    <form class="formulario" @submit.prevent="registrar">
      <select v-model="escolhido" required>
        <option value="" disabled>Escolher Estilo do Pool…</option>
        <option v-for="estilo in estilosEntregaveis" :key="estilo.id" :value="estilo.id">
          {{ estilo.id }} — {{ estilo.nome }}
        </option>
      </select>
      <input v-model="observacao" type="text" placeholder="Observação (ex.: onde foi entregue)" />
      <button type="submit" class="botao-primario" :disabled="!escolhido">Registrar</button>
    </form>
  </section>
</template>

<style scoped>
.registro {
  background: white;
  border: 1px solid var(--accent-border);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}
.registro h3 {
  margin: 0 0 0.35rem;
  font-size: 1rem;
}
.pendencia {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  opacity: 0.8;
}
.formulario {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
select,
input {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font: inherit;
  flex: 1;
  min-width: 12rem;
}
.botao-primario {
  background: var(--amber);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 700;
  font-family: inherit;
}
.botao-primario:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
