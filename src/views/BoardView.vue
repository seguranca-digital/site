<script setup lang="ts">
import CardGrid from '../components/CardGrid.vue'
import CategoryTabs from '../components/CategoryTabs.vue'
import QuickPhrases from '../components/QuickPhrases.vue'
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

// Tocar em um card: adiciona à frase e, se configurado, fala a palavra
function selectCard(card: Card) {
  sentence.add(card)
  if (settings.speakOnTap) speak(card.speech ?? card.label)
}
</script>

<template>
  <div class="board">
    <h1 class="visually-hidden" tabindex="-1">Comunicador Alternativo</h1>

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
        @select="selectCard"
      />
    </CategoryTabs>
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
</style>
