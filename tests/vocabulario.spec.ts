import { describe, expect, it } from 'vitest'
import { createInitialBoard } from '../src/stores/boardStore'
import type { WordClass } from '../src/types'

const wordClasses: WordClass[] = [
  'pessoa', 'acao', 'coisa', 'descricao', 'social', 'pergunta', 'negacao', 'outro',
]

describe('vocabulario-inicial.json', () => {
  const board = createInitialBoard()

  it('está na versão 1', () => {
    expect(board.version).toBe(1)
  })

  it('cada card tem id igual à chave, texto e classe válida', () => {
    for (const [key, card] of Object.entries(board.cards)) {
      expect(card.id, key).toBe(key)
      expect(card.label.trim(), key).not.toBe('')
      expect(wordClasses, key).toContain(card.wordClass)
      expect(card.picto, key).toBeDefined()
    }
  })

  it('frases rápidas e categorias só apontam para cards existentes', () => {
    const referenced = [
      ...board.quickPhraseIds,
      ...board.categories.flatMap((category) => category.cardIds),
    ]
    for (const id of referenced) {
      expect(board.cards[id], id).toBeDefined()
    }
  })

  it('não repete ids de categoria', () => {
    const ids = board.categories.map((category) => category.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ids de categoria não coincidem com ids de card', () => {
    for (const category of board.categories) {
      expect(board.cards[category.id], category.id).toBeUndefined()
    }
  })

  it('"não quero" e "não gosto" ficam em Ações, com a classe negacao', () => {
    const acoes = board.categories.find((category) => category.id === 'acoes')
    expect(acoes?.cardIds).toContain('nao-quero')
    expect(acoes?.cardIds).toContain('nao-gosto')
    expect(board.cards['nao-quero']?.wordClass).toBe('negacao')
    expect(board.cards['nao-gosto']?.wordClass).toBe('negacao')
  })
})
