import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Board, Card, Category } from '../types'
import pictogramasMap from '../data/pictogramas-map.json'
import vocabularioInicial from '../data/vocabulario-inicial.json'
import { randomId } from '../ids'

export const QUICK_PHRASES_ID = 'frases-rapidas'

function applyPictogramMap(board: Board, map: Record<string, number>): Board {
  for (const item of [...Object.values(board.cards), ...board.categories]) {
    const pictogramId = map[item.id]
    if (item.picto.kind === 'none' && pictogramId !== undefined) {
      item.picto = { kind: 'arasaac', id: pictogramId }
    }
  }
  return board
}

export function createInitialBoard(): Board {
  return applyPictogramMap(structuredClone(vocabularioInicial) as Board, pictogramasMap)
}

function moveInList<T>(list: T[], index: number, delta: number): boolean {
  const target = index + delta
  if (index < 0 || target < 0 || target >= list.length) return false
  const [item] = list.splice(index, 1) as [T]
  list.splice(target, 0, item)
  return true
}

export type NewCard = Omit<Card, 'id'>

export const useBoardStore = defineStore('board', () => {
  const board = ref<Board>(createInitialBoard())
  const activeCategoryId = ref<string | null>(board.value.categories[0]?.id ?? null)

  const activeCategory = computed(
    () =>
      board.value.categories.find((category) => category.id === activeCategoryId.value) ??
      board.value.categories[0] ??
      null,
  )

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

  function containerCardIds(containerId: string): string[] | undefined {
    if (containerId === QUICK_PHRASES_ID) return board.value.quickPhraseIds
    return board.value.categories.find((category) => category.id === containerId)?.cardIds
  }

  function cardsOf(containerId: string): Card[] {
    return (containerCardIds(containerId) ?? [])
      .map((id) => board.value.cards[id])
      .filter((card): card is Card => card !== undefined)
  }

  function containerOf(cardId: string): string | undefined {
    if (board.value.quickPhraseIds.includes(cardId)) return QUICK_PHRASES_ID
    return board.value.categories.find((category) => category.cardIds.includes(cardId))?.id
  }

  function isReferenced(cardId: string): boolean {
    return (
      board.value.quickPhraseIds.includes(cardId) ||
      board.value.categories.some((category) => category.cardIds.includes(cardId))
    )
  }

  function replaceBoard(next: Board) {
    board.value = next
    if (!next.categories.some((category) => category.id === activeCategoryId.value)) {
      activeCategoryId.value = next.categories[0]?.id ?? null
    }
  }

  function addCategory(name: string): Category {
    const category: Category = {
      id: randomId('categoria'),
      name: name.trim(),
      picto: { kind: 'none' },
      cardIds: [],
    }
    board.value.categories.push(category)
    return category
  }

  function renameCategory(id: string, name: string) {
    const category = board.value.categories.find((item) => item.id === id)
    if (category && name.trim() !== '') category.name = name.trim()
  }

  function deleteCategory(id: string) {
    const index = board.value.categories.findIndex((category) => category.id === id)
    if (index < 0) return
    const [removed] = board.value.categories.splice(index, 1) as [Category]
    for (const cardId of removed.cardIds) {
      if (!isReferenced(cardId)) delete board.value.cards[cardId]
    }
    if (activeCategoryId.value === id) activeCategoryId.value = board.value.categories[0]?.id ?? null
  }

  function moveCategory(id: string, delta: number): boolean {
    const index = board.value.categories.findIndex((category) => category.id === id)
    return moveInList(board.value.categories, index, delta)
  }

  function addCard(containerId: string, data: NewCard): Card {
    const card: Card = { ...data, id: randomId('card') }
    board.value.cards[card.id] = card
    containerCardIds(containerId)?.push(card.id)
    return card
  }

  function updateCard(id: string, patch: Partial<NewCard>) {
    const card = board.value.cards[id]
    if (card) Object.assign(card, patch)
  }

  function deleteCard(id: string) {
    for (const ids of [board.value.quickPhraseIds, ...board.value.categories.map((c) => c.cardIds)]) {
      const index = ids.indexOf(id)
      if (index >= 0) ids.splice(index, 1)
    }
    delete board.value.cards[id]
  }

  function moveCardTo(cardId: string, fromId: string, toId: string) {
    const from = containerCardIds(fromId)
    const to = containerCardIds(toId)
    if (!from || !to || fromId === toId) return
    const index = from.indexOf(cardId)
    if (index >= 0) from.splice(index, 1)
    if (!to.includes(cardId)) to.push(cardId)
  }

  function moveCardWithin(containerId: string, cardId: string, delta: number): boolean {
    const ids = containerCardIds(containerId)
    return ids ? moveInList(ids, ids.indexOf(cardId), delta) : false
  }

  return {
    board,
    activeCategoryId,
    activeCategory,
    quickPhrases,
    activeCards,
    selectCategory,
    cardsOf,
    containerOf,
    replaceBoard,
    addCategory,
    renameCategory,
    deleteCategory,
    moveCategory,
    addCard,
    updateCard,
    deleteCard,
    moveCardTo,
    moveCardWithin,
  }
})
