import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  BACK_ITEM_ID,
  createPressFilter,
  useScanning,
  type ScanStructure,
  type ScanningOptions,
} from '../src/composables/useScanning'

const INTERVAL = 1000

function setup(overrides: Partial<ScanningOptions> = {}) {
  const structure = ref<ScanStructure>({
    groups: [
      { id: 'acoes', itemIds: ['falar', 'limpar'] },
      { id: 'linha-1', itemIds: ['eu', 'voce', 'mae'] },
      { id: 'linha-2', itemIds: ['pai'] },
    ],
  })
  const onSelect = vi.fn()
  const scanning = useScanning({
    structure,
    intervalMs: INTERVAL,
    loopsBeforePause: 3,
    automatic: true,
    onSelect,
    ...overrides,
  })
  return { scanning, structure, onSelect }
}

describe('useScanning', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('começa no primeiro grupo e avança sozinho a cada intervalo, dando a volta', () => {
    const { scanning } = setup()
    scanning.start()
    expect(scanning.level.value).toBe('group')
    expect(scanning.highlightedId.value).toBe('acoes')

    vi.advanceTimersByTime(INTERVAL)
    expect(scanning.highlightedId.value).toBe('linha-1')
    vi.advanceTimersByTime(INTERVAL)
    expect(scanning.highlightedId.value).toBe('linha-2')
    vi.advanceTimersByTime(INTERVAL)
    expect(scanning.highlightedId.value).toBe('acoes')
  })

  it('selecionar um grupo percorre os itens dele, terminando em Voltar', () => {
    const { scanning } = setup()
    scanning.start()
    vi.advanceTimersByTime(INTERVAL)
    scanning.press()

    expect(scanning.level.value).toBe('item')
    expect(scanning.highlightedGroupId.value).toBe('linha-1')
    const visited = [scanning.highlightedId.value]
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(INTERVAL)
      visited.push(scanning.highlightedId.value)
    }
    expect(visited).toEqual(['eu', 'voce', 'mae', BACK_ITEM_ID])
  })

  it('selecionar um item executa a ação e volta ao primeiro grupo', () => {
    const { scanning, onSelect } = setup()
    scanning.start()
    vi.advanceTimersByTime(INTERVAL)
    scanning.press()
    vi.advanceTimersByTime(INTERVAL)
    scanning.press()

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('linha-1', 'voce')
    expect(scanning.level.value).toBe('group')
    expect(scanning.highlightedId.value).toBe('acoes')
  })

  it('reinicia a contagem do intervalo a cada acionamento', () => {
    const { scanning } = setup()
    scanning.start()
    vi.advanceTimersByTime(INTERVAL - 100)
    scanning.press()
    vi.advanceTimersByTime(INTERVAL - 1)
    expect(scanning.highlightedId.value).toBe('falar')
    vi.advanceTimersByTime(1)
    expect(scanning.highlightedId.value).toBe('limpar')
  })

  it('Voltar retorna ao nível 1 no mesmo grupo, sem executar nada', () => {
    const { scanning, onSelect } = setup()
    scanning.start()
    vi.advanceTimersByTime(2 * INTERVAL)
    scanning.press()
    vi.advanceTimersByTime(INTERVAL)
    expect(scanning.highlightedId.value).toBe(BACK_ITEM_ID)
    scanning.press()

    expect(onSelect).not.toHaveBeenCalled()
    expect(scanning.level.value).toBe('group')
    expect(scanning.highlightedId.value).toBe('linha-2')
  })

  it('pausa depois de `loopsBeforePause` voltas sem seleção; acionar retoma sem selecionar', () => {
    const { scanning, onSelect } = setup()
    scanning.start()
    vi.advanceTimersByTime(3 * 3 * INTERVAL - 1)
    expect(scanning.isPaused.value).toBe(false)
    vi.advanceTimersByTime(1)
    expect(scanning.isPaused.value).toBe(true)
    expect(scanning.highlightedId.value).toBeNull()

    vi.advanceTimersByTime(10 * INTERVAL)
    expect(scanning.highlightedId.value).toBeNull()

    scanning.press()
    expect(onSelect).not.toHaveBeenCalled()
    expect(scanning.isPaused.value).toBe(false)
    expect(scanning.highlightedId.value).toBe('acoes')
  })

  it('também pausa quando fica dando voltas dentro de um grupo', () => {
    const { scanning } = setup()
    scanning.start()
    scanning.press()
    vi.advanceTimersByTime(3 * 3 * INTERVAL)
    expect(scanning.isPaused.value).toBe(true)
    scanning.press()
    expect(scanning.level.value).toBe('group')
    expect(scanning.highlightedId.value).toBe('acoes')
  })

  it('com loopsBeforePause = 0 nunca pausa', () => {
    const { scanning } = setup({ loopsBeforePause: 0 })
    scanning.start()
    vi.advanceTimersByTime(100 * INTERVAL)
    expect(scanning.isPaused.value).toBe(false)
  })

  it('modo manual: não avança sozinho, advance() anda e nunca pausa', () => {
    const { scanning, onSelect } = setup({ automatic: false })
    scanning.start()
    vi.advanceTimersByTime(10 * INTERVAL)
    expect(scanning.highlightedId.value).toBe('acoes')

    for (let i = 0; i < 12; i++) scanning.advance()
    expect(scanning.isPaused.value).toBe(false)
    expect(scanning.highlightedId.value).toBe('acoes')

    scanning.advance()
    scanning.press()
    scanning.press()
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('linha-1', 'eu')
  })

  it('stop() apaga o destaque e para o timer', () => {
    const { scanning } = setup()
    scanning.start()
    scanning.stop()
    expect(scanning.highlightedId.value).toBeNull()
    expect(scanning.isRunning.value).toBe(false)
    vi.advanceTimersByTime(10 * INTERVAL)
    expect(scanning.highlightedId.value).toBeNull()
    scanning.press()
    expect(scanning.highlightedId.value).toBeNull()
  })

  it('acompanha mudanças na estrutura e ignora grupos vazios', () => {
    const { scanning, structure } = setup()
    scanning.start()
    vi.advanceTimersByTime(2 * INTERVAL)
    expect(scanning.highlightedId.value).toBe('linha-2')

    structure.value = {
      groups: [
        { id: 'vazio', itemIds: [] },
        { id: 'acoes', itemIds: ['falar'] },
        { id: 'linha-1', itemIds: ['agua'] },
      ],
    }
    vi.advanceTimersByTime(INTERVAL)
    expect(scanning.highlightedId.value).toBe('acoes')
    vi.advanceTimersByTime(INTERVAL)
    expect(scanning.highlightedId.value).toBe('linha-1')
  })

  it('volta ao nível 1 se o grupo aberto deixar de existir', () => {
    const { scanning, structure } = setup()
    scanning.start()
    vi.advanceTimersByTime(INTERVAL)
    scanning.press()
    structure.value = { groups: [{ id: 'acoes', itemIds: ['falar'] }] }
    vi.advanceTimersByTime(INTERVAL)
    expect(scanning.level.value).toBe('group')
    expect(scanning.highlightedId.value).toBe('acoes')
  })
})

describe('createPressFilter (tempo de aceitação)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('com 0 ms, vale no momento em que é pressionado', () => {
    const onAccept = vi.fn()
    const filter = createPressFilter(0, onAccept)
    filter.down()
    expect(onAccept).toHaveBeenCalledOnce()
  })

  it('ignora toques mais curtos que o tempo de aceitação', () => {
    const onAccept = vi.fn()
    const filter = createPressFilter(300, onAccept)
    filter.down()
    vi.advanceTimersByTime(299)
    filter.up()
    vi.advanceTimersByTime(1000)
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('vale uma vez só ao atingir o tempo, mesmo com a tecla repetindo', () => {
    const onAccept = vi.fn()
    const filter = createPressFilter(300, onAccept)
    filter.down()
    vi.advanceTimersByTime(200)
    filter.down()
    vi.advanceTimersByTime(100)
    expect(onAccept).toHaveBeenCalledOnce()
    filter.down()
    vi.advanceTimersByTime(1000)
    filter.up()
    expect(onAccept).toHaveBeenCalledOnce()

    filter.down()
    vi.advanceTimersByTime(300)
    expect(onAccept).toHaveBeenCalledTimes(2)
  })
})
