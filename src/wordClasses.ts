import type { WordClass } from './types'

// Classes gramaticais com o nome da cor (Chave de Fitzgerald adaptada), na ordem do editor
export const WORD_CLASSES: { value: WordClass; label: string }[] = [
  { value: 'pessoa', label: 'Pessoa (amarelo)' },
  { value: 'acao', label: 'Ação (verde)' },
  { value: 'coisa', label: 'Coisa (laranja)' },
  { value: 'descricao', label: 'Descrição (azul)' },
  { value: 'social', label: 'Social (rosa)' },
  { value: 'pergunta', label: 'Pergunta (roxo)' },
  { value: 'negacao', label: 'Negação (vermelho)' },
  { value: 'outro', label: 'Outro (cinza)' },
]

export function isWordClass(value: unknown): value is WordClass {
  return WORD_CLASSES.some((wordClass) => wordClass.value === value)
}

export function wordClassLabel(value: WordClass): string {
  return WORD_CLASSES.find((wordClass) => wordClass.value === value)?.label ?? value
}
