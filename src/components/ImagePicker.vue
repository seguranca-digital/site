<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useArasaac, type ArasaacResult } from '../composables/useArasaac'
import { randomId } from '../ids'
import { isBundledPictogram, resizeImage } from '../images'
import type { PictogramSource } from '../types'
import PictogramImage from './PictogramImage.vue'

// Imagem escolhida no editor. `blob` vem preenchido quando a imagem ainda precisa ser
// guardada no aparelho (pictograma baixado agora ou foto); é salva só ao salvar o card.
export interface ImageChoice {
  picto: PictogramSource
  blob: Blob | null
}

const props = defineProps<{ suggestedTerm: string }>()
const choice = defineModel<ImageChoice>({ required: true })

type Mode = 'arasaac' | 'foto'
const termId = useId()
const mode = ref<Mode | null>(null)
const term = ref('')
const message = ref('')
const { results, status, search, thumbnailUrl, download } = useArasaac()

// Prévia de uma imagem nova, que ainda não está no aparelho
const previewUrl = ref<string | null>(null)
watch(
  () => choice.value.blob,
  (blob) => {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = blob ? URL.createObjectURL(blob) : null
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

const selectedArasaacId = computed(() =>
  choice.value.picto.kind === 'arasaac' ? choice.value.picto.id : null,
)

function openMode(next: Mode) {
  mode.value = next
  message.value = ''
  if (next === 'arasaac' && term.value === '') term.value = props.suggestedTerm
}

async function runSearch() {
  message.value = ''
  await search(term.value)
  if (status.value === 'empty') message.value = `Nenhum pictograma encontrado para "${term.value}".`
  else if (status.value === 'error') {
    message.value = 'Não foi possível buscar. A busca no ARASAAC precisa de internet.'
  } else if (status.value === 'done') {
    message.value = `${results.value.length} resultados. Escolha um pictograma.`
  }
}

async function chooseArasaac(result: ArasaacResult) {
  const picto: PictogramSource = { kind: 'arasaac', id: result.id }
  // Pictogramas que já vêm com o app não precisam ser baixados de novo
  if (isBundledPictogram(result.id)) {
    choice.value = { picto, blob: null }
    message.value = `Escolhido: ${result.keyword}.`
    return
  }
  message.value = 'Baixando o pictograma…'
  try {
    choice.value = { picto, blob: await download(result.id) }
    message.value = `Escolhido: ${result.keyword}.`
  } catch {
    message.value = 'Não foi possível baixar o pictograma. Verifique a internet.'
  }
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Limpa o campo para poder escolher o mesmo arquivo de novo
  input.value = ''
  if (!file) return
  message.value = 'Preparando a imagem…'
  try {
    const blob = await resizeImage(file, 400)
    choice.value = { picto: { kind: 'custom', blobKey: randomId('foto') }, blob }
    message.value = 'Foto escolhida.'
  } catch {
    message.value = 'Não foi possível abrir essa imagem. Tente outra.'
  }
}

function chooseNone() {
  mode.value = null
  choice.value = { picto: { kind: 'none' }, blob: null }
  message.value = 'Card sem imagem.'
}
</script>

<template>
  <fieldset class="image-picker">
    <legend class="image-picker__legend">Imagem</legend>

    <div class="image-picker__current">
      <img v-if="previewUrl" class="image-picker__preview" :src="previewUrl" alt="" />
      <PictogramImage
        v-else-if="choice.picto.kind !== 'none'"
        :picto="choice.picto"
        class="image-picker__preview"
      />
      <span v-else class="image-picker__empty">Sem imagem</span>
    </div>

    <div class="image-picker__modes" role="group" aria-label="Como escolher a imagem">
      <button
        type="button"
        class="btn btn--small"
        :aria-pressed="mode === 'arasaac'"
        @click="openMode('arasaac')"
      >
        Buscar no ARASAAC
      </button>
      <button
        type="button"
        class="btn btn--small"
        :aria-pressed="mode === 'foto'"
        @click="openMode('foto')"
      >
        Enviar ou tirar foto
      </button>
      <button type="button" class="btn btn--small" @click="chooseNone">Sem imagem</button>
    </div>

    <!-- Sem <form> aqui: o picker fica dentro do formulário do card -->
    <div v-if="mode === 'arasaac'" class="image-picker__panel">
      <div class="field">
        <label :for="termId">Palavra para buscar</label>
        <div class="field__row">
          <input
            :id="termId"
            v-model="term"
            class="input image-picker__term"
            type="search"
            autocomplete="off"
            @keydown.enter.prevent="runSearch"
          />
          <button type="button" class="btn btn--small btn--primary" @click="runSearch">
            Buscar
          </button>
        </div>
      </div>
      <p v-if="status === 'loading'" class="image-picker__loading">Buscando…</p>
      <ul v-if="results.length > 0" class="image-picker__results">
        <li v-for="result in results" :key="result.id">
          <button
            type="button"
            class="image-picker__result"
            :aria-pressed="selectedArasaacId === result.id"
            @click="chooseArasaac(result)"
          >
            <img :src="thumbnailUrl(result.id)" alt="" loading="lazy" width="300" height="300" />
            <span>{{ result.keyword }}</span>
          </button>
        </li>
      </ul>
    </div>

    <div v-if="mode === 'foto'" class="image-picker__panel image-picker__files">
      <label class="btn btn--small file-button">
        Tirar foto
        <input
          type="file"
          accept="image/*"
          capture="environment"
          class="visually-hidden"
          @change="onFile"
        />
      </label>
      <label class="btn btn--small file-button">
        Escolher do aparelho
        <input type="file" accept="image/*" class="visually-hidden" @change="onFile" />
      </label>
    </div>

    <p class="image-picker__message" role="status">{{ message }}</p>
  </fieldset>
</template>

<style scoped>
.image-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: var(--space-3);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius);
}

.image-picker__legend {
  padding-inline: var(--space-1);
  font-weight: 600;
}

.image-picker__current {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 7rem;
  height: 7rem;
  border: var(--border-width) dashed var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-surface);
}

.image-picker__preview {
  width: 6rem;
  height: 6rem;
  object-fit: contain;
}

.image-picker__empty {
  color: var(--color-text-muted);
  font-size: 0.9375rem;
}

.image-picker__modes,
.image-picker__files {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.image-picker__modes .btn[aria-pressed='true'] {
  border-color: var(--color-selected);
  background: var(--color-selected);
  color: var(--color-selected-text);
}

.image-picker__term {
  flex: 1 1 10rem;
  min-width: 0;
}

.image-picker__results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
  gap: var(--gap);
  max-height: 18rem;
  padding: var(--space-1);
  overflow-y: auto;
  list-style: none;
}

.image-picker__result {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  align-items: center;
  width: 100%;
  height: 100%;
  padding: var(--space-1);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-surface);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}

.image-picker__result img {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
}

/* Escolhido: borda grossa e fundo diferente, não só a cor */
.image-picker__result[aria-pressed='true'] {
  border-width: 0.25rem;
  border-color: var(--color-selected);
  background: var(--color-surface-alt);
  font-weight: 700;
}
</style>
