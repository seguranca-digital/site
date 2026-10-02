<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import SettingsCheck from '../components/SettingsCheck.vue'
import SettingsRange from '../components/SettingsRange.vue'
import { pickVoice, useSpeech } from '../composables/useSpeech'
import { createDefaultSettings, SETTINGS_LIMITS, useSettingsStore } from '../stores/settingsStore'
import type { Settings } from '../types'

const settings = useSettingsStore()
const { speak, voices, isSupported } = useSpeech()
const confirmRef = useTemplateRef<InstanceType<typeof ConfirmDialog>>('confirm')
const voiceId = useId()
const voiceHintId = useId()
const announcement = ref('')

function isPortuguese(voice: SpeechSynthesisVoice): boolean {
  const lang = voice.lang.replace('_', '-').toLowerCase()
  return lang === 'pt' || lang.startsWith('pt-')
}

function isBrazilian(voice: SpeechSynthesisVoice): boolean {
  return voice.lang.replace('_', '-').toLowerCase() === 'pt-br'
}

const portugueseVoices = computed(() =>
  voices.value.filter(isPortuguese).sort((a, b) => {
    const rank = (voice: SpeechSynthesisVoice) =>
      (isBrazilian(voice) ? 0 : 2) + (voice.localService ? 0 : 1)
    return rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR')
  }),
)

function voiceLabel(voice: SpeechSynthesisVoice): string {
  const region = isBrazilian(voice) ? '' : ` [${voice.lang}]`
  return `${voice.name}${region}${voice.localService ? ' (offline)' : ''}`
}

const automaticLabel = computed(() => {
  const voice = pickVoice(voices.value, null)
  return voice ? `Automática: ${voiceLabel(voice)}` : 'Automática (voz padrão do navegador)'
})

const missingVoice = computed(
  () =>
    settings.voiceURI !== null &&
    voices.value.length > 0 &&
    !voices.value.some((voice) => voice.voiceURI === settings.voiceURI),
)

function testVoice() {
  speak('Olá! Esta é a voz do comunicador.')
}

function decimal(value: number, digits = 1): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function seconds(ms: number): string {
  const value = ms / 1000
  const text = value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `${text} ${value < 2 ? 'segundo' : 'segundos'}`
}

const formats = {
  rate: (value: number) => `${decimal(value)}× (${value === 1 ? 'normal' : value < 1 ? 'mais devagar' : 'mais rápido'})`,
  pitch: (value: number) => `${decimal(value)} (${value === 1 ? 'normal' : value < 1 ? 'mais grave' : 'mais agudo'})`,
  percent: (value: number) => `${Math.round(value * 100)}%`,
  columns: (value: number) => `até ${value} colunas`,
  seconds,
  acceptance: (value: number) => (value === 0 ? 'desligado' : seconds(value)),
  loops: (value: number) => (value === 1 ? '1 volta' : `${value} voltas`),
}

const themes: { value: Settings['theme']; label: string }[] = [
  { value: 'claro', label: 'Claro' },
  { value: 'escuro', label: 'Escuro' },
  { value: 'alto-contraste', label: 'Alto contraste (preto, branco e amarelo)' },
]

const scanModes: { value: Settings['scanning']['mode']; label: string }[] = [
  { value: 'automatica', label: 'Automática: o destaque anda sozinho e um acionador seleciona' },
  {
    value: 'dois-botoes',
    label: 'Dois botões: Espaço (ou metade esquerda da tela) avança e Enter (ou metade direita) seleciona',
  },
]

async function restoreDefaults() {
  const confirmed = await confirmRef.value?.ask({
    title: 'Restaurar configurações',
    message:
      'Voltar todas as configurações (voz, prancha, aparência e varredura) para o padrão? ' +
      'As categorias e os cards não mudam.',
    confirmLabel: 'Restaurar',
    danger: true,
  })
  if (!confirmed) return
  settings.$patch(createDefaultSettings())
  announcement.value = 'Configurações restauradas para o padrão.'
}
</script>

