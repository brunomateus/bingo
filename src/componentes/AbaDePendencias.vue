<script setup lang="ts">
import { ref } from 'vue'
import type { PendenciasDoMembro } from '../domain/agregacoes-do-historico'
import type { EdicaoId } from '../domain/edicao'
import type { Estilo, EstiloId } from '../domain/estilo'
import type { MembroId } from '../domain/membro'
import QuitacaoDePendencia from './QuitacaoDePendencia.vue'

defineProps<{
  pendencias: readonly PendenciasDoMembro[]
  nomeDe: (membroId: MembroId) => string
  rotuloDe: (edicaoId: EdicaoId) => string
  ehMinha: (membroId: MembroId) => boolean
  estilosEntregaveisEm: (edicaoId: EdicaoId) => Estilo[]
}>()

const emit = defineEmits<{ quitar: [edicaoId: EdicaoId, styleId: EstiloId, observation: string] }>()

// Um Membro por vez em modo de registro, para a tabela não virar um formulário só.
const quitando = ref<MembroId | null>(null)

function quitar(edicaoId: EdicaoId, styleId: EstiloId, observation: string): void {
  emit('quitar', edicaoId, styleId, observation)
  quitando.value = null
}
</script>

<template>
  <p class="nota">
    A Pendência é uma quantidade, não um Estilo: o Estilo de cada Entrega só é escolhido no ato de registrá-la. Entregas
    atrasadas continuam valendo, mesmo com a Edição já encerrada.
  </p>
  <p v-if="!pendencias.length" class="vazio">Ninguém deve Entregas. Confraria em dia.</p>
  <table v-else class="pendencias">
    <thead>
      <tr>
        <th scope="col">Membro</th>
        <th scope="col">Edições</th>
        <th scope="col" class="numero">Deve</th>
        <th scope="col"><span class="oculto">Ações</span></th>
      </tr>
    </thead>
    <tbody>
      <template v-for="devedor in pendencias" :key="devedor.membroId">
        <tr>
          <td>{{ nomeDe(devedor.membroId) }}</td>
          <td class="edicoes">
            <ul>
              <li v-for="linha in devedor.porEdicao" :key="linha.edicaoId">
                {{ rotuloDe(linha.edicaoId) }}
                <span class="quantidade">×{{ linha.quantidade }}</span>
              </li>
            </ul>
          </td>
          <td class="numero">{{ devedor.total }}</td>
          <td class="acao">
            <button
              v-if="ehMinha(devedor.membroId)"
              type="button"
              class="botao-link"
              @click="quitando = quitando === devedor.membroId ? null : devedor.membroId"
            >
              {{ quitando === devedor.membroId ? 'Cancelar' : 'Registrar Entrega' }}
            </button>
          </td>
        </tr>
        <tr v-if="quitando === devedor.membroId">
          <td colspan="4">
            <QuitacaoDePendencia
              :devidas="devedor.porEdicao"
              :rotulo-de="rotuloDe"
              :estilos-entregaveis-em="estilosEntregaveisEm"
              @quitar="quitar"
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
.edicoes ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.85rem;
  opacity: 0.8;
}
.quantidade {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  opacity: 0.9;
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
