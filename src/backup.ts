import {
  createDefaultSettings,
  SETTINGS_LIMITS,
  THEMES,
  type NumberLimits,
} from './stores/settingsStore'
import type { Board, Card, Category, PictogramSource, Settings } from './types'
import { isWordClass } from './wordClasses'

// Arquivo de backup: leva a prancha, as imagens (base64) e as configurações de um aparelho para outro
export const BACKUP_FORMAT = 'comunicador-alternativo-backup'
export const BACKUP_VERSION = 1

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  board: Board
  // Chave da imagem → data URL (ex.: "foto:abc" → "data:image/jpeg;base64,...")
  images: Record<string, string>
  settings: Settings
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isOptional(value: unknown, type: 'string' | 'number' | 'boolean'): boolean {
  return value === undefined || typeof value === type
}

function isPictogramSource(value: unknown): value is PictogramSource {
  if (!isRecord(value)) return false
  if (value.kind === 'none') return true
  if (value.kind === 'arasaac') return Number.isInteger(value.id) && (value.id as number) > 0
  if (value.kind === 'custom') return typeof value.blobKey === 'string' && value.blobKey !== ''
  return false
}

function cardError(key: string, value: unknown): string | null {
  if (!isRecord(value)) return `o card "${key}" não é um objeto`
  if (value.id !== key) return `o card "${key}" tem id diferente da chave`
  if (typeof value.label !== 'string' || value.label.trim() === '') return `o card "${key}" está sem texto`
  if (!isOptional(value.speech, 'string')) return `o texto falado do card "${key}" é inválido`
  if (!isOptional(value.searchTerm, 'string')) return `o termo de busca do card "${key}" é inválido`
  if (!isOptional(value.arasaacId, 'number')) return `o arasaacId do card "${key}" é inválido`
  if (!isOptional(value.hidden, 'boolean')) return `o campo "hidden" do card "${key}" é inválido`
  if (!isPictogramSource(value.picto)) return `a imagem do card "${key}" é inválida`
  if (!isWordClass(value.wordClass)) return `a classe de palavra do card "${key}" é inválida`
  return null
}

function categoryError(value: unknown, index: number): string | null {
  if (!isRecord(value)) return `a categoria ${index + 1} não é um objeto`
  if (typeof value.id !== 'string' || value.id === '') return `a categoria ${index + 1} está sem id`
  if (typeof value.name !== 'string' || value.name.trim() === '') {
    return `a categoria "${value.id}" está sem nome`
  }
  if (!isPictogramSource(value.picto)) return `a imagem da categoria "${value.id}" é inválida`
  if (!isStringArray(value.cardIds)) return `a lista de cards da categoria "${value.id}" é inválida`
  return null
}

// Confere a estrutura completa da prancha (também usada ao carregar do IndexedDB)
export function validateBoard(value: unknown): ValidationResult<Board> {
  if (!isRecord(value)) return { ok: false, error: 'a prancha não é um objeto' }
  if (value.version !== 1) return { ok: false, error: `versão da prancha não suportada (${String(value.version)})` }
  if (!isStringArray(value.quickPhraseIds)) return { ok: false, error: 'a lista de frases rápidas é inválida' }
  if (!Array.isArray(value.categories)) return { ok: false, error: 'a lista de categorias é inválida' }
  if (!isRecord(value.cards)) return { ok: false, error: 'a lista de cards é inválida' }

  for (const [key, card] of Object.entries(value.cards)) {
    const error = cardError(key, card)
    if (error) return { ok: false, error }
  }

  const categoryIds = new Set<string>()
  for (const [index, category] of value.categories.entries()) {
    const error = categoryError(category, index)
    if (error) return { ok: false, error }
    const id = (category as Category).id
    if (categoryIds.has(id)) return { ok: false, error: `a categoria "${id}" está repetida` }
    categoryIds.add(id)
  }

  const cards = value.cards as Record<string, Card>
  const referenced = [
    ...value.quickPhraseIds,
    ...(value.categories as Category[]).flatMap((category) => category.cardIds),
  ]
  const missing = referenced.find((id) => !(id in cards))
  if (missing !== undefined) return { ok: false, error: `o card "${missing}" é usado mas não existe` }

  return { ok: true, value: value as unknown as Board }
}

