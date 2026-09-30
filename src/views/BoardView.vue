<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import CardGrid from '../components/CardGrid.vue'
import CategoryTabs from '../components/CategoryTabs.vue'
import HoldButton from '../components/HoldButton.vue'
import QuickPhrases from '../components/QuickPhrases.vue'
import ScanningLayer from '../components/ScanningLayer.vue'
import SentenceBar from '../components/SentenceBar.vue'
import { useSpeech } from '../composables/useSpeech'
import { useBoardStore } from '../stores/boardStore'
import { useSentenceStore } from '../stores/sentenceStore'
import { useSettingsStore } from '../stores/settingsStore'
import type { Card } from '../types'

const boardStore = useBoardStore()
const sentence = useSentenceStore()
const settings = useSettingsStore()
const { speak, isSupported } = useSpeech()
const router = useRouter()
const scanToggleRef = useTemplateRef<HTMLButtonElement>('scanToggle')

// Tocar em um card: adiciona à frase e, se configurado, fala a palavra
function selectCard(card: Card) {
  sentence.add(card)
  if (settings.speakOnTap) speak(card.speech ?? card.label)
}

function toggleScanning() {
  settings.scanning.enabled = !settings.scanning.enabled
}

// Ao desligar a varredura, o foco volta para o botão que a liga
watch(
  () => settings.scanning.enabled,
  async (enabled) => {
    if (enabled) return
    await nextTick()
    scanToggleRef.value?.focus()
  },
)
</script>

<template>
  <div
    class="board"
    :class="{ 'board--scanning': settings.scanning.enabled }"
    data-scan-root
  >
    <h1 class="visually-hidden" tabindex="-1">Comunicador Alternativo</h1>

    <div class="board__toolbar">
      <button
        ref="scanToggle"
        type="button"
        class="btn board__tool"
        :aria-pressed="settings.scanning.enabled"
        @click="toggleScanning"
      >
        <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
          <circle cx="12" cy="12" r="4" fill="currentColor" />
        </svg>
        Varredura
      </button>
      <!-- Entrada protegida: segurar 2 s, para o usuário principal não abrir o editor sem querer -->
      <HoldButton class="board__tool" @complete="router.push('/editor')">
        <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" />
          <path
            d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
        Editar prancha
      </HoldButton>
    </div>

    <p v-if="!isSupported" class="notice">
      Este navegador não tem suporte à fala. Use o botão <strong>Mostrar frase</strong> para exibir
      a frase em letras grandes, para o parceiro de comunicação ler na tela.
    </p>

    <SentenceBar />

    <QuickPhrases :cards="boardStore.quickPhrases" @select="selectCard" />

    <CategoryTabs
      :categories="boardStore.board.categories"
      :active-id="boardStore.activeCategory?.id ?? null"
      panel-id="painel-categoria"
      @select="boardStore.selectCategory"
    >
      <CardGrid
        :cards="boardStore.activeCards"
        :columns="settings.gridColumns"
        scan-rows
        @select="selectCard"
      />
    </CategoryTabs>

    <ScanningLayer v-if="settings.scanning.enabled" />
  </div>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 80rem;
  margin: 0 auto;
  padding: var(--space-3);
}

/* Espaço para a barra inferior da varredura não cobrir a última linha de cards */
.board--scanning {
  padding-bottom: calc(var(--scan-bar-height) + var(--space-6));
}

.board__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: flex-end;
}

.board__tool {
  min-height: 2.75rem;
  padding: var(--space-1) var(--space-3);
}

.board__tool[aria-pressed='true'] {
  border-color: var(--color-selected);
  background: var(--color-selected);
  color: var(--color-selected-text);
}
</style>
