import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { QUICK_PHRASES_ID, createInitialBoard, useBoardStore } from '../src/stores/boardStore'
import type { NewCard } from '../src/stores/boardStore'

const novoCard: NewCard = { label: 'gato', picto: { kind: 'none' }, wordClass: 'coisa' }

describe('boardStore — editor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('cria, renomeia e reordena categorias', () => {
    const store = useBoardStore()
    const category = store.addCategory('  Animais  ')
    expect(store.board.categories.at(-1)).toMatchObject({ name: 'Animais', cardIds: [] })
    expect(category.id).toMatch(/^categoria-/)

    store.renameCategory(category.id, 'Bichos')
    store.renameCategory(category.id, '   ')
    expect(category.name).toBe('Bichos')

    expect(store.moveCategory(category.id, 1)).toBe(false)
    expect(store.moveCategory(category.id, -1)).toBe(true)
    expect(store.board.categories.at(-2)?.id).toBe(category.id)
    expect(store.moveCategory('pessoas', -1)).toBe(false)
  })

  it('excluir categoria exclui os cards dela, mas mantém os que estão em outro lugar', () => {
    const store = useBoardStore()
    const pessoas = store.board.categories.find((category) => category.id === 'pessoas')!
    store.board.quickPhraseIds.push('eu')
    store.selectCategory('pessoas')

    store.deleteCategory('pessoas')
    expect(store.board.categories.some((category) => category.id === 'pessoas')).toBe(false)
    expect(store.board.cards.eu).toBeDefined()
    expect(store.board.cards.mae).toBeUndefined()
    expect(pessoas.cardIds.every((id) => id === 'eu' || !(id in store.board.cards))).toBe(true)
    expect(store.activeCategory?.id).toBe('acoes')
  })

  it('cria cards numa categoria ou nas frases rápidas', () => {
    const store = useBoardStore()
    const gato = store.addCard('lugares', novoCard)
    const oi = store.addCard(QUICK_PHRASES_ID, { ...novoCard, label: 'Oi' })

    expect(store.board.cards[gato.id]).toMatchObject({ label: 'gato', id: gato.id })
    expect(store.cardsOf('lugares').at(-1)?.id).toBe(gato.id)
    expect(store.board.quickPhraseIds.at(-1)).toBe(oi.id)
    expect(store.containerOf(oi.id)).toBe(QUICK_PHRASES_ID)
  })

  it('edita, oculta e move cards', () => {
    const store = useBoardStore()
    store.updateCard('agua', { label: 'Água', speech: 'quero água', hidden: true })
    expect(store.board.cards.agua).toMatchObject({ label: 'Água', speech: 'quero água', hidden: true })

    store.selectCategory('comida-e-bebida')
    expect(store.activeCards.some((card) => card.id === 'agua')).toBe(false)
    expect(store.cardsOf('comida-e-bebida').some((card) => card.id === 'agua')).toBe(true)

    store.moveCardTo('agua', 'comida-e-bebida', 'lugares')
    expect(store.cardsOf('comida-e-bebida').some((card) => card.id === 'agua')).toBe(false)
    expect(store.cardsOf('lugares').at(-1)?.id).toBe('agua')
  })

  it('reordena cards dentro da categoria', () => {
    const store = useBoardStore()
    expect(store.moveCardWithin('pessoas', 'voce', -1)).toBe(true)
    expect(store.cardsOf('pessoas').slice(0, 2).map((card) => card.id)).toEqual(['voce', 'eu'])
    expect(store.moveCardWithin('pessoas', 'voce', -1)).toBe(false)
  })

  it('excluir card tira ele de todas as listas', () => {
    const store = useBoardStore()
    store.board.quickPhraseIds.push('agua')
    store.deleteCard('agua')
    expect(store.board.cards.agua).toBeUndefined()
    expect(store.board.quickPhraseIds).not.toContain('agua')
    expect(store.cardsOf('comida-e-bebida').some((card) => card.id === 'agua')).toBe(false)
  })

  it('substituir a prancha corrige a categoria ativa', () => {
    const store = useBoardStore()
    store.addCategory('Temporária')
    const temporaria = store.board.categories.at(-1)!
    store.selectCategory(temporaria.id)
    store.replaceBoard(createInitialBoard())
    expect(store.activeCategory?.id).toBe('pessoas')
  })
})
