// IndexedDB falso (em memória) no lugar do real, que o jsdom não tem
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { clear, createStore, set } from 'idb-keyval'
import {
  loadBoard,
  loadSettings,
  saveBoard,
  saveSettings,
  setupPersistence,
} from '../src/composables/usePersistence'
import { createInitialBoard, useBoardStore } from '../src/stores/boardStore'
import { createDefaultSettings, useSettingsStore } from '../src/stores/settingsStore'

const database = createStore('comunicador-alternativo', 'dados')

describe('usePersistence', () => {
  beforeEach(async () => {
    await clear(database)
    setActivePinia(createPinia())
  })

  it('sem nada salvo, usa o vocabulário inicial', async () => {
    expect(await loadBoard()).toBeNull()
  })

  it('salva e carrega a prancha', async () => {
    const board = createInitialBoard()
    board.categories[0]!.name = 'Gente'
    await saveBoard(board)
    expect((await loadBoard())?.categories[0]?.name).toBe('Gente')
  })

  it('ignora uma prancha salva inválida', async () => {
    await set('prancha', { version: 1, cards: 'quebrado' }, database)
    expect(await loadBoard()).toBeNull()
  })

  it('ao iniciar, carrega a prancha salva neste aparelho', async () => {
    const board = createInitialBoard()
    board.categories.reverse()
    await saveBoard(board)

    await setupPersistence()
    expect(useBoardStore().board.categories[0]?.id).toBe('perguntas')
  })

  it('salva automaticamente ~500 ms depois da última alteração', async () => {
    await setupPersistence()
    const store = useBoardStore()
    store.addCategory('Animais')

    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(await loadBoard()).toBeNull()

    await vi.waitFor(
      async () => expect((await loadBoard())?.categories.at(-1)?.name).toBe('Animais'),
      { timeout: 2000 },
    )
  })

  it('salva e carrega as configurações', async () => {
    expect(await loadSettings()).toBeNull()
    const settings = createDefaultSettings()
    settings.theme = 'alto-contraste'
    settings.scanning.intervalMs = 2500
    await saveSettings(settings)
    expect(await loadSettings()).toEqual(settings)
  })

  it('configurações salvas incompletas ou inválidas são completadas com o padrão', async () => {
    await set('configuracoes', { theme: 'neon', gridColumns: 5 }, database)
    const loaded = await loadSettings()
    expect(loaded?.theme).toBe('claro')
    expect(loaded?.gridColumns).toBe(5)
    expect(loaded?.scanning).toEqual(createDefaultSettings().scanning)
  })

  it('ao iniciar, aplica as configurações salvas e salva as alterações automaticamente', async () => {
    const saved = createDefaultSettings()
    saved.fontScale = 1.5
    await saveSettings(saved)

    await setupPersistence()
    const settings = useSettingsStore()
    expect(settings.fontScale).toBe(1.5)

    settings.theme = 'escuro'
    settings.scanning.enabled = true
    await vi.waitFor(
      async () => {
        const loaded = await loadSettings()
        expect(loaded?.theme).toBe('escuro')
        expect(loaded?.scanning.enabled).toBe(true)
      },
      { timeout: 2000 },
    )
  })
})
