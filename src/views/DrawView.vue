<template>
  <div class="draw">
    <h1>Sorteio de Estilos</h1>
    <p>Data de entrega: <strong>{{ store.currentDraw.deadline }}</strong></p>
    
    <!-- FASE 1: DEFINIÇÃO DO POOL -->
    <div v-if="store.currentDraw.phase === 'POOL_DEFINITION'" class="phase-container">
      <div class="status-bar">
        <h2>Fase 1: Definição do Pool ({{ store.currentDraw.poolSelections.length }}/{{ store.PARTICIPANTS_COUNT }})</h2>
        <p>Cada participante deve escolher um estilo único para o sorteio.</p>
      </div>

      <div class="selection-container">
        <div class="available-styles">
          <h2>Estilos BJCP</h2>
          <ul>
            <li v-for="style in store.availableStyles" :key="style.id">
              <span>{{ style.id }} - {{ style.name }}</span>
              <button @click="confirmPoolSelection(style.id)" class="btn-select">
                Escolher para o Pool
              </button>
            </li>
          </ul>
        </div>
        
        <div class="my-status">
          <h2>Estilos já no Pool</h2>
          <ul>
            <li v-for="selection in store.currentDraw.poolSelections" :key="selection.userId">
              <strong>{{ selection.userId }}:</strong> {{ getStyleName(selection.styleId) }}
            </li>
          </ul>
          
          <div v-if="store.currentDraw.poolSelections.length < store.PARTICIPANTS_COUNT" class="debug-box">
            <p><small>Apenas para teste (Debug):</small></p>
            <button @click="mockCompletePool" style="font-size: 0.8rem;">Simular Sorteio Completo</button>
          </div>
        </div>
      </div>
    </div>

    <!-- FASE 2: SELEÇÃO INDIVIDUAL E ENTREGAS -->
    <div v-else class="phase-container">
      
      <!-- DASHBOARD GERAL -->
      <section class="global-dashboard">
        <h2>📊 Painel Geral de Entregas</h2>
        <div class="dashboard-grid">
          <div v-for="userId in store.participants" :key="userId" class="user-row">
            <div class="user-info">
              <strong>{{ userId }}</strong>
            </div>
            <div class="user-beers">
              <div v-for="i in 3" :key="i" class="beer-slot">
                <template v-if="getUserSelection(userId)?.styles[i-1]">
                  <span class="beer-name" :title="getUserSelection(userId)?.styles[i-1].styleId">
                    {{ getStyleName(getUserSelection(userId)!.styles[i-1].styleId) }}
                  </span>
                  <span v-if="getUserSelection(userId)?.styles[i-1].delivered" class="badge delivered">Entregue</span>
                  <span v-else class="badge pending">Pendente</span>
                </template>
                <template v-else>
                  <span class="empty-slot">Vazio</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr class="separator">

      <!-- GERENCIAMENTO INDIVIDUAL -->
      <section class="personal-area">
        <div class="status-bar green">
          <h2>🍺 Minhas Escolhas e Entregas ({{ userFinalSelection?.styles.length || 0 }}/3)</h2>
          <p>Escolha seus estilos e confirme a entrega conforme for produzindo.</p>
        </div>

        <div class="personal-grid">
          <!-- Meus Estilos e Entregas -->
          <div class="my-deliveries">
            <h3>Minha Produção</h3>
            <div v-if="!userFinalSelection || userFinalSelection.styles.length === 0" class="empty-msg">
              Você ainda não selecionou nenhum estilo.
            </div>
            <div class="delivery-list">
              <div v-for="item in userFinalSelection?.styles" :key="item.styleId" class="delivery-card" :class="{ 'delivered': item.delivered }">
                <div class="card-header">
                  <h4>{{ getStyleName(item.styleId) }}</h4>
                  <button v-if="!item.delivered" @click="handleRemoveStyle(item.styleId)" class="btn-text-red">Remover</button>
                </div>
                
                <div v-if="!item.delivered" class="delivery-form">
                  <textarea v-model="deliveryObservations[item.styleId]" placeholder="Onde foi entregue?"></textarea>
                  <button @click="handleConfirmDelivery(item.styleId)" class="btn-delivery">
                    Confirmar Entrega
                  </button>
                </div>
                
                <div v-else class="delivery-info">
                  <p class="status-tag">Entregue ✅</p>
                  <p v-if="item.observation"><strong>Obs:</strong> {{ item.observation }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Pool para Escolher -->
          <div v-if="(userFinalSelection?.styles.length || 0) < 3" class="pool-selection">
            <h3>Adicionar Estilo</h3>
            <div class="pool-list">
              <div v-for="style in store.stylePool" :key="style.id" class="pool-item">
                <div class="style-details">
                  <span>{{ style.id }} - {{ style.name }}</span>
                  <small>Sorteado por: {{ getParticipantByStyle(style.id) }}</small>
                </div>
                <button 
                  @click="handleAddStyle(style.id)" 
                  :disabled="isStyleAlreadyPicked(style.id)"
                  class="btn-add"
                >
                  {{ isStyleAlreadyPicked(style.id) ? 'Já Escolhido' : 'Escolher' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBreweryStore } from '../stores/brewery'

const store = useBreweryStore()
const deliveryObservations = ref<Record<string, string>>({})

// Mock current user
const currentUserId = 'user-bruno'

const getStyleName = (id: string) => {
  return store.styles.find(s => s.id === id)?.name || id
}

const getParticipantByStyle = (styleId: string) => {
  return store.currentDraw.poolSelections.find(s => s.styleId === styleId)?.userId || 'Desconhecido'
}

const getUserSelection = (userId: string) => {
  return store.currentDraw.finalSelections.find(s => s.userId === userId)
}

const userFinalSelection = computed(() => getUserSelection(currentUserId))

const isStyleAlreadyPicked = (styleId: string) => {
  return userFinalSelection.value?.styles.some(s => s.styleId === styleId) || false
}

const confirmPoolSelection = (styleId: string) => {
  const result = store.selectPoolStyle(currentUserId, styleId)
  if (result.success) {
    alert('Estilo adicionado ao pool com sucesso!')
  } else {
    alert(result.message)
  }
}

const handleAddStyle = (styleId: string) => {
  const result = store.addFinalStyle(currentUserId, styleId)
  if (!result.success) alert(result.message)
}

const handleRemoveStyle = (styleId: string) => {
  const result = store.removeFinalStyle(currentUserId, styleId)
  if (!result.success) alert(result.message)
}

const handleConfirmDelivery = (styleId: string) => {
  const obs = deliveryObservations.value[styleId] || ''
  const result = store.confirmDelivery(currentUserId, styleId, obs)
  if (result.success) {
    alert('Entrega confirmada!')
  } else {
    alert(result.message)
  }
}

// Função de Debug
const mockCompletePool = () => {
  const mockUsers = ['user-alex', 'user-caio', 'user-dani', 'user-elias', 'user-fabio', 'user-gabi', 'user-hugo']
  mockUsers.forEach((userId, index) => {
    const styleId = store.styles[index].id
    store.selectPoolStyle(userId, styleId)
  })
}
</script>

<style scoped>
.draw {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1rem;
}
.status-bar {
  background: #f4f4f4;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}
.status-bar.green {
  background: #e8f5e9;
  border-left: 5px solid #4caf50;
}
.selection-container {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 2rem;
}
ul {
  list-style: none;
  padding: 0;
}
li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
}
.btn-select, .btn-add {
  padding: 0.5rem 1rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-add:disabled {
  background-color: #ccc;
}
.btn-confirm {
  margin-top: 1rem;
  padding: 1rem 2rem;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  font-weight: bold;
}
.available-styles {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #eee;
  padding: 1rem;
  border-radius: 8px;
}
.debug-box {
  margin-top: 2rem; 
  padding: 1rem; 
  border: 1px dashed #ccc;
}

/* Dashboard Styles */
.global-dashboard {
  margin-bottom: 3rem;
  background: #fff;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}
.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}
.user-row {
  display: grid;
  grid-template-columns: 150px 1fr;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
}
.user-beers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.beer-slot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9f9f9;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
}
.empty-slot {
  color: #ccc;
  font-style: italic;
}
.badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  text-transform: uppercase;
}
.badge.delivered { background: #4caf50; color: white; }
.badge.pending { background: #ff9800; color: white; }

.separator {
  margin: 3rem 0;
  border: 0;
  border-top: 1px solid #eee;
}

/* Personal Area */
.personal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}
.delivery-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.delivery-card {
  border: 1px solid #ddd;
  padding: 1rem;
  border-radius: 8px;
}
.delivery-card.delivered { border-color: #4caf50; background: #f1f8e9; }
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.delivery-form textarea {
  width: 100%;
  height: 60px;
  margin-bottom: 0.5rem;
}
.btn-delivery {
  width: 100%;
  padding: 0.5rem;
  background: #2c3e50;
  color: white;
  border: none;
  cursor: pointer;
}
.btn-text-red {
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 0.8rem;
}

.pool-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.pool-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 6px;
}
.style-details {
  display: flex;
  flex-direction: column;
}
.style-details small { color: #888; }
.empty-msg { color: #888; font-style: italic; }
</style>
