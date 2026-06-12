<template>
  <div class="draw">
    <header class="view-header">
      <h2>📅 Sorteio Atual</h2>
      <p>Data Limite: <strong>{{ store.currentDraw.deadline }}</strong></p>
    </header>
    
    <!-- FASE 1: DEFINIÇÃO DO POOL -->
    <div v-if="store.currentDraw.phase === 'POOL_DEFINITION'" class="phase-container">
      <div class="status-bar amber-gradient">
        <h2>Fase 1: Definição do Pool ({{ store.currentDraw.poolSelections.length }}/{{ store.PARTICIPANTS_COUNT }})</h2>
        <p>Cada confrade deve escolher um estilo BJCP único para compor o sorteio.</p>
      </div>

      <div class="selection-container">
        <div class="available-styles card-panel">
          <h3>Estilos Disponíveis</h3>
          <ul class="style-list">
            <li v-for="style in store.availableStyles" :key="style.id" class="style-item">
              <div class="style-text">
                <span class="style-id">{{ style.id }}</span>
                <span class="style-name">{{ style.name }}</span>
              </div>
              <button @click="confirmPoolSelection(style.id)" class="btn-primary">
                Escolher para o Pool
              </button>
            </li>
          </ul>
        </div>
        
        <div class="my-status card-panel">
          <h3>Estilos no Pool</h3>
          <ul class="pool-summary">
            <li v-for="selection in store.currentDraw.poolSelections" :key="selection.userId" class="summary-item">
              <strong>{{ selection.userId }}</strong>
              <span>{{ getStyleName(selection.styleId) }}</span>
            </li>
          </ul>
          
          <div v-if="store.currentDraw.poolSelections.length < store.PARTICIPANTS_COUNT" class="debug-box">
            <p><small>Ambiente de Teste:</small></p>
            <button @click="mockCompletePool" class="btn-secondary">Simular Sorteio Completo</button>
          </div>
        </div>
      </div>
    </div>

    <!-- FASE 2: SELEÇÃO INDIVIDUAL E ENTREGAS -->
    <div v-else class="phase-container">
      
      <!-- DASHBOARD GERAL -->
      <section class="global-dashboard card-panel">
        <h2 class="section-title">📊 Painel Geral de Entregas</h2>
        <div class="dashboard-grid">
          <div v-for="userId in store.participants" :key="userId" class="user-row">
            <div class="user-info">
              <strong>{{ userId }}</strong>
            </div>
            <div class="user-beers">
              <div v-for="i in 3" :key="i" class="beer-slot">
                <template v-if="getUserSelection(userId)?.styles[i-1]">
                  <span class="beer-name-small" :title="getUserSelection(userId)?.styles[i-1].styleId">
                    {{ getStyleName(getUserSelection(userId)!.styles[i-1].styleId) }}
                  </span>
                  <span v-if="getUserSelection(userId)?.styles[i-1].delivered" class="badge-mini delivered">Entregue</span>
                  <span v-else class="badge-mini pending">Pendente</span>
                </template>
                <template v-else>
                  <span class="empty-slot">Vazio</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="personal-area">
        <div class="status-bar green-gradient">
          <h2>🍺 Minhas Escolhas e Entregas ({{ userFinalSelection?.styles.length || 0 }}/3)</h2>
          <p>Selecione seus estilos e registre cada entrega individualmente.</p>
        </div>

        <div class="personal-grid">
          <!-- Meus Estilos e Entregas -->
          <div class="my-deliveries">
            <h3>Minha Produção</h3>
            <div v-if="!userFinalSelection || userFinalSelection.styles.length === 0" class="empty-msg">
              Nenhum estilo selecionado para produção.
            </div>
            <div class="delivery-list">
              <div v-for="item in userFinalSelection?.styles" :key="item.styleId" class="delivery-card" :class="{ 'card-delivered': item.delivered }">
                <div class="card-header">
                  <h4>{{ getStyleName(item.styleId) }}</h4>
                  <button v-if="!item.delivered" @click="handleRemoveStyle(item.styleId)" class="btn-text-red">Desistir</button>
                </div>
                
                <div v-if="!item.delivered" class="delivery-form">
                  <textarea v-model="deliveryObservations[item.styleId]" placeholder="Onde foi entregue?"></textarea>
                  <button @click="handleConfirmDelivery(item.styleId)" class="btn-confirm-delivery">
                    Confirmar Entrega
                  </button>
                </div>
                
                <div v-else class="delivery-info">
                  <p class="delivery-status">Entregue ✅</p>
                  <p v-if="item.observation" class="delivery-obs"><strong>Local:</strong> {{ item.observation }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Pool para Escolher -->
          <div v-if="(userFinalSelection?.styles.length || 0) < 3" class="pool-selection card-panel">
            <h3>Adicionar Estilo ao Plano</h3>
            <div class="pool-list">
              <div v-for="style in store.stylePool" :key="style.id" class="pool-item">
                <div class="style-details">
                  <span class="pool-style-name">{{ style.name }}</span>
                  <small>Sorteado por: <strong>{{ getParticipantByStyle(style.id) }}</strong></small>
                </div>
                <button 
                  @click="handleAddStyle(style.id)" 
                  :disabled="isStyleAlreadyPicked(style.id)"
                  class="btn-primary-small"
                >
                  {{ isStyleAlreadyPicked(style.id) ? 'Já está na sua lista' : 'Produzir este' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.view-header {
  border-bottom: 2px solid var(--border);
  padding-bottom: 1rem;
}

.view-header h2 {
  margin: 0;
  color: var(--stout);
}

.card-panel {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.status-bar {
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  color: white;
}

.amber-gradient {
  background: linear-gradient(135deg, var(--amber) 0%, #b36b00 100%);
}

.green-gradient {
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
}

.status-bar h2 { color: white; margin-bottom: 0.5rem; }
.status-bar p { margin: 0; opacity: 0.9; }

.selection-container {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 2rem;
}

.style-list {
  list-style: none;
  padding: 0;
  max-height: 500px;
  overflow-y: auto;
}

.style-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--bg);
}

.style-text { display: flex; align-items: center; gap: 1rem; }
.style-id { font-weight: 900; color: var(--amber); width: 30px; }

.btn-primary {
  background: var(--stout);
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-weight: 600;
}

.btn-primary:hover { background: var(--amber); }

.pool-summary { list-style: none; padding: 0; }
.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 0;
  border-bottom: 1px dashed var(--border);
}

/* Dashboard */
.global-dashboard { margin-bottom: 2rem; }
.section-title { margin-bottom: 1.5rem; font-size: 1.4rem; }

.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  padding: 0.8rem;
  background: var(--bg);
  border-radius: 8px;
  align-items: center;
}

.user-beers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.beer-slot {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0.8rem;
  background: white;
  border-radius: 6px;
  font-size: 0.85rem;
  border: 1px solid var(--border);
}

.badge-mini {
  font-size: 0.65rem;
  padding: 1px 5px;
  border-radius: 4px;
  color: white;
}
.delivered { background: #27ae60; }
.pending { background: #f39c12; }

/* Personal Area */
.personal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.delivery-card {
  background: white;
  border: 2px solid var(--border);
  padding: 1.2rem;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.card-delivered { border-color: #2ecc71; background: #f0fff4; }

.delivery-status {
  font-weight: 800;
  color: #27ae60;
  margin-bottom: 0.5rem;
}

.delivery-form textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.6rem;
  margin: 0.8rem 0;
  font-family: inherit;
}

.btn-confirm-delivery {
  width: 100%;
  background: var(--stout);
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 6px;
  font-weight: bold;
}

.pool-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--bg);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.pool-style-name { font-weight: 700; display: block; }

.btn-primary-small {
  background: var(--amber);
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

.btn-primary-small:disabled { background: var(--border); }
</style>
