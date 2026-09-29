<script setup lang="ts">
import { useTemplateRef } from 'vue'

defineProps<{ text: string }>()
const emit = defineEmits<{ close: [] }>()

const dialogRef = useTemplateRef<HTMLDialogElement>('dialog')

function open() {
  if (dialogRef.value && !dialogRef.value.open) dialogRef.value.showModal()
}

function close() {
  dialogRef.value?.close()
}

defineExpose({ open })
</script>

<template>
  <!-- Modo "frase em texto grande": usado quando o navegador não fala, para o parceiro ler na tela -->
  <dialog
    ref="dialog"
    class="large-text-dialog"
    aria-label="Frase em texto grande"
    aria-describedby="large-text-dialog-text"
    @close="emit('close')"
  >
    <p id="large-text-dialog-text" class="large-text-dialog__text">{{ text }}</p>
    <button type="button" class="btn btn--primary large-text-dialog__close" autofocus @click="close">
      Fechar
    </button>
  </dialog>
</template>

<style scoped>
.large-text-dialog {
  width: min(100% - 2rem, 60rem);
  max-height: calc(100% - 2rem);
  padding: var(--space-6);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
}

/* Cor literal: o ::backdrop não herda as variáveis do :root em navegadores mais antigos */
.large-text-dialog::backdrop {
  background: rgb(0 0 0 / 0.6);
}

.large-text-dialog__text {
  margin-bottom: var(--space-6);
  font-size: calc(clamp(2.5rem, 12vw, 6rem) * var(--font-scale));
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.large-text-dialog__close {
  width: 100%;
  font-size: 1.25rem;
}
</style>
