import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HoldButton from '../src/components/HoldButton.vue'

describe('HoldButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function setup() {
    return mount(HoldButton, { slots: { default: 'Desligar' } })
  }

  // O jsdom não tem PointerEvent; um MouseEvent com o mesmo nome basta para o componente
  async function pointerDown(wrapper: ReturnType<typeof setup>, clientX: number) {
    wrapper.element.dispatchEvent(new MouseEvent('pointerdown', { clientX, bubbles: true }))
    await wrapper.vm.$nextTick()
  }

  it('segurar por 2 s completa a ação', async () => {
    const wrapper = setup()
    await pointerDown(wrapper, 10)
    vi.advanceTimersByTime(1999)
    expect(wrapper.emitted('complete')).toBeUndefined()
    vi.advanceTimersByTime(1)
    expect(wrapper.emitted('complete')).toHaveLength(1)

    // Soltar depois de completar não emite mais nada
    await wrapper.trigger('pointerup')
    expect(wrapper.emitted('release')).toBeUndefined()
  })

  it('soltar antes do tempo não completa e informa quanto tempo segurou', async () => {
    const wrapper = setup()
    await pointerDown(wrapper, 42)
    vi.advanceTimersByTime(500)
    await wrapper.trigger('pointerup')
    vi.advanceTimersByTime(5000)

    expect(wrapper.emitted('complete')).toBeUndefined()
    const [heldMs, clientX] = wrapper.emitted<[number, number | null]>('release')![0]!
    expect(heldMs).toBeGreaterThanOrEqual(500)
    expect(heldMs).toBeLessThan(2000)
    expect(clientX).toBe(42)
  })

  it('toque interrompido pelo navegador não conta', async () => {
    const wrapper = setup()
    await wrapper.trigger('pointerdown')
    await wrapper.trigger('pointercancel')
    vi.advanceTimersByTime(5000)
    expect(wrapper.emitted('complete')).toBeUndefined()
    expect(wrapper.emitted('release')).toBeUndefined()
  })

  it('teclado: segurar Enter (com keydown repetido) completa', async () => {
    const wrapper = setup()
    await wrapper.trigger('keydown', { key: 'Enter' })
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(100)
      await wrapper.trigger('keydown', { key: 'Enter', repeat: true })
    }
    expect(wrapper.emitted('complete')).toHaveLength(1)
  })

  it('teclado: soltar Enter antes do tempo não completa', async () => {
    const wrapper = setup()
    await wrapper.trigger('keydown', { key: 'Enter' })
    vi.advanceTimersByTime(800)
    await wrapper.trigger('keyup', { key: 'Enter' })
    vi.advanceTimersByTime(5000)
    expect(wrapper.emitted('complete')).toBeUndefined()
    expect(wrapper.emitted('release')).toHaveLength(1)
  })

  it('avisa o leitor de tela que é preciso segurar', () => {
    expect(setup().text()).toContain('segure por 2 segundos')
  })
})
