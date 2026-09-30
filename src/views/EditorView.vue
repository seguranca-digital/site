<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import BackupPanel from '../components/BackupPanel.vue'
import EditorCardList from '../components/EditorCardList.vue'
import EditorCategoryList from '../components/EditorCategoryList.vue'
import { QUICK_PHRASES_ID } from '../stores/boardStore'
import '../styles/editor.css'

// Modo do parceiro de comunicação: categorias à esquerda, cards da categoria aberta à direita
const selectedId = ref(QUICK_PHRASES_ID)
const cardListRef = useTemplateRef<InstanceType<typeof EditorCardList>>('cardList')
</script>

<template>
  <div class="editor">
    <RouterLink to="/" class="btn btn--small editor__back">
      <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M15 5l-7 7 7 7"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Voltar para a prancha
    </RouterLink>

    <h1 tabindex="-1">Editor da prancha</h1>
    <p class="editor__intro">As alterações são salvas automaticamente neste aparelho.</p>

    <div class="editor__columns">
      <EditorCategoryList v-model:selected="selectedId" @open="cardListRef?.focusHeading()" />
      <EditorCardList ref="cardList" :container-id="selectedId" />
    </div>

    <BackupPanel />
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 72rem;
  margin: 0 auto;
  padding: var(--space-4) var(--space-3);
}

.editor__back {
  align-self: flex-start;
  text-decoration: none;
}

h1 {
  font-size: 1.75rem;
  line-height: 1.25;
}

.editor__intro {
  color: var(--color-text-muted);
}

.editor__columns {
  display: grid;
  gap: var(--space-6);
}

/* Telas largas: duas colunas */
@media (min-width: 56rem) {
  .editor__columns {
    grid-template-columns: minmax(18rem, 1fr) minmax(0, 1.6fr);
    align-items: start;
  }
}

:deep(h2) {
  font-size: 1.375rem;
  line-height: 1.3;
}
</style>
