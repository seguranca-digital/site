import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import BoardView from '../src/views/BoardView.vue'

// O jsdom não tem Web Speech API: simula antes de importar os módulos,
// porque o useSpeech detecta o suporte ao ser carregado
const synth = vi.hoisted(() => {
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
  const fake = {
    speak: vi.fn<(utterance: FakeUtterance) => void>(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
    addEventListener: vi.fn(),
  }
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  vi.stubGlobal('speechSynthesis', fake)
  return fake
})

function findButton(wrapper: VueWrapper, text: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === text)
  if (!button) throw new Error(`Botão "${text}" não encontrado`)
  return button
}

function sentenceLabels(wrapper: VueWrapper): string[] {
  return wrapper.findAll('.sentence-bar__item').map((item) => item.text())
}

function spokenTexts(): string[] {
  return synth.speak.mock.calls.map(([utterance]) => utterance.text)
}

describe('BoardView', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    synth.speak.mockClear()
    synth.cancel.mockClear()
    wrapper = mount(BoardView, { global: { plugins: [createPinia()] } })
  })

  it('monta "eu quero água" e fala a frase ao tocar em Falar', async () => {
    await findButton(wrapper, 'eu').trigger('click')
    await findButton(wrapper, 'Ações').trigger('click')
    await findButton(wrapper, 'quero').trigger('click')
    await findButton(wrapper, 'Comida e bebida').trigger('click')
    await findButton(wrapper, 'água').trigger('click')

    // speakOnTap ligado por padrão: cada card é falado ao ser tocado
    expect(spokenTexts()).toEqual(['eu', 'quero', 'água'])
    expect(sentenceLabels(wrapper)).toEqual(['eu', 'quero', 'água'])

    synth.speak.mockClear()
    synth.cancel.mockClear()
    await findButton(wrapper, 'Falar').trigger('click')

    expect(spokenTexts()).toEqual(['eu quero água'])
    const [utterance] = synth.speak.mock.calls[0]!
    expect(utterance.lang).toBe('pt-BR')
    expect(utterance.rate).toBe(0.9)
    // cancela a fala anterior antes de falar, para não enfileirar
    expect(synth.cancel).toHaveBeenCalledBefore(synth.speak)
  })

  it('fala o texto de `speech` nas frases rápidas', async () => {
    await findButton(wrapper, 'Banheiro').trigger('click')
    expect(spokenTexts()).toEqual(['preciso ir ao banheiro'])
  })

  it('Falar com a frase vazia não faz nada', async () => {
    await findButton(wrapper, 'Falar').trigger('click')
    expect(synth.speak).not.toHaveBeenCalled()
  })

  it('Apagar último e Limpar alteram a frase', async () => {
    await findButton(wrapper, 'eu').trigger('click')
    await findButton(wrapper, 'você').trigger('click')
    await findButton(wrapper, 'Apagar último').trigger('click')
    expect(sentenceLabels(wrapper)).toEqual(['eu'])

    await findButton(wrapper, 'Limpar').trigger('click')
    expect(sentenceLabels(wrapper)).toEqual([])
  })

  it('marca a aba ativa com aria-selected', async () => {
    await findButton(wrapper, 'Lugares').trigger('click')
    const selected = wrapper.findAll('[role="tab"][aria-selected="true"]')
    expect(selected.map((tab) => tab.text())).toEqual(['Lugares'])
    expect(wrapper.find('[role="tabpanel"]').attributes('aria-labelledby')).toBe('aba-lugares')
  })
})
