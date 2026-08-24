<script setup lang="ts">
import { ref } from 'vue'
import type { Estilo, EstiloId } from '../domain/estilo'
import type { MembroId } from '../domain/membro'

const props = defineProps<{
  pendentes: readonly MembroId[]
  estilosLivres: readonly Estilo[]
  nomeDe: (membroId: MembroId) => string
}>()

const emit = defineEmits<{
  confirmar: [escolhas: Record<MembroId, EstiloId>]
  cancelar: []
}>()

const escolhas = ref<Record<MembroId, EstiloId>>({})

const todosEscolhidos = () => props.pendentes.every((pendente) => escolhas.value[pendente])
</script>

<template>
  <!-- Forçar avanço = reivindicar, em nome de quem não agiu, um dos Estilos que
       sobraram (SPEC.md §3). Completar o Pool é o que avança a Edição. -->
  <section class="painel-avanco">
    <h3>Escolher Estilo pelos participantes pendentes</h3>
    <div v-for="pendente in pendentes" :key="pendente" class="linha">
      <span>{{ nomeDe(pendente) }}</span>
      <select v-model="escolhas[pendente]">
        <option value="" disabled selected>Escolher Estilo…</option>
        <option v-for="estilo in estilosLivres" :key="estilo.id" :value="estilo.id">
          {{ estilo.id }} — {{ estilo.nome }}
        </option>
      </select>
    </div>
    <div class="acoes">
      <button type="button" class="botao-primario" :disabled="!todosEscolhidos()" @click="emit('confirmar', escolhas)">
        Confirmar e avançar
      </button>
      <button type="button" @click="emit('cancelar')">Cancelar</button>
    </div>
  </section>
</template>

<style scoped>
.painel-avanco {
  background: white;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}
.linha {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border);
}
.acoes {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
button {
  border: 1px solid var(--border);
  background: white;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-family: inherit;
}
button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.botao-primario {
  background: var(--amber);
  color: white;
  border: none;
  font-weight: 700;
}
select {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font: inherit;
  max-width: 60%;
}
</style>
