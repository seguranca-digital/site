import { readonly, ref, shallowRef } from 'vue'
import { useSettingsStore } from '../stores/settingsStore'

// Normaliza o código de idioma: alguns Androids usam "pt_BR" em vez de "pt-BR"
function normalizeLang(lang: string): string {
  return lang.replace('_', '-').toLowerCase()
}

/**
 * Escolhe a voz nesta ordem: voz configurada → pt-BR local (funciona offline)
 * → qualquer pt-BR → qualquer pt* → null (padrão do navegador).
 */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  preferredURI: string | null,
): SpeechSynthesisVoice | null {
  if (preferredURI) {
    const preferred = voices.find((voice) => voice.voiceURI === preferredURI)
    if (preferred) return preferred
  }

  const ptBR = voices.filter((voice) => normalizeLang(voice.lang) === 'pt-br')
  const anyPt = voices.find((voice) => {
    const lang = normalizeLang(voice.lang)
    return lang === 'pt' || lang.startsWith('pt-')
  })

  return ptBR.find((voice) => voice.localService) ?? ptBR[0] ?? anyPt ?? null
}

// Estado compartilhado por todos os componentes que usam a fala
const isSupported =
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  'SpeechSynthesisUtterance' in window
const voices = shallowRef<SpeechSynthesisVoice[]>([])
const isSpeaking = ref(false)
let initialized = false
// Guarda a fala atual: no Chrome, sem uma referência, a utterance pode ser
// coletada pelo garbage collector e o evento `end` nunca dispara
let currentUtterance: SpeechSynthesisUtterance | null = null
let currentIsPreview = false

// Volume relativo da varredura auditiva (nome do item destacado)
const PREVIEW_VOLUME = 0.5

export interface SpeakOptions {
  // Varredura auditiva: fala mais baixo e nunca interrompe uma palavra ou frase em andamento
  preview?: boolean
}

function loadVoices() {
  voices.value = window.speechSynthesis.getVoices()
}

function init() {
  if (initialized || !isSupported) return
  initialized = true
  loadVoices()
  // getVoices() costuma vir vazio no primeiro acesso; a lista chega depois pelo evento voiceschanged
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
}

export function useSpeech() {
  init()
  const settings = useSettingsStore()

  function speak(text: string, options: SpeakOptions = {}) {
    const trimmed = text.trim()
    if (!isSupported || trimmed === '') return

    const synth = window.speechSynthesis
    const preview = options.preview ?? false
    const isTalking = currentUtterance !== null && (synth.speaking || synth.pending)
    if (preview && isTalking && !currentIsPreview) return

    // Cancela a fala anterior para não enfileirar
    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(trimmed)
    utterance.lang = 'pt-BR'
    const voice = pickVoice(voices.value, settings.voiceURI)
    if (voice) utterance.voice = voice
    utterance.rate = settings.rate
    utterance.pitch = settings.pitch
    utterance.volume = preview ? settings.volume * PREVIEW_VOLUME : settings.volume

    utterance.onstart = () => {
      isSpeaking.value = true
    }
    // Ignora o fim de falas antigas, que chega depois do cancel()
    utterance.onend = utterance.onerror = () => {
      if (currentUtterance !== utterance) return
      currentUtterance = null
      isSpeaking.value = false
    }

    currentUtterance = utterance
    currentIsPreview = preview
    synth.speak(utterance)
  }

  function stop() {
    if (!isSupported) return
    currentUtterance = null
    window.speechSynthesis.cancel()
    isSpeaking.value = false
  }

  return {
    speak,
    stop,
    voices: readonly(voices),
    isSupported,
    isSpeaking: readonly(isSpeaking),
  }
}
