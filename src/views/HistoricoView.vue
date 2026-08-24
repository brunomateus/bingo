<script setup lang="ts">
import { onMounted } from 'vue'
import { usarContexto } from '../app/contexto-do-app'
import AbaDeEdicoes from '../componentes/AbaDeEdicoes.vue'
import AbaDePendencias from '../componentes/AbaDePendencias.vue'
import AbaPorEstilo from '../componentes/AbaPorEstilo.vue'
import AbaPorMembro from '../componentes/AbaPorMembro.vue'
import { usarHistorico, type AbaDoHistorico } from '../componentes/usar-historico'

const { sessao, consultaDoHistorico, registroDeEntregas } = usarContexto()
const historico = usarHistorico(consultaDoHistorico, registroDeEntregas, sessao.membro)

const ABAS: readonly { chave: AbaDoHistorico; rotulo: string }[] = [
  { chave: 'edicoes', rotulo: 'Edições' },
  { chave: 'membro', rotulo: 'Por Membro' },
  { chave: 'estilo', rotulo: 'Por Estilo' },
  { chave: 'pendencias', rotulo: 'Pendências' }
]

onMounted(historico.recarregar)
</script>

<template>
  <div class="historico">
    <h1>Histórico</h1>
    <p v-if="historico.erro.value" class="erro" role="alert">{{ historico.erro.value }}</p>

    <nav class="abas">
      <button
        v-for="aba in ABAS"
        :key="aba.chave"
        type="button"
        :class="{ ativa: historico.aba.value === aba.chave }"
        @click="historico.aba.value = aba.chave"
      >
        {{ aba.rotulo }}
      </button>
    </nav>

    <p v-if="historico.carregando.value" class="carregando">Carregando o Histórico…</p>
    <template v-else>
      <AbaDeEdicoes v-if="historico.aba.value === 'edicoes'" :edicoes="historico.edicoes.value" />
      <AbaPorMembro
        v-else-if="historico.aba.value === 'membro'"
        :producao="historico.producao.value"
        :nome-de="historico.nomeDe"
        :estilos-de="historico.estilosDe"
      />
      <AbaPorEstilo v-else-if="historico.aba.value === 'estilo'" :ranking="historico.ranking.value" />
      <AbaDePendencias
        v-else
        :pendencias="historico.pendencias.value"
        :nome-de="historico.nomeDe"
        :rotulo-de="historico.rotuloDe"
        :eh-minha="historico.ehMinha"
        :estilos-entregaveis-em="historico.estilosEntregaveisEm"
        @quitar="historico.quitarEntrega"
      />
    </template>
  </div>
</template>

<style scoped>
.historico {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.abas {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border);
}
.abas button {
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  padding: 0.6rem 1rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--text);
}
.abas button.ativa {
  color: var(--stout);
  border-bottom-color: var(--amber);
}
.carregando,
.erro {
  margin: 0;
}
.erro {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: rgba(192, 57, 43, 0.08);
  border: 1px solid rgba(192, 57, 43, 0.3);
  color: #c0392b;
}
</style>
