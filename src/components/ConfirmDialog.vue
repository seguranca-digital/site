<script setup lang="ts">
import { ref, useId, useTemplateRef } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
}

const titleId = useId()
const messageId = useId()
const dialogRef = useTemplateRef<HTMLDialogElement>('dialog')
const cancelRef = useTemplateRef<HTMLButtonElement>('cancel')
const options = ref<ConfirmOptions>({ title: '', message: '', confirmLabel: 'Confirmar' })

let resolveAnswer: ((confirmed: boolean) => void) | undefined
let returnFocus: HTMLElement | null = null

function ask(next: ConfirmOptions): Promise<boolean> {
  const dialog = dialogRef.value
  if (!dialog) return Promise.resolve(false)
  options.value = next
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.returnValue = ''
  dialog.showModal()
  cancelRef.value?.focus()
  return new Promise((resolve) => {
    resolveAnswer = resolve
  })
}

function finish(confirmed: boolean) {
  dialogRef.value?.close(confirmed ? 'confirmar' : 'cancelar')
}

function onClose() {
  resolveAnswer?.(dialogRef.value?.returnValue === 'confirmar')
  resolveAnswer = undefined
  if (returnFocus?.isConnected) returnFocus.focus()
  returnFocus = null
}

defineExpose({ ask })
</script>

<template>
  <dialog
    ref="dialog"
    class="app-dialog confirm-dialog"
    :aria-labelledby="titleId"
    :aria-describedby="messageId"
    @close="onClose"
  >
    <h2 :id="titleId">{{ options.title }}</h2>
    <p :id="messageId" class="confirm-dialog__message">{{ options.message }}</p>
    <div class="confirm-dialog__actions">
      <button ref="cancel" type="button" class="btn btn--small" @click="finish(false)">
        Cancelar
      </button>
      <button
        type="button"
        class="btn btn--small"
        :class="options.danger ? 'btn--danger' : 'btn--primary'"
        @click="finish(true)"
      >
        {{ options.confirmLabel }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.confirm-dialog {
  width: min(100% - 1rem, 32rem);
}

.confirm-dialog__message {
  margin-bottom: var(--space-4);
  line-height: 1.5;
}

.confirm-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
