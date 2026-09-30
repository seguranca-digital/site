<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef } from 'vue'
import { QUICK_PHRASES_ID, useBoardStore } from '../stores/boardStore'
import type { Card } from '../types'
import { wordClassLabel } from '../wordClasses'
import CardEditorDialog from './CardEditorDialog.vue'
import PictogramImage from './PictogramImage.vue'

const props = defineProps<{ containerId: string }>()

const boardStore = useBoardStore()
const headingId = useId()
const headingRef = useTemplateRef<HTMLHeadingElement>('heading')
const listRef = useTemplateRef<HTMLUListElement>('list')
const newButtonRef = useTemplateRef<HTMLButtonElement>('newButton')
const editorRef = useTemplateRef<InstanceType<typeof CardEditorDialog>>('editor')
const announcement = ref('')

const containerName = computed(() =>
  props.containerId === QUICK_PHRASES_ID
    ? 'Frases rápidas'
    : (boardStore.board.categories.find((category) => category.id === props.containerId)?.name ?? ''),
)
const cards = computed(() => boardStore.cardsOf(props.containerId))

async function move(card: Card, delta: number) {
  if (!boardStore.moveCardWithin(props.containerId, card.id, delta)) return
  const position = cards.value.findIndex((item) => item.id === card.id) + 1
  announcement.value = `${card.label}: posição ${position} de ${cards.value.length}.`
  // A lista é redesenhada; o foco volta para o mesmo botão
  await nextTick()
  listRef.value
    ?.querySelector<HTMLElement>(`[data-move="${delta < 0 ? 'up' : 'down'}-${card.id}"]`)
    ?.focus()
}

function onDeleted(label: string) {
  announcement.value = `Card ${label} excluído.`
  newButtonRef.value?.focus()
}

// Leva o foco (e a rolagem, no celular) até o título da lista
async function focusHeading() {
  await nextTick()
  headingRef.value?.focus()
}

defineExpose({ focusHeading })
</script>

<template>
  <section class="editor-cards" :aria-labelledby="headingId">
    <div class="editor-cards__header">
      <h2 :id="headingId" ref="heading" tabindex="-1">Cards: {{ containerName }}</h2>
      <button
        ref="newButton"
        type="button"
        class="btn btn--small btn--primary"
        @click="editorRef?.openNew(containerId)"
      >
        + Novo card
      </button>
    </div>

    <p v-if="cards.length === 0" class="editor-cards__empty">Nenhum card aqui ainda.</p>

    <ul v-else ref="list" class="editor-list">
      <li
        v-for="(card, index) in cards"
        :key="card.id"
        class="editor-list__item"
        :class="{ 'editor-list__item--hidden': card.hidden }"
      >
        <!-- O texto do botão inclui classe e estado, para o leitor de tela ouvir tudo -->
        <button
          type="button"
          class="editor-list__main"
          :style="{ '--word-color': `var(--color-${card.wordClass})` }"
          @click="editorRef?.openEdit(card.id, containerId)"
        >
          <span class="editor-list__stripe" aria-hidden="true" />
          <PictogramImage :picto="card.picto" class="editor-list__thumb" />
          <span class="editor-list__text">
            <span class="editor-list__name">{{ card.label }}</span>
            <span v-if="card.speech" class="editor-list__meta">fala: "{{ card.speech }}"</span>
            <span class="editor-list__meta">{{ wordClassLabel(card.wordClass) }}</span>
          </span>
          <span v-if="card.hidden" class="editor-list__badge">Oculto</span>
          <span class="editor-list__action">Editar</span>
        </button>
        <div class="editor-list__controls">
          <button
            type="button"
            class="btn btn--small"
            :data-move="`up-${card.id}`"
            :aria-label="`Mover ${card.label} para cima`"
            :aria-disabled="index === 0"
            @click="move(card, -1)"
          >
            ↑
          </button>
          <button
            type="button"
            class="btn btn--small"
            :data-move="`down-${card.id}`"
            :aria-label="`Mover ${card.label} para baixo`"
            :aria-disabled="index === cards.length - 1"
            @click="move(card, 1)"
          >
            ↓
          </button>
        </div>
      </li>
    </ul>

    <p class="visually-hidden" role="status">{{ announcement }}</p>
    <CardEditorDialog ref="editor" @deleted="onDeleted" />
  </section>
</template>

<style scoped>
.editor-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.editor-cards__header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  justify-content: space-between;
}

.editor-cards__empty {
  color: var(--color-text-muted);
}
</style>
