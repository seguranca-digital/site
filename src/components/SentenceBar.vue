<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import { useSpeech } from '../composables/useSpeech'
import { useSentenceStore } from '../stores/sentenceStore'
import { useSettingsStore } from '../stores/settingsStore'
import LargeTextDialog from './LargeTextDialog.vue'

const sentence = useSentenceStore()
const settings = useSettingsStore()
const { speak, isSupported } = useSpeech()

const speakButtonRef = useTemplateRef<HTMLButtonElement>('speakButton')
const largeTextDialogRef = useTemplateRef<InstanceType<typeof LargeTextDialog>>('largeTextDialog')
const largeText = ref('')
const announcement = ref('')

// Sem fala ao tocar, anuncia a palavra adicionada ao leitor de tela via role="status".
// Com fala ao tocar, não anuncia nada: a voz do app já dá o retorno.
watch(
  () => sentence.items.length,
  async (length, previousLength) => {
    if (settings.speakOnTap || length <= previousLength) return
    const last = sentence.items[length - 1]
    if (!last) return
    // Esvazia antes, para que a mesma palavra repetida seja anunciada de novo
    announcement.value = ''
    await nextTick()
    announcement.value = `Adicionado: ${last.label}`
  },
)

function onSpeak() {
  if (sentence.isEmpty) return
  if (isSupported) {
    speak(sentence.text)
  } else {
    largeText.value = sentence.text
    largeTextDialogRef.value?.open()
  }
  if (settings.clearAfterSpeak) sentence.clear()
}
</script>

<template>
  <section class="sentence-bar" aria-labelledby="sentence-bar-title">
    <h2 id="sentence-bar-title" class="visually-hidden">Frase</h2>

    <div class="sentence-bar__phrase">
      <ol v-if="!sentence.isEmpty" class="sentence-bar__items">
        <li
          v-for="(card, index) in sentence.items"
          :key="index"
          class="sentence-bar__item"
          :style="{ '--word-color': `var(--color-${card.wordClass})` }"
        >
          {{ card.label }}
        </li>
      </ol>
      <p v-else class="sentence-bar__placeholder">Toque nos cards para montar uma frase.</p>
    </div>

    <div class="sentence-bar__actions">
      <button
        ref="speakButton"
        type="button"
        class="btn btn--primary sentence-bar__speak"
        @click="onSpeak"
      >
        <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor" />
          <path
            d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        {{ isSupported ? 'Falar' : 'Mostrar frase' }}
      </button>
      <button type="button" class="btn sentence-bar__secondary" @click="sentence.removeLast()">
        <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7zM12 9l6 6M18 9l-6 6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Apagar último
      </button>
      <button type="button" class="btn sentence-bar__secondary" @click="sentence.clear()">
        <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Limpar
      </button>
    </div>

    <p role="status" class="visually-hidden">{{ announcement }}</p>

    <!-- Ao fechar, o foco volta para o botão que abriu o diálogo -->
    <LargeTextDialog ref="largeTextDialog" :text="largeText" @close="speakButtonRef?.focus()" />
  </section>
</template>

<style scoped>
.sentence-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}

/* A frase ocupa quase todo o espaço; as ações só vão para a linha de baixo em telas estreitas */
.sentence-bar__phrase {
  display: flex;
  flex: 999 1 18rem;
  align-items: center;
  min-height: 4.5rem;
}

.sentence-bar__items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: 0;
  list-style: none;
}

.sentence-bar__item {
  padding: var(--space-1) var(--space-3);
  border: var(--border-width) solid var(--color-border);
  border-left: var(--stripe-width) solid var(--word-color);
  border-radius: var(--radius-small);
  background: var(--color-bg);
  font-size: calc(1.375rem * var(--font-scale));
  font-weight: 600;
  line-height: 1.3;
}

.sentence-bar__placeholder {
  color: var(--color-text-muted);
  font-size: calc(1.125rem * var(--font-scale));
}

.sentence-bar__actions {
  display: grid;
  flex: 1 1 22rem;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--gap);
}

/* Falar: o botão maior e mais destacado */
.sentence-bar__speak {
  min-height: 4.5rem;
  font-size: calc(1.5rem * var(--font-scale));
}

.sentence-bar__secondary {
  flex-direction: column;
  gap: var(--space-1);
  min-height: 4.5rem;
  padding-inline: var(--space-2);
  font-size: calc(1rem * var(--font-scale));
}

/* Celulares estreitos: ícone acima do texto em todos os botões, para caberem lado a lado */
@media (max-width: 26rem) {
  .sentence-bar__speak {
    flex-direction: column;
    gap: var(--space-1);
    padding-inline: var(--space-1);
  }

  .sentence-bar__secondary {
    padding-inline: var(--space-1);
  }
}
</style>
