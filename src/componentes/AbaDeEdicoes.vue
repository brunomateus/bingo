<script setup lang="ts">
import { contarEstilos, type EdicaoComEntregas } from '../domain/agregacoes-do-historico'
import ChipDeEstilo from './ChipDeEstilo.vue'
import { dataCurta } from './formato'

defineProps<{ edicoes: readonly EdicaoComEntregas[] }>()
</script>

<template>
  <p v-if="!edicoes.length" class="vazio">Nenhuma Edição concluída ainda.</p>
  <ul v-else class="lista">
    <li v-for="item in edicoes" :key="item.edicao.id" class="linha">
      <div class="cabecalho">
        <strong>Encerrada em {{ dataCurta(item.edicao.fechadaEm ?? item.edicao.prazo) }}</strong>
        <span class="meta">{{ item.edicao.participantes.length }} participantes · meta {{ item.edicao.metaEntregas }}</span>
      </div>
      <div class="chips">
        <ChipDeEstilo
          v-for="contagem in contarEstilos(item.entregasPorMembro)"
          :key="contagem.styleId"
          :style-id="contagem.styleId"
          :quantidade="contagem.quantidade"
        />
        <span v-if="!item.entregasPorMembro.length" class="vazio">Nenhuma Entrega registrada.</span>
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
  margin: 0;
}
</style>
