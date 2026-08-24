<script setup lang="ts">
import { onMounted } from 'vue'
import { usarContexto } from '../app/contexto-do-app'
import CardDeMembro from '../componentes/CardDeMembro.vue'
import CardNovoMembro from '../componentes/CardNovoMembro.vue'
import { usarListaDeMembros } from '../componentes/usar-lista-de-membros'

const { gestaoDeMembros } = usarContexto()
const lista = usarListaDeMembros(gestaoDeMembros)

onMounted(lista.recarregar)
</script>

<template>
  <div class="membros">
    <h1>Membros</h1>
    <p v-if="lista.erro.value" class="erro" role="alert">{{ lista.erro.value }}</p>
    <p v-if="lista.carregando.value" class="carregando">Carregando membros…</p>

    <section>
      <h2 class="titulo-secao">Ativos ({{ lista.ativos.value.length }})</h2>
      <div class="grade">
        <CardDeMembro
          v-for="membro in lista.ativos.value"
          :key="membro.id"
          :membro="membro"
          :motivo-de-protecao="lista.motivoDeProtecao(membro.id)"
          @alternar-papel="lista.alternarPapel"
          @desativar="(m) => lista.desativar(m.id)"
        />
        <CardNovoMembro @cadastrar="lista.cadastrar" />
      </div>
    </section>

    <section v-if="lista.inativos.value.length">
      <h2 class="titulo-secao">Inativos ({{ lista.inativos.value.length }})</h2>
      <div class="grade">
        <CardDeMembro
          v-for="membro in lista.inativos.value"
          :key="membro.id"
          :membro="membro"
          :motivo-de-protecao="null"
          @reativar="(m) => lista.reativar(m.id)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.membros {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
.titulo-secao {
  margin-bottom: 1rem;
  font-size: 1.2rem;
}
.grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}
.carregando {
  margin: 0;
  color: var(--text);
  opacity: 0.8;
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
