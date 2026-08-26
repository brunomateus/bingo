<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LinhaDePendencia } from '../domain/agregacoes-do-historico'
import type { EdicaoId } from '../domain/edicao'
import type { Estilo, EstiloId } from '../domain/estilo'
import RegistroDeEntrega from './RegistroDeEntrega.vue'

const props = defineProps<{
  /** As Edições que o Membro logado deve, da mais urgente para a mais antiga. */
  devidas: readonly LinhaDePendencia[]
  rotuloDe: (edicaoId: EdicaoId) => string
  estilosEntregaveisEm: (edicaoId: EdicaoId) => Estilo[]
}>()

const emit = defineEmits<{ quitar: [edicaoId: EdicaoId, styleId: EstiloId, observation: string] }>()

// Uma Entrega paga uma Edição específica, então quem deve em várias precisa
// dizer qual está quitando; a mais urgente já vem escolhida.
const escolhida = ref<EdicaoId>(props.devidas[0]?.edicaoId ?? '')

const alvo = computed(() => props.devidas.find((linha) => linha.edicaoId === escolhida.value) ?? props.devidas[0])

function quitar(styleId: EstiloId, observation: string): void {
  if (!alvo.value) {
    return
  }
  emit('quitar', alvo.value.edicaoId, styleId, observation)
}
</script>

<template>
  <div v-if="alvo" class="quitacao">
    <label v-if="devidas.length > 1" class="escolha">
      <span>Edição a quitar</span>
      <select v-model="escolhida">
        <option v-for="linha in devidas" :key="linha.edicaoId" :value="linha.edicaoId">
          {{ rotuloDe(linha.edicaoId) }} — deve {{ linha.quantidade }}
        </option>
      </select>
    </label>
    <RegistroDeEntrega
      :estilos-entregaveis="estilosEntregaveisEm(alvo.edicaoId)"
      :pendencia="alvo.quantidade"
      @registrar="quitar"
    />
  </div>
</template>

<style scoped>
.escolha {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
}
select {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font: inherit;
  font-weight: 400;
  max-width: 26rem;
}
</style>
