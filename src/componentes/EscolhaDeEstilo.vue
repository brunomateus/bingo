<script setup lang="ts">
import { ref } from 'vue'
import type { Estilo, EstiloId } from '../domain/estilo'

defineProps<{ estilosLivres: readonly Estilo[] }>()
const emit = defineEmits<{ reivindicar: [styleId: EstiloId] }>()

const escolhido = ref<EstiloId>('')

function reivindicar(): void {
  if (escolhido.value) {
    emit('reivindicar', escolhido.value)
    escolhido.value = ''
  }
}
</script>

<template>
  <!-- Fase 1 pela mão do próprio Membro: um Estilo, por ordem de chegada, entre os
       que ninguém levou ainda (SPEC.md §4). -->
  <section class="escolha">
    <h3>Sua vez: escolha um Estilo para o Pool</h3>
    <div class="linha">
      <select v-model="escolhido">
        <option value="" disabled>Escolher Estilo…</option>
        <option v-for="estilo in estilosLivres" :key="estilo.id" :value="estilo.id">
          {{ estilo.id }} — {{ estilo.nome }}
        </option>
      </select>
      <button type="button" class="botao-primario" :disabled="!escolhido" @click="reivindicar">Reivindicar</button>
    </div>
  </section>
</template>

<style scoped>
.escolha {
  background: white;
  border: 1px solid var(--accent-border);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}
.escolha h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}
.linha {
  display: flex;
  gap: 0.5rem;
}
select {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font: inherit;
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
