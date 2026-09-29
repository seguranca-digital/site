<script setup lang="ts">
import type { Card } from '../types'
import PictogramImage from './PictogramImage.vue'

defineProps<{ card: Card }>()
defineEmits<{ select: [card: Card] }>()
</script>

<template>
  <button
    type="button"
    class="comm-card"
    :style="{ '--word-color': `var(--color-${card.wordClass})` }"
    @click="$emit('select', card)"
  >
    <PictogramImage :picto="card.picto" class="comm-card__picto" />
    <span class="comm-card__label">{{ card.label }}</span>
  </button>
</template>

<style scoped>
.comm-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-1);
  align-items: center;
  min-width: 0;
  min-height: var(--card-min-size);
  padding: var(--space-2) 0.125rem;
  /* Faixa superior com a cor da classe gramatical */
  border: var(--border-width) solid var(--color-border);
  border-top: var(--stripe-width) solid var(--word-color);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: calc(1rem * var(--font-scale));
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  /* Hifeniza palavras longas quando o navegador tem dicionário; quebrar em qualquer ponto é o último recurso */
  overflow-wrap: anywhere;
  hyphens: auto;
  /* Evita seleção de texto e menu de contexto em toques longos */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  transition: transform 80ms ease-out;
}

/* Pictogramas alinhados no topo de cada linha da grade */
.comm-card__picto {
  width: min(100%, var(--picto-size));
}

/* O texto ocupa o espaço restante e fica centralizado nele (ou no card inteiro, sem imagem) */
.comm-card__label {
  display: flex;
  flex: 1;
  align-items: center;
}

.comm-card:hover {
  background: var(--color-surface-alt);
}

.comm-card:active {
  background: var(--color-surface-alt);
  transform: scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .comm-card:active {
    transform: none;
  }
}
</style>
