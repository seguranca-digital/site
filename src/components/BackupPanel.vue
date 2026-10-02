<script setup lang="ts">
import { ref, useId, useTemplateRef } from 'vue'
import { parseBackup } from '../backup'
import { applyBackup, createBackup } from '../composables/usePersistence'
import { createInitialBoard, useBoardStore } from '../stores/boardStore'
import ConfirmDialog from './ConfirmDialog.vue'

const boardStore = useBoardStore()
const headingId = useId()
const confirmRef = useTemplateRef<InstanceType<typeof ConfirmDialog>>('confirm')
const message = ref('')
const error = ref('')

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

async function exportBackup() {
  error.value = ''
  message.value = 'Preparando o backup…'
  try {
    const backup = await createBackup()
    const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `comunicador-backup-${today()}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    message.value = `Backup exportado: ${link.download}`
  } catch {
    message.value = ''
    error.value = 'Não foi possível exportar o backup.'
  }
}

async function importBackup(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = ''
  message.value = ''

  const result = parseBackup(await file.text())
  if (!result.ok) {
    error.value = result.error
    return
  }
  const { board, exportedAt } = result.value
  const date = exportedAt ? ` (feito em ${new Date(exportedAt).toLocaleDateString('pt-BR')})` : ''
  const confirmed = await confirmRef.value?.ask({
    title: 'Importar backup',
    message:
      `Substituir a prancha deste aparelho pelo backup${date}, com ` +
      `${board.categories.length} categorias e ${Object.keys(board.cards).length} cards? ` +
      'As categorias, os cards e as fotos atuais serão apagados.',
    confirmLabel: 'Substituir',
    danger: true,
  })
  if (!confirmed) return

  try {
    await applyBackup(result.value)
    message.value = 'Backup importado.'
  } catch {
    error.value = 'Não foi possível importar o backup.'
  }
}

async function restoreInitial() {
  error.value = ''
  const confirmed = await confirmRef.value?.ask({
    title: 'Restaurar vocabulário inicial',
    message:
      'Voltar para o vocabulário inicial? Todas as categorias, os cards e as fotos ' +
      'criados ou alterados neste aparelho serão apagados.',
    confirmLabel: 'Restaurar',
    danger: true,
  })
  if (!confirmed) return
  boardStore.replaceBoard(createInitialBoard())
  message.value = 'Vocabulário inicial restaurado.'
}
</script>

<template>
  <section class="backup-panel" :aria-labelledby="headingId">
    <h2 :id="headingId">Backup</h2>
    <p>
      Para levar as pranchas para outro aparelho, exporte um arquivo aqui e importe no outro.
      O arquivo inclui as fotos e as configurações.
    </p>
    <div class="backup-panel__row">
      <button type="button" class="btn btn--small" @click="exportBackup">Exportar backup</button>
      <label class="btn btn--small file-button">
        Importar backup
        <input
          type="file"
          accept=".json,application/json"
          class="visually-hidden"
          @change="importBackup"
        />
      </label>
      <button type="button" class="btn btn--small btn--danger" @click="restoreInitial">
        Restaurar vocabulário inicial
      </button>
    </div>

    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <p role="status">{{ message }}</p>
    <ConfirmDialog ref="confirm" />
  </section>
</template>

<style scoped>
.backup-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: var(--border-width) solid var(--color-border);
}

.backup-panel__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
