import { describe, expect, it } from 'vitest'
import pictogramasMap from '../src/data/pictogramas-map.json'
import vocabularioInicial from '../src/data/vocabulario-inicial.json'
import { createInitialBoard } from '../src/stores/boardStore'

const map: Record<string, number> = pictogramasMap

const pngFiles = new Set(
  Object.keys(import.meta.glob('/public/pictogramas/*.png')).map((path) =>
    path.replace('/public/pictogramas/', ''),
  ),
)

describe('pictogramas-map.json', () => {
  const board = createInitialBoard()
  const knownIds = new Set([
    ...Object.keys(board.cards),
    ...board.categories.map((category) => category.id),
  ])

  it('só tem chaves de cards e categorias que existem no vocabulário', () => {
    for (const id of Object.keys(map)) {
      expect(knownIds.has(id), id).toBe(true)
    }
  })

  it('tem o PNG de cada pictograma em public/pictogramas (rode `npm run pictogramas`)', () => {
    for (const [id, pictogramId] of Object.entries(map)) {
      expect(pngFiles.has(`${pictogramId}.png`), `${id} → ${pictogramId}.png`).toBe(true)
    }
  })
})

describe('createInitialBoard', () => {
  const board = createInitialBoard()

  it('aplica o mapa aos cards e às categorias', () => {
    const items = [...Object.values(board.cards), ...board.categories]
    for (const item of items) {
      const pictogramId = map[item.id]
      const expected = pictogramId === undefined ? { kind: 'none' } : { kind: 'arasaac', id: pictogramId }
      expect(item.picto, item.id).toEqual(expected)
    }
  })

  it('não altera o JSON importado', () => {
    expect(vocabularioInicial.cards.eu.picto).toEqual({ kind: 'none' })
  })
})
