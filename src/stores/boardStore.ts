import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Board, Card } from '../types'
import vocabularioInicial from '../data/vocabulario-inicial.json'

// Cópia profunda do vocabulário inicial, para que alterações na prancha não modifiquem o JSON importado
export function createInitialBoard(): Board {
  return structuredClone(vocabularioInicial) as Board
}

export const useBoardStore = defineStore('board', () => {
  const board = ref<Board>(createInitialBoard())
  const activeCategoryId = ref<string | null>(board.value.categories[0]?.id ?? null)

  const activeCategory = computed(
    () =>
      board.value.categories.find((category) => category.id === activeCategoryId.value) ??
      board.value.categories[0] ??
      null,
  )

  // Converte ids em cards, ignorando ids inexistentes e cards ocultos
  function resolveCards(ids: string[]): Card[] {
    return ids
      .map((id) => board.value.cards[id])
      .filter((card): card is Card => card !== undefined && !card.hidden)
  }

  const quickPhrases = computed(() => resolveCards(board.value.quickPhraseIds))
  const activeCards = computed(() =>
    activeCategory.value ? resolveCards(activeCategory.value.cardIds) : [],
  )

  function selectCategory(id: string) {
    if (board.value.categories.some((category) => category.id === id)) {
      activeCategoryId.value = id
    }
  }

  return { board, activeCategoryId, activeCategory, quickPhrases, activeCards, selectCategory }
})
