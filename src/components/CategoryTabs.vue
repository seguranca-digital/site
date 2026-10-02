<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import type { Category } from '../types'
import PictogramImage from './PictogramImage.vue'

const props = defineProps<{
  categories: Category[]
  activeId: string | null
  panelId: string
  scrollable?: boolean
}>()
const emit = defineEmits<{ select: [id: string] }>()

const tablistRef = useTemplateRef<HTMLDivElement>('tablist')

function tabId(categoryId: string): string {
  return `aba-${categoryId}`
}

watch(
  () => props.activeId,
  async (id) => {
    const index = props.categories.findIndex((category) => category.id === id)
    if (index < 0) return
    await nextTick()
    const tab = tablistRef.value?.querySelectorAll<HTMLElement>('[role="tab"]')[index]
    tab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  },
)

function onKeydown(event: KeyboardEvent) {
  const count = props.categories.length
  if (count === 0) return
  const current = Math.max(
    props.categories.findIndex((category) => category.id === props.activeId),
    0,
  )

  let next: number
  switch (event.key) {
    case 'ArrowRight':
      next = (current + 1) % count
      break
    case 'ArrowLeft':
      next = (current - 1 + count) % count
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

  const category = props.categories[next]
  if (!category) return
  emit('select', category.id)
  tablistRef.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
}
</script>

<template>
  <div class="category-tabs">
    <div
      ref="tablist"
      role="tablist"
      aria-label="Categorias"
      class="category-tabs__list"
      :class="{ 'category-tabs__list--scroll': scrollable }"
      data-scan-group="categorias"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <button
        v-for="category in categories"
        :id="tabId(category.id)"
        :key="category.id"
        type="button"
        role="tab"
        class="category-tabs__tab"
        :aria-selected="category.id === activeId"
        :aria-controls="panelId"
        :tabindex="category.id === activeId ? 0 : -1"
        :data-scan-item="`aba:${category.id}`"
        @click="emit('select', category.id)"
      >
        <PictogramImage :picto="category.picto" class="category-tabs__picto" />
        {{ category.name }}
      </button>
    </div>

    <div
      :id="panelId"
      role="tabpanel"
      class="category-tabs__panel"
      :aria-labelledby="activeId ? tabId(activeId) : undefined"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.category-tabs {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.category-tabs__list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
}

.category-tabs__tab {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  min-height: 4rem;
  padding: var(--space-1) var(--space-4) var(--space-1) var(--space-2);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: calc(1.125rem * var(--font-scale));
  font-weight: 500;
  line-height: 1.2;
}

.category-tabs__picto {
  width: 2.75rem;
}

.category-tabs__tab:hover {
  background: var(--color-surface-alt);
}

.category-tabs__tab[aria-selected='true'] {
  border-color: var(--color-selected);
  background: var(--color-selected);
  color: var(--color-selected-text);
  font-weight: 700;
}

@media (max-width: 40rem) {
  .category-tabs__list--scroll {
    flex-wrap: nowrap;
    margin: -0.5rem;
    padding: 0.5rem;
    overflow-x: auto;
    overscroll-behavior-x: contain;
  }

  .category-tabs__list--scroll .category-tabs__tab {
    flex: none;
  }
}
</style>
