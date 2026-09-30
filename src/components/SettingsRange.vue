<script setup lang="ts">
import { computed, useId } from 'vue'
import type { NumberLimits } from '../stores/settingsStore'

// Controle deslizante com o valor escrito ao lado. O leitor de tela ouve o mesmo texto
// (aria-valuetext), em vez do número cru (ex.: "1,5 segundo" em vez de "1500").
const model = defineModel<number>({ required: true })
const props = defineProps<{
  label: string
  limits: NumberLimits
  format: (value: number) => string
  hint?: string
}>()

const inputId = useId()
const hintId = useId()
const valueText = computed(() => props.format(model.value))
</script>

<template>
  <div class="settings-range">
    <div class="settings-range__header">
      <label :for="inputId" class="settings-range__label">{{ label }}</label>
      <span class="settings-range__value" aria-hidden="true">{{ valueText }}</span>
    </div>
    <input
      :id="inputId"
      v-model.number="model"
      type="range"
      class="settings-range__input"
      :min="limits.min"
      :max="limits.max"
      :step="limits.step"
      :aria-valuetext="valueText"
      :aria-describedby="hint ? hintId : undefined"
    />
    <p v-if="hint" :id="hintId" class="field__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.settings-range {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.settings-range__header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  align-items: baseline;
  justify-content: space-between;
}

.settings-range__label {
  font-weight: 600;
}

.settings-range__value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Área de toque de 44 px de altura; a cor segue o tema */
.settings-range__input {
  width: 100%;
  min-height: 2.75rem;
  margin: 0;
  accent-color: var(--color-primary);
  cursor: pointer;
}
</style>
