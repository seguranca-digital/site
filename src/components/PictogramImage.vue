<script setup lang="ts">
import { ref, watch } from 'vue'
import { imageUrl } from '../composables/usePersistence'
import { bundledPictogramUrl, isBundledPictogram, storedImageKey } from '../images'
import type { PictogramSource } from '../types'

const props = defineProps<{ picto: PictogramSource }>()
const emit = defineEmits<{ failed: [value: boolean] }>()

const src = ref<string | null>(null)
const failed = ref(false)
let request = 0

watch(
  () => props.picto,
  async (picto) => {
    const current = ++request
    failed.value = false
    if (picto.kind === 'arasaac' && isBundledPictogram(picto.id)) {
      src.value = bundledPictogramUrl(picto.id)
      return
    }
    const key = storedImageKey(picto)
    if (key === null) {
      src.value = null
      return
    }
    const url = await imageUrl(key)
    if (current !== request) return
    src.value =
      url ??
      (picto.kind === 'arasaac'
        ? `https://api.arasaac.org/v1/pictograms/${picto.id}?download=false`
        : null)
    if (src.value === null) failed.value = true
  },
  { immediate: true, deep: true },
)

watch(failed, (value) => emit('failed', value))
</script>

<template>
  <img
    v-if="src && !failed"
    class="pictogram"
    :src="src"
    alt=""
    width="500"
    height="500"
    decoding="async"
    draggable="false"
    @error="failed = true"
  />
</template>

<style scoped>
.pictogram {
  display: block;
  flex: none;
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
  border-radius: var(--radius-small);
  background: var(--color-picto-bg);
  -webkit-user-drag: none;
}
</style>
