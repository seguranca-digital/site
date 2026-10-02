import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useBoardStore } from '../src/stores/boardStore'
import { useSettingsStore } from '../src/stores/settingsStore'
import BoardView from '../src/views/BoardView.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: BoardView },
      { path: '/editor', component: { render: () => null } },
      { path: '/configuracoes', component: { render: () => null } },
    ],
  })
}

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
    speaking: false,
    pending: false,
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
    wrapper = mount(BoardView, { global: { plugins: [createPinia(), createTestRouter()] } })
  })

  it('monta "eu quero água" e fala a frase ao tocar em Falar', async () => {
    await findButton(wrapper, 'eu').trigger('click')
    await findButton(wrapper, 'Ações').trigger('click')
    await findButton(wrapper, 'quero').trigger('click')
    await findButton(wrapper, 'Comida e bebida').trigger('click')
    await findButton(wrapper, 'água').trigger('click')

    expect(spokenTexts()).toEqual(['eu', 'quero', 'água'])
    expect(sentenceLabels(wrapper)).toEqual(['eu', 'quero', 'água'])

    synth.speak.mockClear()
    synth.cancel.mockClear()
    await findButton(wrapper, 'Falar').trigger('click')

    expect(spokenTexts()).toEqual(['eu quero água'])
    const [utterance] = synth.speak.mock.calls[0]!
    expect(utterance.lang).toBe('pt-BR')
    expect(utterance.rate).toBe(0.9)
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

  it('abas com rolagem lateral no celular, menos com a varredura ligada', async () => {
    const tablist = () => wrapper.find('[role="tablist"]')
    expect(tablist().classes()).toContain('category-tabs__list--scroll')

    useSettingsStore().scanning.enabled = true
    await nextTick()
    expect(tablist().classes()).not.toContain('category-tabs__list--scroll')
    useSettingsStore().scanning.enabled = false
  })

  it('a frase montada recebe foco, para rolar pelo teclado quando não cabe na barra', async () => {
    await findButton(wrapper, 'eu').trigger('click')
    const phrase = wrapper.find('.sentence-bar__items')
    expect(phrase.attributes('tabindex')).toBe('0')
    expect(phrase.attributes('aria-label')).toBe('Frase montada')
  })

  it('botões do parceiro mantêm o texto como nome, mesmo quando só o ícone aparece', () => {
    const labels = wrapper.findAll('.board__tool-label').map((label) => label.text())
    expect(labels).toEqual(['Editar prancha', 'Configurações'])
  })

  it('com os rótulos ocultos, o card mostra só o pictograma, mas continua com o nome', async () => {
    useSettingsStore().showLabels = false
    await nextTick()
    const card = findButton(wrapper, 'eu')
    expect(card.find('.comm-card__label').classes()).toContain('visually-hidden')
  })

  it('card sem imagem mostra o texto mesmo com os rótulos ocultos', async () => {
    useSettingsStore().showLabels = false
    useBoardStore().board.cards['eu']!.picto = { kind: 'none' }
    await nextTick()
    const card = findButton(wrapper, 'eu')
    expect(card.find('.comm-card__label').classes()).not.toContain('visually-hidden')
  })
})

describe('Entrada protegida do editor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  async function setup(label = 'Editar prancha') {
    const router = createTestRouter()
    await router.push('/')
    const wrapper = mount(BoardView, { global: { plugins: [createPinia(), router] } })
    const gear = wrapper.findAll('button').find((button) => button.text().startsWith(label))!
    return { router, gear }
  }

  it('segurar a engrenagem por 2 s abre o editor', async () => {
    const { router, gear } = await setup()
    gear.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    vi.advanceTimersByTime(2000)
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/editor'))
  })

  it('toque rápido na engrenagem não abre o editor', async () => {
    const { router, gear } = await setup()
    gear.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    vi.advanceTimersByTime(300)
    gear.element.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    vi.advanceTimersByTime(5000)
    await nextTick()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('segurar "Configurações" por 2 s abre as configurações; toque rápido não', async () => {
    const { router, gear } = await setup('Configurações')
    gear.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    vi.advanceTimersByTime(500)
    gear.element.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(router.currentRoute.value.path).toBe('/')

    gear.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    vi.advanceTimersByTime(2000)
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/configuracoes'))
  })

  it('pelo teclado: segurar Enter por 2 s abre o editor', async () => {
    const { router, gear } = await setup()
    await gear.trigger('keydown', { key: 'Enter' })
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(100)
      await gear.trigger('keydown', { key: 'Enter', repeat: true })
    }
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/editor'))
  })
})

