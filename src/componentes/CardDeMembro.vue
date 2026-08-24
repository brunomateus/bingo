<script setup lang="ts">
import type { Membro } from '../domain/membro'

const props = defineProps<{
  membro: Membro
  /** Aviso do último Organizador ativo; quando presente, desabilita as ações. */
  motivoDeProtecao: string | null
}>()

defineEmits<{
  alternarPapel: [membro: Membro]
  desativar: [membro: Membro]
  reativar: [membro: Membro]
}>()

const ehOrganizador = () => props.membro.papel === 'organizador'
</script>

<template>
  <article class="card-membro" :class="{ 'card-inativo': membro.status === 'inativo' }">
    <div class="topo">
      <strong>{{ membro.nome }}</strong>
      <span class="etiqueta" :class="ehOrganizador() ? 'etiqueta-ambar' : 'etiqueta-neutra'">
        {{ ehOrganizador() ? 'Organizador' : 'Membro comum' }}
      </span>
    </div>
    <p class="email">{{ membro.email }}</p>

    <!-- Membro inativo não tem papel editável: a única ação é reativar (SPEC.md §2). -->
    <div v-if="membro.status === 'inativo'" class="acoes">
      <button type="button" @click="$emit('reativar', membro)">Reativar</button>
    </div>
    <template v-else>
      <div class="acoes">
        <button
          type="button"
          :disabled="motivoDeProtecao !== null"
          :title="motivoDeProtecao ?? undefined"
          @click="$emit('alternarPapel', membro)"
        >
          {{ ehOrganizador() ? 'Rebaixar' : 'Promover' }}
        </button>
        <button
          type="button"
          class="acao-perigo"
          :disabled="motivoDeProtecao !== null"
          :title="motivoDeProtecao ?? undefined"
          @click="$emit('desativar', membro)"
        >
          Desativar
        </button>
      </div>
      <p v-if="motivoDeProtecao" class="aviso-guarda">⚠ {{ motivoDeProtecao }}</p>
    </template>
  </article>
</template>

<style scoped>
.card-membro {
  background: white;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.card-inativo {
  opacity: 0.55;
}
.topo {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}
.email {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text);
  opacity: 0.8;
  overflow-wrap: anywhere;
}
.acoes {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.4rem;
}
.acoes button {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.3rem 0.7rem;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--amber);
}
.acoes button:disabled {
  color: var(--border);
  cursor: not-allowed;
}
.acao-perigo:not(:disabled) {
  color: #c0392b;
}
.aviso-guarda {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text);
  opacity: 0.8;
}
.etiqueta {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
.etiqueta-ambar {
  background: var(--accent-bg);
  color: var(--amber);
}
.etiqueta-neutra {
  background: var(--bg);
  color: var(--text);
}
</style>
