<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSettingsStore } from '../stores/settingsStore'
import type { Card } from '../types'
import PictogramImage from './PictogramImage.vue'

const props = defineProps<{ card: Card }>()
defineEmits<{ select: [card: Card] }>()

const settings = useSettingsStore()
const imageFailed = ref(false)
watch(
  () => props.card.picto,
  () => {
    imageFailed.value = false
  },
)

const hideLabel = computed(
  () => !settings.showLabels && props.card.picto.kind !== 'none' && !imageFailed.value,
)
</script>

<template>
  <button
    type="button"
    class="comm-card"
    :class="{ 'comm-card--no-label': hideLabel }"
    :style="{ '--word-color': `var(--color-${card.wordClass})` }"
    @click="$emit('select', card)"
  >
    <PictogramImage
      :picto="card.picto"
      class="comm-card__picto"
      @failed="imageFailed = $event"
    />
    <span class="comm-card__label" :class="{ 'visually-hidden': hideLabel }">{{ card.label }}</span>
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
  padding: var(--card-padding-block, var(--space-2)) 0.125rem;
  border: var(--border-width) solid var(--color-border);
  border-top: var(--stripe-width) solid var(--word-color);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: calc(1rem * var(--font-scale));
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  overflow-wrap: anywhere;
  hyphens: auto;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  transition: transform 80ms ease-out;
}

.comm-card__picto {
  width: min(100%, var(--picto-size));
}

.comm-card--no-label {
  justify-content: center;
}

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
