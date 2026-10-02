<script setup lang="ts">
import type { Card } from '../types'
import CardGrid from './CardGrid.vue'

defineProps<{ cards: Card[] }>()
const emit = defineEmits<{ select: [card: Card] }>()
</script>

<template>
  <section
    class="quick-phrases"
    aria-labelledby="quick-phrases-title"
    data-scan-group="frases-rapidas"
    data-scan-label="Frases rápidas"
    tabindex="-1"
  >
    <h2 id="quick-phrases-title" class="visually-hidden">Frases rápidas</h2>
    <CardGrid :cards="cards" @select="emit('select', $event)" />
  </section>
</template>

<style scoped>
.quick-phrases {
  --card-min-size: calc(4.5rem * var(--font-scale));
  --picto-size: 3rem;
  padding: var(--space-2);
  border-radius: var(--radius);
  background: var(--color-surface-alt);
}

@media (max-width: 40rem) {
  .quick-phrases {
    --picto-size: 2.25rem;
    --card-padding-block: var(--space-1);
  }
}
</style>