describe('BoardView com varredura', () => {
  const INTERVAL = 1500
  let wrapper: VueWrapper

  async function flush() {
    for (let i = 0; i < 4; i++) await nextTick()
  }

  async function mountScanning(configure?: (settings: ReturnType<typeof useSettingsStore>) => void) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const settings = useSettingsStore()
    settings.scanning.enabled = true
    configure?.(settings)
    wrapper = mount(BoardView, {
      global: { plugins: [pinia, createTestRouter()] },
      attachTo: document.body,
    })
    await flush()
    return settings
  }

  async function keyDown(key: string) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    await flush()
  }

  async function keyUp(key: string) {
    window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }))
    await flush()
  }

  async function press(key: string) {
    await keyDown(key)
    await keyUp(key)
  }

  async function tap(selector: string, clientX = 900) {
    const target = document.querySelector(selector)!
    target.dispatchEvent(new MouseEvent('pointerdown', { clientX, bubbles: true }))
    target.dispatchEvent(new MouseEvent('pointerup', { clientX, bubbles: true }))
    await flush()
  }

  async function wait(ms: number) {
    vi.advanceTimersByTime(ms)
    await flush()
  }

  function highlight(): string | null {
    const element = document.querySelector<HTMLElement>('[data-scan-highlight]')
    if (!element) return null
    return element.dataset.scanGroup ?? element.dataset.scanItem ?? element.textContent!.trim()
  }

  async function waitFor(target: string) {
    for (let step = 0; step < 20; step++) {
      if (highlight() === target) return
      await wait(INTERVAL)
    }
    throw new Error(`O destaque não chegou em "${target}" (está em "${highlight()}")`)
  }

  beforeEach(() => {
    vi.useFakeTimers()
    synth.speak.mockClear()
    synth.speaking = false
  })

  afterEach(() => {
    wrapper.unmount()
    vi.useRealTimers()
  })

  it('monta e fala "eu quero água" usando só a barra de espaço', async () => {
    await mountScanning()
    expect(highlight()).toBe('acoes-frase')
    expect((document.activeElement as HTMLElement).dataset.scanGroup).toBe('acoes-frase')

    await waitFor('linha-1')
    await press(' ')
    await waitFor('card:eu')
    await press(' ')

    await waitFor('categorias')
    await press(' ')
    await waitFor('aba:acoes')
    await press(' ')
    await waitFor('linha-1')
    await press(' ')
    await waitFor('card:quero')
    await press(' ')

    await waitFor('categorias')
    await press(' ')
    await waitFor('aba:comida-e-bebida')
    await press(' ')
    await waitFor('linha-1')
    await press(' ')
    await waitFor('card:agua')
    await press(' ')

    await waitFor('acoes-frase')
    await press(' ')
    await waitFor('falar')
    await press(' ')

    expect(sentenceLabels(wrapper)).toEqual(['eu', 'quero', 'água'])
    expect(spokenTexts().at(-1)).toBe('eu quero água')
  })

  it('"↩ Voltar" é o último item do grupo e volta sem executar nada', async () => {
    await mountScanning()
    await press(' ')
    await waitFor('↩ Voltar')
    await press(' ')
    expect(highlight()).toBe('acoes-frase')
    expect(sentenceLabels(wrapper)).toEqual([])
    expect(synth.speak).not.toHaveBeenCalled()
  })

  it('pausa depois de 3 voltas sem seleção e mostra "Pressione para continuar"', async () => {
    await mountScanning()
    await wait(6 * 3 * INTERVAL)
    expect(highlight()).toBeNull()
    expect(wrapper.text()).toContain('Pressione para continuar')

    await press(' ')
    expect(highlight()).toBe('acoes-frase')
    expect(sentenceLabels(wrapper)).toEqual([])
  })

  it('toque em qualquer ponto da tela funciona como acionador', async () => {
    await mountScanning()
    await tap('.scan-overlay')
    expect(highlight()).toBe('falar')
  })

  it('tempo de aceitação: toque curto não vale; segurar o tempo todo vale', async () => {
    await mountScanning((settings) => {
      settings.scanning.acceptanceMs = 500
      settings.scanning.intervalMs = 60_000
    })
    await keyDown(' ')
    await wait(300)
    await keyUp(' ')
    expect(highlight()).toBe('acoes-frase')

    await keyDown(' ')
    await wait(500)
    expect(highlight()).toBe('falar')
    await keyUp(' ')
  })

  it('modo dois botões: Espaço avança e Enter seleciona, sem timer', async () => {
    await mountScanning((settings) => {
      settings.scanning.mode = 'dois-botoes'
    })
    await wait(10 * INTERVAL)
    expect(highlight()).toBe('acoes-frase')

    await press(' ')
    await press(' ')
    await press(' ')
    expect(highlight()).toBe('linha-1')
    await press('Enter')
    expect(highlight()).toBe('card:eu')
    await press('Enter')
    expect(sentenceLabels(wrapper)).toEqual(['eu'])
  })

  it('modo dois botões: metade esquerda da tela avança, metade direita seleciona', async () => {
    await mountScanning((settings) => {
      settings.scanning.mode = 'dois-botoes'
    })
    await tap('.scan-overlay', 100)
    expect(highlight()).toBe('frases-rapidas')
    await tap('.scan-overlay', window.innerWidth - 100)
    expect(highlight()).toBe('card:fr-sim')
  })

  it('varredura auditiva fala o destaque mais baixo, sem cortar a fala de um card', async () => {
    await mountScanning((settings) => {
      settings.scanning.auditoryPreview = true
    })
    const [first] = synth.speak.mock.calls.at(-1)!
    expect(first.text).toBe('Ações da frase')
    expect(first.volume).toBe(0.5)

    await waitFor('linha-1')
    await press(' ')
    expect(synth.speak.mock.calls.at(-1)![0]).toMatchObject({ text: 'eu', volume: 0.5 })

    synth.speaking = true
    await press(' ')
    expect(synth.speak.mock.calls.at(-1)![0]).toMatchObject({ text: 'eu', volume: 1 })
    await wait(INTERVAL)
    expect(spokenTexts().at(-1)).toBe('eu')

    synth.speaking = false
    await wait(INTERVAL)
    expect(spokenTexts().at(-1)).toBe('Categorias')
  })

  it('segurar "Desligar varredura" por 2 s desliga; toque rápido nele é acionamento', async () => {
    await mountScanning()
    await tap('.scan-bar__off')
    expect(highlight()).toBe('falar')

    const off = document.querySelector('.scan-bar__off')!
    off.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await wait(2000)
    expect(document.querySelector('.scan-overlay')).toBeNull()
    expect(document.querySelector('[data-scan-highlight]')).toBeNull()
  })

  it('Esc desliga a varredura e devolve o foco ao botão Varredura', async () => {
    await mountScanning()
    await press('Escape')
    expect(document.querySelector('.scan-overlay')).toBeNull()
    expect(document.querySelector('[data-scan-highlight]')).toBeNull()
    expect(document.activeElement?.textContent?.trim()).toBe('Varredura')
  })
})
