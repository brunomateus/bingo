import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import bjcpStyles from '../assets/data/bjcp_styles.json'

export type DrawPhase = 'POOL_DEFINITION' | 'SELECTION'

interface SelectionItem {
  styleId: string
  delivered: boolean
  observation?: string
  deliveredAt?: string
}

interface UserFinalSelection {
  userId: string
  styles: SelectionItem[]
}

export const useBreweryStore = defineStore('brewery', () => {
  const styles = ref(bjcpStyles)
  const PARTICIPANTS_COUNT = 8

  const currentDraw = ref({
    id: 'draw-001',
    deadline: '2026-07-12',
    phase: 'POOL_DEFINITION' as DrawPhase,
    poolSelections: [] as { userId: string, styleId: string }[],
    finalSelections: [] as UserFinalSelection[]
  })

  // Estilos escolhidos na Fase 1 que formam o pool para a Fase 2
  const stylePool = computed(() => {
    const poolIds = currentDraw.value.poolSelections.map(s => s.styleId)
    return styles.value.filter(style => poolIds.includes(style.id))
  })

  // Estilos disponíveis para escolha (BJCP na fase 1, Pool na fase 2)
  const availableStyles = computed(() => {
    if (currentDraw.value.phase === 'POOL_DEFINITION') {
      const selectedStyleIds = currentDraw.value.poolSelections.map(s => s.styleId)
      return styles.value.filter(style => !selectedStyleIds.includes(style.id))
    } else {
      return stylePool.value
    }
  })

  // Retorna todos os participantes (baseado em quem entrou no pool)
  const participants = computed(() => {
    return currentDraw.value.poolSelections.map(s => s.userId)
  })

  function selectPoolStyle(userId: string, styleId: string) {
    if (currentDraw.value.phase !== 'POOL_DEFINITION') {
      return { success: false, message: 'Fase de definição de pool já encerrada.' }
    }

    const alreadySelected = currentDraw.value.poolSelections.some(s => s.styleId === styleId)
    if (alreadySelected) {
      return { success: false, message: 'Este estilo já foi selecionado por outro participante.' }
    }

    const userSelectionIndex = currentDraw.value.poolSelections.findIndex(s => s.userId === userId)
    if (userSelectionIndex > -1) {
      currentDraw.value.poolSelections[userSelectionIndex].styleId = styleId
    } else {
      currentDraw.value.poolSelections.push({ userId, styleId })
    }

    if (currentDraw.value.poolSelections.length === PARTICIPANTS_COUNT) {
      currentDraw.value.phase = 'SELECTION'
    }

    return { success: true }
  }

  // Adiciona UM estilo à seleção final (Fase 2)
  function addFinalStyle(userId: string, styleId: string) {
    if (currentDraw.value.phase !== 'SELECTION') {
      return { success: false, message: 'Aguardando a conclusão do sorteio (pool).' }
    }

    let userSelection = currentDraw.value.finalSelections.find(s => s.userId === userId)
    if (!userSelection) {
      userSelection = { userId, styles: [] }
      currentDraw.value.finalSelections.push(userSelection)
    }

    if (userSelection.styles.length >= 3) {
      return { success: false, message: 'Você já selecionou o limite de 3 estilos.' }
    }

    if (userSelection.styles.some(s => s.styleId === styleId)) {
      return { success: false, message: 'Você já selecionou este estilo.' }
    }

    userSelection.styles.push({
      styleId,
      delivered: false
    })

    return { success: true }
  }

  function removeFinalStyle(userId: string, styleId: string) {
    const userSelection = currentDraw.value.finalSelections.find(s => s.userId === userId)
    if (!userSelection) return { success: false }

    const index = userSelection.styles.findIndex(s => s.styleId === styleId)
    if (index > -1) {
      if (userSelection.styles[index].delivered) {
        return { success: false, message: 'Não é possível remover um estilo já entregue.' }
      }
      userSelection.styles.splice(index, 1)
      return { success: true }
    }
    return { success: false }
  }

  function confirmDelivery(userId: string, styleId: string, observation: string) {
    const userSelection = currentDraw.value.finalSelections.find(s => s.userId === userId)
    if (!userSelection) return { success: false, message: 'Seleção não encontrada.' }

    const styleSelection = userSelection.styles.find(s => s.styleId === styleId)
    if (!styleSelection) return { success: false, message: 'Estilo não encontrado na sua seleção.' }

    styleSelection.delivered = true
    styleSelection.observation = observation
    styleSelection.deliveredAt = new Date().toISOString()

    return { success: true }
  }

  return { 
    styles, 
    currentDraw, 
    stylePool, 
    availableStyles, 
    participants,
    selectPoolStyle, 
    addFinalStyle,
    removeFinalStyle,
    confirmDelivery,
    PARTICIPANTS_COUNT 
  }
})
