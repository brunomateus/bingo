<script setup lang="ts">
import { encontrarEstilo } from '../catalogo/catalogo-estilos'
import type { EstiloId } from '../domain/estilo'

const props = defineProps<{ styleId: EstiloId; quantidade: number }>()

// `×N` quando o mesmo Estilo foi entregue mais de uma vez no recorte (ticket 07).
const nome = () => encontrarEstilo(props.styleId)?.nome ?? 'Estilo fora do guia atual'
</script>

<template>
  <span class="chip">
    <strong>{{ styleId }}</strong> {{ nome() }}
    <span v-if="quantidade > 1" class="vezes">×{{ quantidade }}</span>
  </span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: var(--accent-bg);
  color: var(--text-h);
  font-size: 0.82rem;
  white-space: nowrap;
}
.chip strong {
  color: var(--amber);
}
.vezes {
  font-weight: 700;
  color: var(--amber);
}
</style>
