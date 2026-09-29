<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import type { Card } from '../types'
import CommCard from './CommCard.vue'

const props = defineProps<{
  cards: Card[]
  // Número máximo de colunas; sem valor, entram quantas colunas couberem
  columns?: number
}>()
const emit = defineEmits<{ select: [card: Card] }>()

const listRef = useTemplateRef<HTMLUListElement>('list')

// Roving tabindex: só um card por vez entra na ordem do Tab; as setas movem entre os cards
const activeIndex = ref(0)
const tabbableIndex = computed(() => Math.min(activeIndex.value, props.cards.length - 1))

// Troca de categoria: volta para o primeiro card
watch(
  () => props.cards,
  () => {
    activeIndex.value = 0
  },
)

function cardButtons(): HTMLButtonElement[] {
  return Array.from(listRef.value?.querySelectorAll<HTMLButtonElement>('.comm-card') ?? [])
}

// Lê do layout o número real de colunas: em telas estreitas a grade pode ter menos colunas que o configurado
function currentColumns(): number {
  if (!listRef.value) return 1
  const tracks = getComputedStyle(listRef.value)
    .gridTemplateColumns.split(' ')
    .filter((track) => track !== '' && track !== '0px')
  return Math.max(tracks.length, 1)
}

function focusCard(index: number) {
  activeIndex.value = index
  cardButtons()[index]?.focus()
}

function onFocusIn(event: FocusEvent) {
  const index = cardButtons().indexOf(event.target as HTMLButtonElement)
  if (index >= 0) activeIndex.value = index
}

function onKeydown(event: KeyboardEvent) {
  const count = props.cards.length
  if (count === 0) return
  const current = tabbableIndex.value
  const columns = currentColumns()

  let next: number
  switch (event.key) {
    case 'ArrowRight':
      next = Math.min(current + 1, count - 1)
      break
    case 'ArrowLeft':
      next = Math.max(current - 1, 0)
      break
    case 'ArrowDown':
      next = current + columns < count ? current + columns : current
      break
    case 'ArrowUp':
      next = current - columns >= 0 ? current - columns : current
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = count - 1
      break
    default:
      return
  }
  event.preventDefault()
  focusCard(next)
}
</script>

<template>
  <ul
    v-if="cards.length > 0"
    ref="list"
    class="card-grid"
    :class="{ 'card-grid--fixed': columns }"
    :style="columns ? { '--grid-columns': columns } : undefined"
    role="list"
    @keydown="onKeydown"
    @focusin="onFocusIn"
  >
    <li v-for="(card, index) in cards" :key="card.id" class="card-grid__item">
      <CommCard
        :card="card"
        :tabindex="index === tabbableIndex ? 0 : -1"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
  <p v-else class="card-grid__empty">Nenhum card nesta categoria.</p>
</template>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--card-min-size), 1fr));
  gap: var(--gap);
  padding: 0;
  list-style: none;
}

/* Até `--grid-columns` colunas; em telas estreitas, menos colunas para manter o tamanho mínimo do card */
.card-grid--fixed {
  grid-template-columns: repeat(
    auto-fill,
    minmax(
      max(
        var(--card-min-size),
        calc((100% - (var(--grid-columns) - 1) * var(--gap)) / var(--grid-columns))
      ),
      1fr
    )
  );
}

.card-grid__item {
  display: flex;
  min-width: 0;
}

.card-grid__empty {
  padding: var(--space-4);
  color: var(--color-text-muted);
}
</style>
