<script setup lang="ts">
import { ref, watch } from 'vue'
import { imageUrl } from '../composables/usePersistence'
import { bundledPictogramUrl, isBundledPictogram, storedImageKey } from '../images'
import type { PictogramSource } from '../types'

const props = defineProps<{ picto: PictogramSource }>()
// Avisa quando a imagem não pode ser exibida (ex.: para o card mostrar o texto mesmo com os
// rótulos ocultos)
const emit = defineEmits<{ failed: [value: boolean] }>()

// De onde vem a imagem: pictogramas do app ficam em public/pictogramas; os escolhidos no
// editor e as fotos ficam no IndexedDB; sem cópia local, tenta o ARASAAC online
const src = ref<string | null>(null)
// Se a imagem não carregar, quem usa o componente continua funcionando só com o texto
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
    // Ignora respostas antigas, se a imagem mudou enquanto carregava
    if (current !== request) return
    src.value =
      url ??
      (picto.kind === 'arasaac'
        ? `https://api.arasaac.org/v1/pictograms/${picto.id}?download=false`
        : null)
    // Foto apagada do aparelho: não há de onde carregar
    if (src.value === null) failed.value = true
  },
  { immediate: true, deep: true },
)

watch(failed, (value) => emit('failed', value))
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
  border-radius: var(--radius-small);
  /* Fundo claro em todos os temas: o traço preto do pictograma some sobre fundo escuro */
  background: var(--color-picto-bg);
  -webkit-user-drag: none;
}
</style>
