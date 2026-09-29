import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSentenceStore } from '../src/stores/sentenceStore'
import { createInitialBoard } from '../src/stores/boardStore'
import type { Card } from '../src/types'

function makeCard(id: string, label: string, speech?: string): Card {
  return { id, label, speech, picto: { kind: 'none' }, wordClass: 'outro' }
}

describe('sentenceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('começa vazia', () => {
    const sentence = useSentenceStore()
    expect(sentence.items).toEqual([])
    expect(sentence.isEmpty).toBe(true)
    expect(sentence.text).toBe('')
  })

  it('adiciona cards na ordem em que foram tocados', () => {
    const sentence = useSentenceStore()
    sentence.add(makeCard('eu', 'eu'))
    sentence.add(makeCard('quero', 'quero'))
    expect(sentence.items.map((card) => card.id)).toEqual(['eu', 'quero'])
    expect(sentence.isEmpty).toBe(false)
  })

  it('permite repetir o mesmo card', () => {
    const sentence = useSentenceStore()
    const mais = makeCard('mais', 'mais')
    sentence.add(mais)
    sentence.add(mais)
    expect(sentence.text).toBe('mais mais')
  })

  it('apaga só o último card', () => {
    const sentence = useSentenceStore()
    sentence.add(makeCard('eu', 'eu'))
    sentence.add(makeCard('quero', 'quero'))
    sentence.removeLast()
    expect(sentence.items.map((card) => card.id)).toEqual(['eu'])
  })

  it('apagar último com a frase vazia não faz nada', () => {
    const sentence = useSentenceStore()
    sentence.removeLast()
    expect(sentence.isEmpty).toBe(true)
  })

  it('limpa a frase inteira', () => {
    const sentence = useSentenceStore()
    sentence.add(makeCard('eu', 'eu'))
    sentence.add(makeCard('quero', 'quero'))
    sentence.clear()
    expect(sentence.isEmpty).toBe(true)
    expect(sentence.text).toBe('')
  })

  it('monta o texto com `speech` quando existe e `label` quando não', () => {
    const sentence = useSentenceStore()
    sentence.add(makeCard('eu', 'eu'))
    sentence.add(makeCard('banheiro', 'Banheiro', 'preciso ir ao banheiro'))
    expect(sentence.text).toBe('eu preciso ir ao banheiro')
  })

  it('ignora textos vazios ao montar a frase', () => {
    const sentence = useSentenceStore()
    sentence.add(makeCard('eu', 'eu'))
    sentence.add(makeCard('vazio', 'vazio', '  '))
    sentence.add(makeCard('quero', 'quero'))
    expect(sentence.text).toBe('eu quero')
  })

  it('monta "eu quero água" com os cards do vocabulário inicial', () => {
    const sentence = useSentenceStore()
    const { cards } = createInitialBoard()
    for (const id of ['eu', 'quero', 'agua']) {
      const card = cards[id]
      expect(card).toBeDefined()
      sentence.add(card!)
    }
    expect(sentence.text).toBe('eu quero água')
  })
})
