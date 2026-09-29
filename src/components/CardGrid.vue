<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import type { Card } from '../types'
import CommCard from './CommCard.vue'

const props = defineProps<{
  cards: Card[]
  // Número máximo de colunas; sem valor, até um card por coluna, se couber
  columns?: number
  // Cada linha vira um grupo da varredura (grade principal)
  scanRows?: boolean
}>()
const emit = defineEmits<{ select: [card: Card] }>()

const containerRef = useTemplateRef<HTMLDivElement>('container')
const probeRef = useTemplateRef<HTMLSpanElement>('probe')

// Colunas que cabem na largura atual sem o card ficar menor que --card-min-size.
// O "probe" é um elemento invisível com essa largura, então vale qualquer valor CSS.
const fittingColumns = ref<number | null>(null)

function measure() {
  const container = containerRef.value
  const minWidth = probeRef.value?.offsetWidth ?? 0
  if (!container || minWidth <= 0) return
  // column-gap do container não afeta o layout dele; serve só para o navegador converter --gap em px
  const gap = parseFloat(getComputedStyle(container).columnGap) || 0
  fittingColumns.value = Math.max(1, Math.floor((container.clientWidth + gap) / (minWidth + gap)))
}

let observer: ResizeObserver | undefined
onMounted(() => {
  measure()
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(measure)
  if (containerRef.value) observer.observe(containerRef.value)
  if (probeRef.value) observer.observe(probeRef.value)
})
onBeforeUnmount(() => observer?.disconnect())

const columnCount = computed(() => {
  const limit = props.columns ?? props.cards.length
  return Math.max(1, Math.min(limit, fittingColumns.value ?? limit))
})

const rows = computed(() => {
  const result: Card[][] = []
  for (let i = 0; i < props.cards.length; i += columnCount.value) {
    result.push(props.cards.slice(i, i + columnCount.value))
  }
  return result
})

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
  return Array.from(containerRef.value?.querySelectorAll<HTMLButtonElement>('.comm-card') ?? [])
}

function focusCard(index: number) {
  activeIndex.value = index
  cardButtons()[index]?.focus()
}

function onFocusIn(event: FocusEvent) {
  const index = cardButtons().indexOf(event.target as HTMLButtonElement)
  if (index >= 0) activeIndex.value = index
}

// Teclado no padrão ARIA de grade: setas, Home/End na linha, Ctrl+Home/End na grade toda
function onKeydown(event: KeyboardEvent) {
  const count = props.cards.length
  if (count === 0) return
  const current = tabbableIndex.value
  const columns = columnCount.value
  const rowStart = current - (current % columns)

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
      next = event.ctrlKey ? 0 : rowStart
      break
    case 'End':
      next = event.ctrlKey ? count - 1 : Math.min(rowStart + columns, count) - 1
      break
    default:
      return
  }
  event.preventDefault()
  focusCard(next)
}

// Atributos de grupo da varredura para a linha `index` (só na grade principal)
function rowScanAttrs(index: number) {
  if (!props.scanRows) return {}
  const label = `Linha ${index + 1}`
  return { 'data-scan-group': `linha-${index + 1}`, 'data-scan-label': label, tabindex: -1 }
}
</script>

<template>
  <div ref="container" class="card-grid">
    <span ref="probe" class="card-grid__probe" aria-hidden="true" />
    <div
      v-if="cards.length > 0"
      role="grid"
      class="card-grid__grid"
      :style="{ '--columns': columnCount }"
      @keydown="onKeydown"
      @focusin="onFocusIn"
    >
      <div
        v-for="(row, rowIndex) in rows"
        :key="rowIndex"
        role="row"
        class="card-grid__row"
        v-bind="rowScanAttrs(rowIndex)"
      >
        <div
          v-for="(card, columnIndex) in row"
          :key="card.id"
          role="gridcell"
          class="card-grid__cell"
        >
          <CommCard
            :card="card"
            :tabindex="rowIndex * columnCount + columnIndex === tabbableIndex ? 0 : -1"
            :data-scan-item="`card:${card.id}`"
            @select="emit('select', $event)"
          />
        </div>
      </div>
    </div>
    <p v-else class="card-grid__empty">Nenhum card nesta categoria.</p>
  </div>
</template>

<style scoped>
.card-grid {
  position: relative;
  column-gap: var(--gap);
}

.card-grid__probe {
  position: absolute;
  width: var(--card-min-size);
  height: 0;
  visibility: hidden;
  pointer-events: none;
}

.card-grid__grid {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

/* Todas as linhas usam o mesmo número de colunas, então os cards ficam alinhados */
.card-grid__row {
  display: grid;
  grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
  gap: var(--gap);
  border-radius: var(--radius);
}

.card-grid__cell {
  display: flex;
  min-width: 0;
}

.card-grid__empty {
  padding: var(--space-4);
  color: var(--color-text-muted);
}
</style>
