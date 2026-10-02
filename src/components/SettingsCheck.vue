<script setup lang="ts">
import { useId } from 'vue'

const model = defineModel<boolean>({ required: true })
defineProps<{ label: string; hint?: string }>()

const hintId = useId()
</script>

<template>
  <div class="settings-check">
    <label class="check">
      <input v-model="model" type="checkbox" :aria-describedby="hint ? hintId : undefined" />
      {{ label }}
    </label>
    <p v-if="hint" :id="hintId" class="field__hint settings-check__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.settings-check__hint {
  padding-left: calc(1.5rem + var(--space-3));
}
</style>
