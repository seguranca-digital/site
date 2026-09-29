<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PictogramSource } from '../types'

const props = defineProps<{ picto: PictogramSource }>()

// Pictogramas do ARASAAC baixados pelo script ficam em public/pictogramas
const src = computed(() =>
  props.picto.kind === 'arasaac'
    ? `${import.meta.env.BASE_URL}pictogramas/${props.picto.id}.png`
    : null,
)

// Se a imagem não carregar, quem usa o componente continua funcionando só com o texto
const failed = ref(false)
watch(src, () => {
  failed.value = false
})
</script>

<template>
  <!-- alt vazio: o nome do botão já é o texto; assim o leitor de tela não lê a palavra duas vezes -->
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
  -webkit-user-drag: none;
}
</style>
