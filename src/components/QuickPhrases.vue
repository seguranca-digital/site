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
  /* Rótulos curtos: cabem 4 por linha em celulares; pictogramas menores para a linha ocupar pouca altura */
  --card-min-size: 4.5rem;
  --picto-size: 3rem;
  padding: var(--space-2);
  border-radius: var(--radius);
  background: var(--color-surface-alt);
}
</style>