// Configurações: aproveita só os campos com o tipo certo; o resto fica no padrão
export function sanitizeSettings(value: unknown): Settings {
  const settings = createDefaultSettings()
  if (!isRecord(value)) return settings

  const copyMatching = (target: UnknownRecord, source: UnknownRecord) => {
    for (const [key, current] of Object.entries(target)) {
      const incoming = source[key]
      if (isRecord(current)) {
        if (isRecord(incoming)) copyMatching(current, incoming)
      } else if (current === null ? typeof incoming === 'string' : typeof incoming === typeof current) {
        target[key] = incoming
      }
    }
  }
  copyMatching(settings as unknown as UnknownRecord, value)

  // Campos com valores fixos
  const defaults = createDefaultSettings()
  if (!THEMES.includes(settings.theme)) settings.theme = defaults.theme
  if (!['automatica', 'dois-botoes'].includes(settings.scanning.mode)) {
    settings.scanning.mode = defaults.scanning.mode
  }

  // Números: dentro da faixa da tela de configurações e no passo dela (ex.: colunas inteiras)
  const limit = (value: number, fallback: number, { min, max, step }: NumberLimits) => {
    if (!Number.isFinite(value)) return fallback
    const stepped = min + Math.round((value - min) / step) * step
    // Arredonda para evitar 0.30000000000000004
    return Math.min(max, Math.max(min, Number(stepped.toFixed(4))))
  }
  settings.rate = limit(settings.rate, defaults.rate, SETTINGS_LIMITS.rate)
  settings.pitch = limit(settings.pitch, defaults.pitch, SETTINGS_LIMITS.pitch)
  settings.volume = limit(settings.volume, defaults.volume, SETTINGS_LIMITS.volume)
  settings.gridColumns = limit(settings.gridColumns, defaults.gridColumns, SETTINGS_LIMITS.gridColumns)
  settings.fontScale = limit(settings.fontScale, defaults.fontScale, SETTINGS_LIMITS.fontScale)
  const scanning = settings.scanning
  scanning.intervalMs = limit(scanning.intervalMs, defaults.scanning.intervalMs, SETTINGS_LIMITS.intervalMs)
  scanning.acceptanceMs = limit(
    scanning.acceptanceMs,
    defaults.scanning.acceptanceMs,
    SETTINGS_LIMITS.acceptanceMs,
  )
  scanning.loopsBeforePause = limit(
    scanning.loopsBeforePause,
    defaults.scanning.loopsBeforePause,
    SETTINGS_LIMITS.loopsBeforePause,
  )
  return settings
}

export function validateBackup(value: unknown): ValidationResult<BackupFile> {
  if (!isRecord(value) || value.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'O arquivo não é um backup do Comunicador Alternativo.' }
  }
  if (typeof value.version !== 'number' || value.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: 'Este backup foi feito numa versão mais nova do aplicativo. Atualize o aplicativo e tente de novo.',
    }
  }
  if (value.version !== BACKUP_VERSION) {
    return { ok: false, error: `Versão de backup não suportada (${value.version}).` }
  }

  const board = validateBoard(value.board)
  if (!board.ok) return { ok: false, error: `O backup está com problema: ${board.error}.` }

  if (!isRecord(value.images)) return { ok: false, error: 'O backup está com problema: lista de imagens inválida.' }
  for (const [key, image] of Object.entries(value.images)) {
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return { ok: false, error: `O backup está com problema: a imagem "${key}" é inválida.` }
    }
  }

  return {
    ok: true,
    value: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : '',
      board: board.value,
      images: value.images as Record<string, string>,
      settings: sanitizeSettings(value.settings),
    },
  }
}

// Lê o texto de um arquivo .json escolhido pelo usuário
export function parseBackup(text: string): ValidationResult<BackupFile> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' }
  }
  return validateBackup(data)
}
