import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Card } from '../types'

export const useSentenceStore = defineStore('sentence', () => {
  const items = ref<Card[]>([])

  const isEmpty = computed(() => items.value.length === 0)

  // Texto a ser falado: junta `speech ?? label` de cada card com espaço
  const text = computed(() =>
    items.value
      .map((card) => (card.speech ?? card.label).trim())
      .filter((part) => part !== '')
      .join(' '),
  )

  function add(card: Card) {
    items.value.push(card)
  }

  function removeLast() {
    items.value.pop()
  }

  function clear() {
    items.value = []
  }

  return { items, isEmpty, text, add, removeLast, clear }
})
