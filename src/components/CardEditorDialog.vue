<script setup lang="ts">
import { computed, nextTick, reactive, ref, useId, useTemplateRef } from 'vue'
import { saveImage } from '../composables/usePersistence'
import { useSpeech } from '../composables/useSpeech'
import { storedImageKey } from '../images'
import { QUICK_PHRASES_ID, useBoardStore } from '../stores/boardStore'
import type { WordClass } from '../types'
import { WORD_CLASSES } from '../wordClasses'
import ConfirmDialog from './ConfirmDialog.vue'
import ImagePicker, { type ImageChoice } from './ImagePicker.vue'

const emit = defineEmits<{ deleted: [label: string] }>()

const boardStore = useBoardStore()
const { speak } = useSpeech()
const titleId = useId()
const speechId = useId()
const dialogRef = useTemplateRef<HTMLDialogElement>('dialog')
const labelRef = useTemplateRef<HTMLInputElement>('label')
const confirmRef = useTemplateRef<InstanceType<typeof ConfirmDialog>>('confirm')

const cardId = ref<string | null>(null)
const originalContainerId = ref('')
const form = reactive({
  label: '',
  speech: '',
  wordClass: 'coisa' as WordClass,
  hidden: false,
  containerId: '',
})
const image = ref<ImageChoice>({ picto: { kind: 'none' }, blob: null })
const error = ref('')
const isSaving = ref(false)

const containers = computed(() => [
  { id: QUICK_PHRASES_ID, name: 'Frases rápidas' },
  ...boardStore.board.categories.map(({ id, name }) => ({ id, name })),
])

let returnFocus: HTMLElement | null = null

async function show() {
  error.value = ''
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialogRef.value?.showModal()
  await nextTick()
  labelRef.value?.focus()
}

function openNew(containerId: string) {
  cardId.value = null
  originalContainerId.value = containerId
  Object.assign(form, { label: '', speech: '', wordClass: 'coisa', hidden: false, containerId })
  image.value = { picto: { kind: 'none' }, blob: null }
  void show()
}

function openEdit(id: string, containerId: string) {
  const card = boardStore.board.cards[id]
  if (!card) return
  cardId.value = id
  originalContainerId.value = containerId
  Object.assign(form, {
    label: card.label,
    speech: card.speech ?? '',
    wordClass: card.wordClass,
    hidden: card.hidden ?? false,
    containerId,
  })
  image.value = { picto: card.picto, blob: null }
  void show()
}

function close() {
  dialogRef.value?.close()
}

function onClose() {
  if (returnFocus?.isConnected) returnFocus.focus()
  returnFocus = null
}

function listen() {
  speak(form.speech.trim() || form.label.trim())
}

async function save() {
  if (isSaving.value) return
  const label = form.label.trim()
  if (label === '') {
    error.value = 'Escreva o texto exibido no card.'
    labelRef.value?.focus()
    return
  }
  const speech = form.speech.trim()
  const data = {
    label,
    speech: speech !== '' && speech !== label ? speech : undefined,
    wordClass: form.wordClass,
    hidden: form.hidden || undefined,
    picto: image.value.picto,
  }

  isSaving.value = true
  try {
    const key = storedImageKey(image.value.picto)
    if (image.value.blob && key) await saveImage(key, image.value.blob)
  } catch {
    error.value = 'Não foi possível guardar a imagem neste aparelho.'
    return
  } finally {
    isSaving.value = false
  }

  if (cardId.value) {
    boardStore.updateCard(cardId.value, data)
    boardStore.moveCardTo(cardId.value, originalContainerId.value, form.containerId)
  } else {
    boardStore.addCard(form.containerId, data)
  }
  close()
}

async function remove() {
  if (!cardId.value) return
  const label = form.label.trim() || 'este card'
  const confirmed = await confirmRef.value?.ask({
    title: 'Excluir card',
    message: `Excluir o card "${label}"? Ele sai da prancha e das frases rápidas.`,
    confirmLabel: 'Excluir',
    danger: true,
  })
  if (!confirmed) return
  boardStore.deleteCard(cardId.value)
  returnFocus = null
  close()
  emit('deleted', label)
}

defineExpose({ openNew, openEdit })
</script>

<template>
  <dialog ref="dialog" class="app-dialog card-editor" :aria-labelledby="titleId" @close="onClose">
    <form class="card-editor__form" novalidate @submit.prevent="save">
      <h2 :id="titleId">{{ cardId ? 'Editar card' : 'Novo card' }}</h2>

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>

      <label class="field">
        Texto exibido
        <input ref="label" v-model="form.label" class="input" maxlength="40" autocomplete="off" />
      </label>

      <div class="field">
        <label :for="speechId">
          Texto falado
          <span class="field__hint">(opcional; vazio fala o texto exibido)</span>
        </label>
        <div class="field__row">
          <input
            :id="speechId"
            v-model="form.speech"
            class="input card-editor__speech"
            maxlength="120"
            autocomplete="off"
          />
          <button type="button" class="btn btn--small" @click="listen">Ouvir</button>
        </div>
      </div>

      <label class="field">
        Classe de palavra
        <span class="field__row">
          <span
            class="card-editor__swatch"
            aria-hidden="true"
            :style="{ '--word-color': `var(--color-${form.wordClass})` }"
          />
          <select v-model="form.wordClass" class="input">
            <option v-for="wordClass in WORD_CLASSES" :key="wordClass.value" :value="wordClass.value">
              {{ wordClass.label }}
            </option>
          </select>
        </span>
      </label>

      <ImagePicker v-model="image" :suggested-term="form.label" />

      <label class="field">
        Categoria
        <select v-model="form.containerId" class="input">
          <option v-for="container in containers" :key="container.id" :value="container.id">
            {{ container.name }}
          </option>
        </select>
      </label>

      <label class="card-editor__check">
        <input v-model="form.hidden" type="checkbox" />
        Ocultar este card na prancha
      </label>

      <div class="card-editor__actions">
        <button v-if="cardId" type="button" class="btn btn--small btn--danger" @click="remove">
          Excluir card
        </button>
        <span class="card-editor__spacer" />
        <button type="button" class="btn btn--small" @click="close">Cancelar</button>
        <button type="submit" class="btn btn--small btn--primary" :aria-disabled="isSaving">
          Salvar
        </button>
      </div>
    </form>

    <ConfirmDialog ref="confirm" />
  </dialog>
</template>

<style scoped>
.card-editor__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.card-editor__speech {
  flex: 1 1 12rem;
  min-width: 0;
}

.card-editor__swatch {
  width: 1.5rem;
  height: 2.75rem;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--word-color);
}

.card-editor__check {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  min-height: 2.75rem;
  font-weight: 600;
}

.card-editor__check input {
  width: 1.5rem;
  height: 1.5rem;
}

.card-editor__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.card-editor__spacer {
  flex: 1;
}
</style>
