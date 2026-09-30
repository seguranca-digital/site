import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../src/App.vue'
import { useSettingsStore } from '../src/stores/settingsStore'
import SettingsView from '../src/views/SettingsView.vue'

// Web Speech API simulada, com vozes em vários idiomas (antes de importar o useSpeech)
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
  const voice = (name: string, lang: string, localService: boolean) => ({
    name,
    lang,
    localService,
    voiceURI: `uri:${name}`,
    default: false,
  })
  const fake = {
    speaking: false,
    pending: false,
    speak: vi.fn<(utterance: FakeUtterance) => void>(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => [
      voice('English US', 'en-US', true),
      voice('Joana', 'pt-PT', true),
      voice('Google português do Brasil', 'pt-BR', false),
      voice('Luciana', 'pt_BR', true),
    ]),
    addEventListener: vi.fn(),
  }
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  vi.stubGlobal('speechSynthesis', fake)
  return fake
})

// O jsdom não implementa <dialog>.showModal(): simulação mínima para o ConfirmDialog
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (returnValue?: string) {
    if (returnValue !== undefined) this.returnValue = returnValue
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: SettingsView },
      { path: '/editor', component: { render: () => null } },
      { path: '/sobre', name: 'about', component: { render: () => null } },
    ],
  })
}

async function mountView(component: typeof App | typeof SettingsView = SettingsView) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createTestRouter()
  await router.push('/')
  const wrapper = mount(component, { global: { plugins: [pinia, router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, settings: useSettingsStore() }
}

function rangeByLabel(wrapper: VueWrapper, label: string) {
  const labelElement = wrapper.findAll('label').find((item) => item.text() === label)
  if (!labelElement) throw new Error(`Controle "${label}" não encontrado`)
  return wrapper.find(`#${labelElement.attributes('for')}`)
}

function findButton(wrapper: VueWrapper, text: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === text)
  if (!button) throw new Error(`Botão "${text}" não encontrado`)
  return button
}

describe('SettingsView', () => {
  beforeEach(() => {
    synth.speak.mockClear()
    document.body.innerHTML = ''
  })

  it('lista só as vozes em português, pt-BR primeiro, marcando as que funcionam offline', async () => {
    const { wrapper } = await mountView()
    const options = wrapper.findAll('select option').map((option) => option.text())
    expect(options).toEqual([
      'Automática: Luciana (offline)',
      'Luciana (offline)',
      'Google português do Brasil',
      'Joana [pt-PT] (offline)',
    ])
  })

  it('"Testar voz" fala com a voz, a velocidade e o tom escolhidos', async () => {
    const { wrapper, settings } = await mountView()
    await wrapper.find('select').setValue('uri:Google português do Brasil')
    expect(settings.voiceURI).toBe('uri:Google português do Brasil')

    await rangeByLabel(wrapper, 'Velocidade').setValue('1.5')
    await rangeByLabel(wrapper, 'Tom').setValue('0.8')
    await findButton(wrapper, 'Testar voz').trigger('click')

    const [utterance] = synth.speak.mock.calls.at(-1)!
    expect(utterance.voice?.name).toBe('Google português do Brasil')
    expect(utterance.rate).toBe(1.5)
    expect(utterance.pitch).toBe(0.8)
  })

  it('os controles deslizantes mudam a configuração na hora e dizem o valor por extenso', async () => {
    const { wrapper, settings } = await mountView()
    const interval = rangeByLabel(wrapper, 'Tempo de cada destaque')
    await interval.setValue('2500')
    expect(settings.scanning.intervalMs).toBe(2500)
    expect(interval.attributes('aria-valuetext')).toBe('2,5 segundos')

    const acceptance = rangeByLabel(wrapper, 'Tempo de aceitação')
    expect(acceptance.attributes('aria-valuetext')).toBe('desligado')
    await acceptance.setValue('300')
    expect(acceptance.attributes('aria-valuetext')).toBe('0,3 segundo')

    await rangeByLabel(wrapper, 'Colunas da grade').setValue('6')
    expect(settings.gridColumns).toBe(6)
  })

  it('caixas de seleção e opções mudam a configuração', async () => {
    const { wrapper, settings } = await mountView()
    const checkbox = (label: string) =>
      wrapper.findAll('label.check').find((item) => item.text() === label)!.find('input')

    await checkbox('Mostrar o texto abaixo do pictograma').setValue(false)
    await checkbox('Limpar a frase depois de falar').setValue(true)
    await checkbox('Ligar a varredura').setValue(true)
    await checkbox('Varredura auditiva').setValue(true)
    expect(settings.showLabels).toBe(false)
    expect(settings.clearAfterSpeak).toBe(true)
    expect(settings.scanning.enabled).toBe(true)
    expect(settings.scanning.auditoryPreview).toBe(true)

    await wrapper.find('input[name="modo-varredura"][value="dois-botoes"]').setValue(true)
    expect(settings.scanning.mode).toBe('dois-botoes')
  })

  it('tema e tamanho do texto são aplicados no documento na hora', async () => {
    const { wrapper, settings } = await mountView(App)
    const root = document.documentElement
    expect(root.dataset.theme).toBe('claro')

    await wrapper.find('input[name="tema"][value="alto-contraste"]').setValue(true)
    expect(settings.theme).toBe('alto-contraste')
    expect(root.dataset.theme).toBe('alto-contraste')

    await rangeByLabel(wrapper, 'Tamanho do texto').setValue('1.5')
    expect(root.style.getPropertyValue('--font-scale')).toBe('1.5')
  })

  it('restaurar o padrão pede confirmação', async () => {
    const { wrapper, settings } = await mountView()
    settings.theme = 'escuro'
    settings.gridColumns = 6

    await findButton(wrapper, 'Restaurar configurações padrão').trigger('click')
    const dialog = wrapper.find('dialog')
    expect(dialog.attributes('open')).toBeDefined()

    // Cancelar não muda nada
    await findButton(wrapper, 'Cancelar').trigger('click')
    await flushPromises()
    expect(settings.theme).toBe('escuro')

    await findButton(wrapper, 'Restaurar configurações padrão').trigger('click')
    await findButton(wrapper, 'Restaurar').trigger('click')
    await flushPromises()
    expect(settings.theme).toBe('claro')
    expect(settings.gridColumns).toBe(4)
  })
})
