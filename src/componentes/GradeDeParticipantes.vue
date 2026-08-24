<script setup lang="ts">
import { encontrarEstilo } from '../catalogo/catalogo-estilos'
import type { FaseDaEdicao } from '../domain/edicao'
import type { EstiloId } from '../domain/estilo'
import type { MembroId } from '../domain/membro'

// Na Fase 1 o card mostra o Estilo que o participante trouxe para o Pool; da Fase 2
// em diante mostra o progresso de Entregas, porque não há mais Estilo por
// participante — o Estilo é escolhido a cada Entrega (ticket 07).
defineProps<{
  participantes: readonly MembroId[]
  fase: FaseDaEdicao
  metaEntregas: number
  nomeDe: (membroId: MembroId) => string
  estiloDe: (membroId: MembroId) => EstiloId | null
  entregasFeitasPor: (membroId: MembroId) => number
}>()

function rotuloDoEstilo(styleId: EstiloId): string {
  const estilo = encontrarEstilo(styleId)
  return estilo ? `${estilo.id} — ${estilo.nome}` : styleId
}
</script>

<template>
  <div class="grade">
    <article
      v-for="participante in participantes"
      :key="participante"
      class="card"
      :class="{ pendente: fase === 'pool' ? !estiloDe(participante) : entregasFeitasPor(participante) < metaEntregas }"
    >
      <strong>{{ nomeDe(participante) }}</strong>
      <template v-if="fase === 'pool'">
        <span v-if="estiloDe(participante)" class="estilo">{{ rotuloDoEstilo(estiloDe(participante)!) }}</span>
        <span v-else class="aguardando">aguardando Estilo</span>
      </template>
      <template v-else>
        <span class="estilo">{{ entregasFeitasPor(participante) }} de {{ metaEntregas }} Entregas</span>
        <span v-if="entregasFeitasPor(participante) < metaEntregas" class="aguardando">
          deve {{ metaEntregas - entregasFeitasPor(participante) }}
        </span>
      </template>
    </article>
  </div>
</template>

<style scoped>
.grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.75rem;
}
.card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.card.pendente {
  border-style: dashed;
}
.estilo {
  font-size: 0.85rem;
  color: var(--amber);
  font-weight: 600;
}
.aguardando {
  font-size: 0.85rem;
  color: var(--text);
  opacity: 0.6;
  font-style: italic;
}
</style>
