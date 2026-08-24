<script setup lang="ts">
import type { FaseDaEdicao } from '../domain/edicao'

const props = defineProps<{ fase: FaseDaEdicao }>()

// Rótulos do stepper decidido no ticket 06. "Seleção Final" é o nome tradicional
// da Fase 2, mesmo ela sendo hoje um período de Entregas (CONTEXT.md).
const PASSOS: readonly { fase: FaseDaEdicao; rotulo: string }[] = [
  { fase: 'pool', rotulo: 'Pool' },
  { fase: 'entregas', rotulo: 'Seleção Final' },
  { fase: 'fechamento', rotulo: 'Fechamento' }
]

const indiceAtual = () => PASSOS.findIndex((passo) => passo.fase === props.fase)
</script>

<template>
  <ol class="stepper">
    <li
      v-for="(passo, indice) in PASSOS"
      :key="passo.fase"
      :class="{ atual: indice === indiceAtual(), concluido: indice < indiceAtual() }"
    >
      <span class="marcador">{{ indice < indiceAtual() ? '✓' : indice + 1 }}</span>
      {{ passo.rotulo }}
    </li>
  </ol>
</template>

<style scoped>
.stepper {
  display: flex;
  gap: 2rem;
  list-style: none;
  padding: 0;
  margin: 0;
  justify-content: center;
}
.stepper li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  opacity: 0.4;
  font-size: 0.85rem;
}
.stepper li.atual,
.stepper li.concluido {
  opacity: 1;
}
.marcador {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #f0ede8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.stepper li.atual .marcador {
  background: var(--amber);
  color: white;
}
.stepper li.concluido .marcador {
  background: var(--stout);
  color: white;
}
</style>
