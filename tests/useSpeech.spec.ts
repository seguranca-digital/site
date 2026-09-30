import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Testes do useSpeech com a Web Speech API simulada (o jsdom não tem speechSynthesis).
// O módulo guarda estado (suporte detectado ao carregar, lista de vozes), então cada
// teste recarrega o módulo com um speechSynthesis falso novo.

class FakeUtterance {
  lang = ''
  voice: SpeechSynthesisVoice | null = null
  rate = 1
  pitch = 1
  volume = 1
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public text: string) {}
}

function makeVoice(voiceURI: string, lang: string, localService = false): SpeechSynthesisVoice {
  return { voiceURI, name: voiceURI, lang, localService, default: false }
}

function createFakeSynth(initialVoices: SpeechSynthesisVoice[] = []) {
  const listeners: Record<string, (() => void)[]> = {}
  let voices = initialVoices
  const synth = {
    speaking: false,
    pending: false,
    speak: vi.fn((utterance: FakeUtterance) => {
      synth.speaking = true
      utterance.onstart?.()
    }),
    cancel: vi.fn(() => {
      synth.speaking = false
    }),
    getVoices: vi.fn(() => voices),
    addEventListener: vi.fn((type: string, listener: () => void) => {
      ;(listeners[type] ??= []).push(listener)
    }),
    // Simula o navegador terminando de carregar as vozes
    loadVoices(list: SpeechSynthesisVoice[]) {
      voices = list
      listeners.voiceschanged?.forEach((listener) => listener())
    },
    // Simula o fim da fala atual
    finish(utterance: FakeUtterance) {
      synth.speaking = false
      utterance.onend?.()
    },
  }
  return synth
}

type FakeSynth = ReturnType<typeof createFakeSynth>

async function loadSpeech(synth: FakeSynth | null) {
  vi.resetModules()
  if (synth) {
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    vi.stubGlobal('speechSynthesis', synth)
  }
  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  const { useSettingsStore } = await import('../src/stores/settingsStore')
  const { useSpeech } = await import('../src/composables/useSpeech')
  return { speech: useSpeech(), settings: useSettingsStore() }
}

function spoken(synth: FakeSynth): FakeUtterance[] {
  return synth.speak.mock.calls.map(([utterance]) => utterance)
}

const ptBROnline = makeVoice('pt-br-online', 'pt-BR')
const ptBRLocal = makeVoice('pt-br-local', 'pt-BR', true)
const en = makeVoice('en', 'en-US', true)

describe('useSpeech (speechSynthesis simulado)', () => {
  let synth: FakeSynth

  beforeEach(() => {
    synth = createFakeSynth()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('carrega as vozes que chegam depois pelo evento voiceschanged', async () => {
    const { speech } = await loadSpeech(synth)
    // No primeiro acesso getVoices() vem vazio
    expect(speech.voices.value).toEqual([])

    synth.loadVoices([en, ptBRLocal])
    expect(speech.voices.value).toEqual([en, ptBRLocal])
  })

  it('fala em pt-BR com a voz local escolhida e as configurações de voz', async () => {
    const { speech, settings } = await loadSpeech(synth)
    synth.loadVoices([en, ptBROnline, ptBRLocal])
    settings.rate = 1.2
    settings.pitch = 0.8
    settings.volume = 0.6

    speech.speak('eu quero água')

    const [utterance] = spoken(synth)
    expect(utterance.text).toBe('eu quero água')
    expect(utterance.lang).toBe('pt-BR')
    expect(utterance.voice).toBe(ptBRLocal)
    expect(utterance.rate).toBe(1.2)
    expect(utterance.pitch).toBe(0.8)
    expect(utterance.volume).toBe(0.6)
  })

  it('usa a voz configurada pelo parceiro', async () => {
    const { speech, settings } = await loadSpeech(synth)
    synth.loadVoices([ptBRLocal, ptBROnline])
    settings.voiceURI = 'pt-br-online'

    speech.speak('oi')

    expect(spoken(synth)[0].voice).toBe(ptBROnline)
  })

  it('usa a voz padrão do navegador se não houver português', async () => {
    const { speech } = await loadSpeech(synth)
    synth.loadVoices([en])

    speech.speak('oi')

    expect(spoken(synth)[0].voice).toBeNull()
    expect(spoken(synth)[0].lang).toBe('pt-BR')
  })

  it('cancela a fala anterior antes de cada fala, para não enfileirar', async () => {
    const { speech } = await loadSpeech(synth)

    speech.speak('eu')
    speech.speak('quero')

    expect(synth.cancel).toHaveBeenCalledTimes(2)
    expect(synth.cancel.mock.invocationCallOrder[1]).toBeLessThan(
      synth.speak.mock.invocationCallOrder[1],
    )
    expect(spoken(synth).map((utterance) => utterance.text)).toEqual(['eu', 'quero'])
  })

  it('não fala texto vazio', async () => {
    const { speech } = await loadSpeech(synth)

    speech.speak('   ')

    expect(synth.speak).not.toHaveBeenCalled()
    expect(synth.cancel).not.toHaveBeenCalled()
  })

  it('atualiza isSpeaking no início e no fim da fala', async () => {
    const { speech } = await loadSpeech(synth)

    speech.speak('água')
    expect(speech.isSpeaking.value).toBe(true)

    synth.finish(spoken(synth)[0])
    expect(speech.isSpeaking.value).toBe(false)
  })

  it('stop() cancela a fala', async () => {
    const { speech } = await loadSpeech(synth)
    speech.speak('água')

    speech.stop()

    expect(synth.cancel).toHaveBeenCalledTimes(2)
    expect(speech.isSpeaking.value).toBe(false)
  })

  it('varredura auditiva: fala mais baixo e não interrompe uma frase em andamento', async () => {
    const { speech } = await loadSpeech(synth)

    speech.speak('Pessoas', { preview: true })
    expect(spoken(synth)[0].volume).toBe(0.5)

    // Uma frase começa; a prévia seguinte espera ela terminar
    speech.speak('eu quero água')
    speech.speak('Ações', { preview: true })
    expect(spoken(synth).map((utterance) => utterance.text)).toEqual(['Pessoas', 'eu quero água'])
  })

  it('sem suporte à Web Speech API: avisa e não quebra ao falar', async () => {
    const { speech } = await loadSpeech(null)

    expect(speech.isSupported).toBe(false)
    expect(() => speech.speak('eu quero água')).not.toThrow()
    expect(() => speech.stop()).not.toThrow()
  })
})