<template>
  <div class="page">
    <nav class="page__nav" aria-label="Telas">
      <RouterLink to="/" class="btn btn--small">
        <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M15 5l-7 7 7 7"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Voltar para a prancha
      </RouterLink>
      <RouterLink to="/editor" class="btn btn--small">Editor da prancha</RouterLink>
    </nav>

    <h1 tabindex="-1">Configurações</h1>
    <p class="page__intro">As alterações valem na hora e ficam salvas neste aparelho.</p>

    <div class="settings__sections">
      <section class="settings__section" aria-labelledby="config-voz">
        <h2 id="config-voz">Voz</h2>

        <p v-if="!isSupported" class="notice">
          Este navegador não tem suporte à fala. A prancha mostra a frase em letras grandes no
          lugar da voz.
        </p>

        <template v-else>
          <div class="field">
            <label :for="voiceId">Voz</label>
            <select
              :id="voiceId"
              v-model="settings.voiceURI"
              class="input"
              :aria-describedby="voiceHintId"
            >
              <option :value="null">{{ automaticLabel }}</option>
              <option
                v-for="voice in portugueseVoices"
                :key="voice.voiceURI"
                :value="voice.voiceURI"
              >
                {{ voiceLabel(voice) }}
              </option>
              <option v-if="missingVoice" :value="settings.voiceURI">
                Voz de outro aparelho (indisponível aqui; usando a automática)
              </option>
            </select>
            <p :id="voiceHintId" class="field__hint">
              <template v-if="portugueseVoices.length > 0">
                As vozes marcadas com "(offline)" funcionam sem internet.
              </template>
              <template v-else>
                Nenhuma voz em português foi encontrada neste aparelho; o navegador vai usar a voz
                padrão.
              </template>
            </p>
          </div>

          <SettingsRange
            v-model="settings.rate"
            label="Velocidade"
            :limits="SETTINGS_LIMITS.rate"
            :format="formats.rate"
          />
          <SettingsRange
            v-model="settings.pitch"
            label="Tom"
            :limits="SETTINGS_LIMITS.pitch"
            :format="formats.pitch"
          />
          <SettingsRange
            v-model="settings.volume"
            label="Volume"
            :limits="SETTINGS_LIMITS.volume"
            :format="formats.percent"
          />

          <button type="button" class="btn btn--small btn--primary settings__test" @click="testVoice">
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
            Testar voz
          </button>
        </template>
      </section>

      <section class="settings__section" aria-labelledby="config-prancha">
        <h2 id="config-prancha">Prancha</h2>

        <SettingsRange
          v-model="settings.gridColumns"
          label="Colunas da grade"
          :limits="SETTINGS_LIMITS.gridColumns"
          :format="formats.columns"
          hint="Em telas estreitas cabem menos colunas, para os cards não ficarem pequenos demais."
        />
        <SettingsRange
          v-model="settings.fontScale"
          label="Tamanho do texto"
          :limits="SETTINGS_LIMITS.fontScale"
          :format="formats.percent"
          hint="Vale para os cards, as abas e a barra de frase. Os cards crescem junto."
        />
        <SettingsCheck
          v-model="settings.showLabels"
          label="Mostrar o texto abaixo do pictograma"
          hint="Desligado, o card mostra só o pictograma. O leitor de tela continua lendo a palavra."
        />
        <SettingsCheck v-model="settings.speakOnTap" label="Falar a palavra ao tocar no card" />
        <SettingsCheck v-model="settings.clearAfterSpeak" label="Limpar a frase depois de falar" />
      </section>

      <section class="settings__section" aria-labelledby="config-aparencia">
        <h2 id="config-aparencia">Aparência</h2>

        <fieldset class="choice-group">
          <legend>Tema</legend>
          <label v-for="theme in themes" :key="theme.value" class="check">
            <input v-model="settings.theme" type="radio" name="tema" :value="theme.value" />
            {{ theme.label }}
          </label>
        </fieldset>
      </section>

      <section class="settings__section" aria-labelledby="config-varredura">
        <h2 id="config-varredura">Varredura</h2>

        <SettingsCheck
          v-model="settings.scanning.enabled"
          label="Ligar a varredura"
          hint="Também dá para ligar e desligar pelo botão Varredura, na prancha."
        />

        <fieldset class="choice-group">
          <legend>Modo</legend>
          <label v-for="mode in scanModes" :key="mode.value" class="check">
            <input
              v-model="settings.scanning.mode"
              type="radio"
              name="modo-varredura"
              :value="mode.value"
            />
            {{ mode.label }}
          </label>
        </fieldset>

        <SettingsRange
          v-model="settings.scanning.intervalMs"
          label="Tempo de cada destaque"
          :limits="SETTINGS_LIMITS.intervalMs"
          :format="formats.seconds"
          hint="Só na varredura automática."
        />
        <SettingsRange
          v-model="settings.scanning.acceptanceMs"
          label="Tempo de aceitação"
          :limits="SETTINGS_LIMITS.acceptanceMs"
          :format="formats.acceptance"
          hint="Quanto tempo o acionador precisa ficar pressionado para valer. Filtra toques acidentais e tremores."
        />
        <SettingsRange
          v-model="settings.scanning.loopsBeforePause"
          label="Voltas antes de pausar"
          :limits="SETTINGS_LIMITS.loopsBeforePause"
          :format="formats.loops"
          hint="Voltas sem nenhuma seleção até a varredura pausar. Só na varredura automática."
        />
        <SettingsCheck
          v-model="settings.scanning.auditoryPreview"
          label="Varredura auditiva"
          hint="Fala baixinho o nome de cada item destacado, para quem enxerga pouco."
        />
      </section>
    </div>

    <div class="settings__reset">
      <button type="button" class="btn btn--small btn--danger" @click="restoreDefaults">
        Restaurar configurações padrão
      </button>
    </div>

    <p class="visually-hidden" role="status">{{ announcement }}</p>
    <ConfirmDialog ref="confirm" />
  </div>
</template>

<style scoped>
.settings__sections {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 56rem) {
  .settings__sections {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}

.settings__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-4);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}

.settings__test {
  align-self: flex-start;
}

.settings__reset {
  padding-top: var(--space-4);
  border-top: var(--border-width) solid var(--color-border);
}
</style>
