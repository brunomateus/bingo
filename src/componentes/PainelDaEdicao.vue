<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { META_ENTREGAS_PADRAO, type Edicao } from '../domain/edicao'

const props = defineProps<{
  edicao: Edicao | null
  /** Ações de gestão só aparecem para Organizador (SPEC.md §7). */
  souOrganizador: boolean
  temPendentes: boolean
  /** Teto da meta: um Estilo por participante no Pool, sem repetir. */
  maximoDeEntregas: number
}>()

const emit = defineEmits<{
  abrir: [prazo: string, metaEntregas: number]
  estenderPrazo: [prazo: string]
  forcarAvanco: []
  fechar: []
}>()

const prazoDaNova = ref('')
// O padrão 3 não cabe numa confraria com menos de 3 Membros ativos.
const metaSugerida = computed(() => Math.min(META_ENTREGAS_PADRAO, Math.max(props.maximoDeEntregas, 1)))
const metaDaNova = ref(metaSugerida.value)
const editandoPrazo = ref(false)
const prazoEstendido = ref('')

// A contagem de Membros ativos chega depois da montagem, então o campo começa
// com um palpite e se acerta quando ela aparece (ou quando a lista muda).
watch(metaSugerida, (sugestao) => {
  metaDaNova.value = sugestao
})

const metaValida = computed(
  () => Number.isInteger(metaDaNova.value) && metaDaNova.value >= 1 && metaDaNova.value <= props.maximoDeEntregas
)

function abrir(): void {
  emit('abrir', prazoDaNova.value, metaDaNova.value)
  prazoDaNova.value = ''
  metaDaNova.value = metaSugerida.value
}

function salvarPrazo(): void {
  emit('estenderPrazo', prazoEstendido.value)
  editandoPrazo.value = false
  prazoEstendido.value = ''
}

const estaFechada = () => props.edicao !== null && props.edicao.status !== 'aberta'
</script>

<template>
  <aside class="painel">
    <!-- Sem Edição, ou logo após o Fechamento: o formulário de abertura, com os
         dois campos do SPEC.md §3 (prazo e meta de Entregas). -->
    <template v-if="!edicao || estaFechada()">
      <template v-if="estaFechada()">
        <h2>Edição encerrada</h2>
        <p class="resultado" :class="edicao!.status === 'cancelada' ? 'resultado-cancelada' : ''">
          {{
            edicao!.status === 'concluida'
              ? 'Concluída — passa a compor o Histórico.'
              : 'Cancelada — nenhuma atividade registrada, não entra no Histórico.'
          }}
        </p>
        <div class="campo">
          <span class="rotulo">Prazo que estava valendo</span>
          <strong>{{ edicao!.prazo }}</strong>
        </div>
      </template>
      <h2 v-else>Nenhuma Edição aberta</h2>

      <template v-if="souOrganizador">
        <p class="dica">Participantes: snapshot automático dos Membros ativos.</p>
        <div class="campo">
          <label class="rotulo" for="prazo-nova">Prazo</label>
          <input id="prazo-nova" v-model="prazoDaNova" type="date" />
        </div>
        <div class="campo">
          <label class="rotulo" for="meta-nova">Entregas por participante</label>
          <input id="meta-nova" v-model.number="metaDaNova" type="number" min="1" step="1" :max="maximoDeEntregas" />
          <span class="limite" :class="{ 'limite-estourado': !metaValida }">
            Máximo {{ maximoDeEntregas }}: o Pool terá um Estilo por Membro ativo, e ninguém repete Estilo.
          </span>
        </div>
        <button type="button" class="botao-primario" :disabled="!metaValida" @click="abrir">
          {{ estaFechada() ? 'Abrir próxima Edição' : 'Abrir Edição' }}
        </button>
      </template>
      <p v-else class="dica">Aguarde um Organizador abrir a próxima Edição.</p>
    </template>

    <template v-else>
      <h2>Edição aberta</h2>
      <div class="campo">
        <span class="rotulo">Meta de Entregas</span>
        <strong>{{ edicao.metaEntregas }} por participante</strong>
      </div>
      <div class="campo">
        <span class="rotulo">Prazo</span>
        <div v-if="!editandoPrazo" class="prazo">
          <strong>{{ edicao.prazo }}</strong>
          <button v-if="souOrganizador" type="button" class="botao-link" @click="editandoPrazo = true">estender</button>
        </div>
        <div v-else class="prazo-edicao">
          <input v-model="prazoEstendido" type="date" />
          <button type="button" @click="salvarPrazo">Salvar</button>
        </div>
      </div>

      <template v-if="souOrganizador">
        <button type="button" :disabled="!temPendentes" @click="emit('forcarAvanco')">Forçar avanço da Fase 1</button>
        <button type="button" class="botao-perigo" @click="emit('fechar')">Fechar Edição</button>
      </template>
    </template>
  </aside>
</template>

<style scoped>
.painel {
  width: 16rem;
  flex-shrink: 0;
  background: white;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: sticky;
  top: 1rem;
}
.painel h2 {
  font-size: 1.1rem;
  margin: 0;
}
.dica,
.resultado {
  font-size: 0.85rem;
  margin: 0;
}
.resultado-cancelada {
  color: #b3261e;
}
.campo {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.rotulo {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}
.limite {
  font-size: 0.75rem;
  opacity: 0.7;
  line-height: 1.35;
}
.limite-estourado {
  color: #b3261e;
  opacity: 1;
}
.prazo {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.prazo-edicao {
  display: flex;
  gap: 0.4rem;
}
.botao-link {
  border: none;
  background: none;
  color: var(--amber);
  text-decoration: underline;
  padding: 0;
  font-size: 0.8rem;
}
button {
  border: 1px solid var(--border);
  background: white;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-family: inherit;
}
button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.botao-primario {
  background: var(--amber);
  color: white;
  border: none;
  font-weight: 700;
}
.botao-perigo {
  color: #b3261e;
}
input {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font: inherit;
}
</style>
