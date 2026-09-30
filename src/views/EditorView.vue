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
  <div class="page">
    <nav class="page__nav" aria-label="Telas">
      <RouterLink to="/" class="btn btn--small">
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
      <RouterLink to="/configuracoes" class="btn btn--small">Configurações</RouterLink>
    </nav>

    <h1 tabindex="-1">Editor da prancha</h1>
    <p class="page__intro">As alterações são salvas automaticamente neste aparelho.</p>

    <div class="editor__columns">
      <EditorCategoryList v-model:selected="selectedId" @open="cardListRef?.focusHeading()" />
      <EditorCardList ref="cardList" :container-id="selectedId" />
    </div>

    <BackupPanel />
  </div>
</template>

<style scoped>
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
</style>
