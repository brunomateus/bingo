<script setup lang="ts">
import { ref } from 'vue'
import type { LinhaDePendencia } from '../domain/agregacoes-do-historico'
import type { EdicaoId } from '../domain/edicao'
import type { Estilo, EstiloId } from '../domain/estilo'
import type { MembroId } from '../domain/membro'
import RegistroDeEntrega from './RegistroDeEntrega.vue'

defineProps<{
  pendencias: readonly LinhaDePendencia[]
  nomeDe: (membroId: MembroId) => string
  rotuloDe: (edicaoId: EdicaoId) => string
  ehMinha: (membroId: MembroId) => boolean
  estilosEntregaveisEm: (edicaoId: EdicaoId) => Estilo[]
}>()

const emit = defineEmits<{ quitar: [edicaoId: EdicaoId, styleId: EstiloId, observation: string] }>()

// Uma linha por vez em modo de registro, para a tabela não virar um formulário só.
const quitando = ref<EdicaoId | null>(null)

function quitar(edicaoId: EdicaoId, styleId: EstiloId, observation: string): void {
  emit('quitar', edicaoId, styleId, observation)
  quitando.value = null
}
</script>

<template>
  <p class="nota">
    A Pendência é uma quantidade, não um Estilo: o Estilo de cada Entrega só é
    escolhido no ato de registrá-la. Entregas atrasadas continuam valendo, mesmo
    com a Edição já encerrada.
  </p>
  <p v-if="!pendencias.length" class="vazio">Ninguém deve Entregas. Confraria em dia.</p>
  <table v-else class="pendencias">
    <thead>
      <tr>
        <th scope="col">Membro</th>
        <th scope="col">Edição</th>
        <th scope="col" class="numero">Deve</th>
        <th scope="col"><span class="oculto">Ações</span></th>
      </tr>
    </thead>
    <tbody>
      <template v-for="linha in pendencias" :key="`${linha.membroId}-${linha.edicaoId}`">
        <tr>
          <td>{{ nomeDe(linha.membroId) }}</td>
          <td class="edicao">{{ rotuloDe(linha.edicaoId) }}</td>
          <td class="numero">{{ linha.quantidade }}</td>
          <td class="acao">
            <button
              v-if="ehMinha(linha.membroId)"
              type="button"
              class="botao-link"
              @click="quitando = quitando === linha.edicaoId ? null : linha.edicaoId"
            >
              {{ quitando === linha.edicaoId ? 'Cancelar' : 'Registrar Entrega' }}
            </button>
          </td>
        </tr>
        <tr v-if="quitando === linha.edicaoId">
          <td colspan="4">
            <RegistroDeEntrega
              :estilos-entregaveis="estilosEntregaveisEm(linha.edicaoId)"
              :pendencia="linha.quantidade"
              @registrar="(styleId, observation) => quitar(linha.edicaoId, styleId, observation)"
            />
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<style scoped>
.nota {
  font-size: 0.85rem;
  opacity: 0.8;
  margin-top: 0;
  max-width: 46rem;
}
.pendencias {
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
.edicao {
  font-size: 0.85rem;
  opacity: 0.8;
}
.numero {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
.vazio {
  opacity: 0.7;
  font-size: 0.85rem;
}
.acao {
  text-align: right;
}
.botao-link {
  border: none;
  background: none;
  color: var(--amber);
  text-decoration: underline;
  font: inherit;
  font-size: 0.82rem;
  padding: 0;
}
.oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
