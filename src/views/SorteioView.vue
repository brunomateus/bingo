<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { usarContexto } from '../app/contexto-do-app'
import EscolhaDeEstilo from '../componentes/EscolhaDeEstilo.vue'
import GradeDeParticipantes from '../componentes/GradeDeParticipantes.vue'
import PainelDaEdicao from '../componentes/PainelDaEdicao.vue'
import PainelDeAvancoForcado from '../componentes/PainelDeAvancoForcado.vue'
import RegistroDeEntrega from '../componentes/RegistroDeEntrega.vue'
import StepperDeFases from '../componentes/StepperDeFases.vue'
import { usarEdicaoAtual } from '../componentes/usar-edicao-atual'
import type { EstiloId } from '../domain/estilo'
import type { MembroId } from '../domain/membro'

const { sessao, consultaDaEdicaoAtual, cicloDaEdicao, sorteioDoPool, registroDeEntregas } = usarContexto()
const atual = usarEdicaoAtual(consultaDaEdicaoAtual, cicloDaEdicao, sorteioDoPool, registroDeEntregas, sessao.membro)

const forcandoAvanco = ref(false)

onMounted(atual.recarregar)

async function confirmarAvanco(escolhas: Record<MembroId, EstiloId>): Promise<void> {
  await atual.forcarAvanco(escolhas)
  forcandoAvanco.value = false
}
</script>

<template>
  <div class="sorteio">
    <StepperDeFases v-if="atual.fase.value" :fase="atual.fase.value" />
    <p v-if="atual.erro.value" class="erro" role="alert">{{ atual.erro.value }}</p>

    <div class="layout">
      <PainelDaEdicao
        :edicao="atual.edicao.value"
        :sou-organizador="sessao.ehOrganizador.value"
        :tem-pendentes="atual.pendentes.value.length > 0"
        @abrir="atual.abrir"
        @estender-prazo="atual.estenderPrazo"
        @forcar-avanco="forcandoAvanco = true"
        @fechar="atual.fechar"
      />

      <main class="conteudo">
        <p v-if="atual.carregando.value" class="aviso">Carregando a Edição…</p>
        <p v-else-if="!atual.edicao.value" class="aviso">
          Nenhuma Edição em curso. Quando um Organizador abrir a próxima, os participantes aparecem aqui.
        </p>

        <template v-else>
          <PainelDeAvancoForcado
            v-if="forcandoAvanco"
            :pendentes="atual.pendentes.value"
            :estilos-livres="atual.estilosLivres.value"
            :nome-de="atual.nomeDe"
            @confirmar="confirmarAvanco"
            @cancelar="forcandoAvanco = false"
          />

          <EscolhaDeEstilo
            v-if="atual.souPendente.value"
            :estilos-livres="atual.estilosLivres.value"
            @reivindicar="atual.reivindicar"
          />

          <RegistroDeEntrega
            v-if="atual.fase.value !== 'pool' && atual.minhaPendencia.value > 0"
            :estilos-entregaveis="atual.meusEstilosEntregaveis.value"
            :pendencia="atual.minhaPendencia.value"
            @registrar="atual.registrarEntrega"
          />

          <GradeDeParticipantes
            :participantes="atual.edicao.value.participantes"
            :fase="atual.fase.value!"
            :meta-entregas="atual.edicao.value.metaEntregas"
            :nome-de="atual.nomeDe"
            :estilo-de="atual.estiloDe"
            :entregas-feitas-por="atual.entregasFeitasPor"
          />
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
.sorteio {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}
.conteudo {
  flex: 1;
}
.aviso {
  color: var(--text);
  opacity: 0.75;
  margin-top: 0;
}
.erro {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: rgba(192, 57, 43, 0.08);
  border: 1px solid rgba(192, 57, 43, 0.3);
  color: #c0392b;
}
</style>
