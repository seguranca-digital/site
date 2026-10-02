import { readonly, ref, shallowRef } from 'vue'
import { useSettingsStore } from '../stores/settingsStore'

function normalizeLang(lang: string): string {
  return lang.replace('_', '-').toLowerCase()
}

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

const isSupported =
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  'SpeechSynthesisUtterance' in window
const voices = shallowRef<SpeechSynthesisVoice[]>([])
const isSpeaking = ref(false)
let initialized = false
let currentUtterance: SpeechSynthesisUtterance | null = null
let currentIsPreview = false

const PREVIEW_VOLUME = 0.5

export interface SpeakOptions {
  preview?: boolean
}

function loadVoices() {
  voices.value = window.speechSynthesis.getVoices()
}

function init() {
  if (initialized || !isSupported) return
  initialized = true
  loadVoices()
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
