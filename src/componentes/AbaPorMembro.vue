<script setup lang="ts">
import type { ContagemDeEstilo, ProducaoDeMembro } from '../domain/agregacoes-do-historico'
import type { MembroId } from '../domain/membro'
import ChipDeEstilo from './ChipDeEstilo.vue'

defineProps<{
  producao: readonly ProducaoDeMembro[]
  nomeDe: (membroId: MembroId) => string
  estilosDe: (producao: ProducaoDeMembro) => ContagemDeEstilo[]
}>()
</script>

<template>
  <p v-if="!producao.length" class="vazio">Ninguém entregou nada em Edições concluídas ainda.</p>
  <ul v-else class="lista">
    <!-- Inclui quem já saiu da confraria: o Histórico preserva as Entregas de
         Membros inativos (SPEC.md §5). -->
    <li v-for="linha in producao" :key="linha.membroId" class="linha">
      <div class="cabecalho">
        <strong>{{ nomeDe(linha.membroId) }}</strong>
        <span class="meta">{{ linha.entregas.length }} Entregas</span>
      </div>
      <div class="chips">
        <ChipDeEstilo
          v-for="contagem in estilosDe(linha)"
          :key="contagem.styleId"
          :style-id="contagem.styleId"
          :quantidade="contagem.quantidade"
        />
      </div>
    </li>
  </ul>
</template>

<style scoped>
.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.linha {
  background: white;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem;
}
.cabecalho {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 0.6rem;
}
.meta {
  font-size: 0.8rem;
  opacity: 0.7;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.vazio {
  opacity: 0.7;
  font-size: 0.85rem;
}
</style>
