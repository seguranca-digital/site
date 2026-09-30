// IndexedDB falso (em memória) no lugar do real, que o jsdom não tem
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { clear, createStore, set } from 'idb-keyval'
import { loadBoard, saveBoard, setupPersistence } from '../src/composables/usePersistence'
import { createInitialBoard, useBoardStore } from '../src/stores/boardStore'

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
})
