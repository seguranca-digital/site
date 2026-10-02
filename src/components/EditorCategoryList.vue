<script setup lang="ts">
import { nextTick, ref, useId, useTemplateRef } from 'vue'
import { QUICK_PHRASES_ID, useBoardStore } from '../stores/boardStore'
import type { Category } from '../types'
import ConfirmDialog from './ConfirmDialog.vue'
import PictogramImage from './PictogramImage.vue'

const selected = defineModel<string>('selected', { required: true })
const emit = defineEmits<{ open: [] }>()

function open(id: string) {
  selected.value = id
  emit('open')
}

const boardStore = useBoardStore()
const headingId = useId()
const newNameId = useId()
const listRef = useTemplateRef<HTMLUListElement>('list')
const renameRef = useTemplateRef<HTMLInputElement[]>('rename')
const confirmRef = useTemplateRef<InstanceType<typeof ConfirmDialog>>('confirm')

const newName = ref('')
const addError = ref('')
const renamingId = ref<string | null>(null)
const renameText = ref('')
const announcement = ref('')

function cardCount(containerId: string): string {
  const count = boardStore.cardsOf(containerId).length
  return count === 1 ? '1 card' : `${count} cards`
}

async function focusInList(selector: string) {
  await nextTick()
  listRef.value?.querySelector<HTMLElement>(selector)?.focus()
}

async function move(category: Category, delta: number) {
  if (!boardStore.moveCategory(category.id, delta)) return
  const position = boardStore.board.categories.indexOf(category) + 1
  announcement.value = `${category.name}: posição ${position} de ${boardStore.board.categories.length}.`
  await focusInList(`[data-move="${delta < 0 ? 'up' : 'down'}-${category.id}"]`)
}

async function startRename(category: Category) {
  renamingId.value = category.id
  renameText.value = category.name
  await nextTick()
  renameRef.value?.[0]?.focus()
  renameRef.value?.[0]?.select()
}

async function finishRename(category: Category, save: boolean) {
  if (save && renameText.value.trim() !== '') {
    boardStore.renameCategory(category.id, renameText.value)
    announcement.value = `Categoria renomeada para ${category.name}.`
  }
  renamingId.value = null
  await focusInList(`[data-rename="${category.id}"]`)
}

async function remove(category: Category) {
  const count = category.cardIds.length
  const message =
    count === 0
      ? `Excluir a categoria "${category.name}"?`
      : `Excluir a categoria "${category.name}" e os ${count} cards dela? ` +
        'Cards que também estão nas frases rápidas continuam lá.'
  const confirmed = await confirmRef.value?.ask({
    title: 'Excluir categoria',
    message,
    confirmLabel: 'Excluir',
    danger: true,
  })
  if (!confirmed) return
  boardStore.deleteCategory(category.id)
  if (selected.value === category.id) selected.value = QUICK_PHRASES_ID
  announcement.value = `Categoria ${category.name} excluída.`
  await focusInList(`[data-select="${QUICK_PHRASES_ID}"]`)
}

function add() {
  const name = newName.value.trim()
  if (name === '') {
    addError.value = 'Escreva o nome da nova categoria.'
    return
  }
  const category = boardStore.addCategory(name)
  selected.value = category.id
  newName.value = ''
  addError.value = ''
  announcement.value = `Categoria ${name} criada e aberta.`
}
</script>

<template>
  <section class="editor-categories" :aria-labelledby="headingId">
    <h2 :id="headingId">Categorias</h2>

    <ul ref="list" class="editor-list">
      <li
        class="editor-list__item"
        :class="{ 'editor-list__item--selected': selected === QUICK_PHRASES_ID }"
      >
        <button
          type="button"
          class="editor-list__main"
          :data-select="QUICK_PHRASES_ID"
          :aria-current="selected === QUICK_PHRASES_ID ? 'true' : undefined"
          @click="open(QUICK_PHRASES_ID)"
        >
          <span class="editor-list__name">Frases rápidas</span>
          <span class="editor-list__meta">{{ cardCount(QUICK_PHRASES_ID) }} · fixa</span>
        </button>
      </li>

      <li
        v-for="(category, index) in boardStore.board.categories"
        :key="category.id"
        class="editor-list__item"
        :class="{ 'editor-list__item--selected': selected === category.id }"
      >
        <div v-if="renamingId === category.id" class="editor-list__rename">
          <label class="visually-hidden" :for="`renomear-${category.id}`">
            Novo nome para {{ category.name }}
          </label>
          <input
            :id="`renomear-${category.id}`"
            ref="rename"
            v-model="renameText"
            class="input"
            maxlength="40"
            @keydown.enter.prevent="finishRename(category, true)"
            @keydown.esc.prevent="finishRename(category, false)"
          />
          <button type="button" class="btn btn--small btn--primary" @click="finishRename(category, true)">
            Salvar
          </button>
          <button type="button" class="btn btn--small" @click="finishRename(category, false)">
            Cancelar
          </button>
        </div>

        <template v-else>
          <button
            type="button"
            class="editor-list__main"
            :data-select="category.id"
            :aria-current="selected === category.id ? 'true' : undefined"
            @click="open(category.id)"
          >
            <PictogramImage :picto="category.picto" class="editor-list__thumb" />
            <span class="editor-list__name">{{ category.name }}</span>
            <span class="editor-list__meta">{{ cardCount(category.id) }}</span>
          </button>
          <div class="editor-list__controls">
            <button
              type="button"
              class="btn btn--small"
              :data-move="`up-${category.id}`"
              :aria-label="`Mover ${category.name} para cima`"
              :aria-disabled="index === 0"
              @click="move(category, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              class="btn btn--small"
              :data-move="`down-${category.id}`"
              :aria-label="`Mover ${category.name} para baixo`"
              :aria-disabled="index === boardStore.board.categories.length - 1"
              @click="move(category, 1)"
            >
              ↓
            </button>
            <button
              type="button"
              class="btn btn--small"
              :data-rename="category.id"
              :aria-label="`Renomear ${category.name}`"
              @click="startRename(category)"
            >
              Renomear
            </button>
            <button
              type="button"
              class="btn btn--small"
              :aria-label="`Excluir ${category.name}`"
              @click="remove(category)"
            >
              Excluir
            </button>
          </div>
        </template>
      </li>
    </ul>

    <form class="editor-categories__add" novalidate @submit.prevent="add">
      <label class="field" :for="newNameId">Nova categoria</label>
      <p v-if="addError" class="form-error" role="alert">{{ addError }}</p>
      <div class="field__row">
        <input
          :id="newNameId"
          v-model="newName"
          class="input editor-categories__input"
          maxlength="40"
          autocomplete="off"
        />
        <button type="submit" class="btn btn--small btn--primary">Adicionar</button>
      </div>
    </form>

    <p class="visually-hidden" role="status">{{ announcement }}</p>
    <ConfirmDialog ref="confirm" />
  </section>
</template>

<style scoped>
.editor-categories {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.editor-categories__add {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.editor-categories__input {
  flex: 1 1 10rem;
  min-width: 0;
}

.editor-list__rename {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  width: 100%;
}

.editor-list__rename .input {
  flex: 1 1 10rem;
  min-width: 0;
}
</style>
