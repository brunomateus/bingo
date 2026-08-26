<script setup lang="ts">
import { encontrarEstilo } from '../catalogo/catalogo-estilos'
import type { ContagemDeEstilo } from '../domain/agregacoes-do-historico'
import type { EstiloId } from '../domain/estilo'

defineProps<{ ranking: readonly ContagemDeEstilo[] }>()

function nomeDoEstilo(styleId: EstiloId): string {
  return encontrarEstilo(styleId)?.nome ?? 'Estilo fora do guia atual'
}

function categoriaDoEstilo(styleId: EstiloId): string {
  return encontrarEstilo(styleId)?.categoria ?? '—'
}
</script>

<template>
  <p v-if="!ranking.length" class="vazio">Nenhum Estilo entregue ainda.</p>
  <!-- Conta vezes **entregues**, não escolhidas: a Fase 2 não tem escolha
       antecipada de Estilo (SPEC.md §5). -->
  <table v-else class="ranking">
    <thead>
      <tr>
        <th scope="col">Estilo</th>
        <th scope="col">Categoria</th>
        <th scope="col" class="numero">Entregas</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="contagem in ranking" :key="contagem.styleId">
        <td>
          <strong>{{ contagem.styleId }}</strong> {{ nomeDoEstilo(contagem.styleId) }}
        </td>
        <td class="categoria">{{ categoriaDoEstilo(contagem.styleId) }}</td>
        <td class="numero">{{ contagem.quantidade }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.ranking {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
th,
td {
  text-align: left;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--border);
}
th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}
tbody tr:last-child td {
  border-bottom: none;
}
.categoria {
  font-size: 0.85rem;
  opacity: 0.75;
}
.numero {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.vazio {
  opacity: 0.7;
  font-size: 0.85rem;
}
</style>
