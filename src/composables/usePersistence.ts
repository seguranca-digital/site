import { createStore, del, get, keys, set, type UseStore } from 'idb-keyval'
import { watch } from 'vue'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  sanitizeSettings,
  validateBoard,
  type BackupFile,
} from '../backup'
import { blobToDataUrl, dataUrlToBlob, storedImageKey } from '../images'
import { useBoardStore } from '../stores/boardStore'
import { useSettingsStore } from '../stores/settingsStore'
import type { Board, Settings } from '../types'

// Prancha, imagens (Blob) e configurações ficam no IndexedDB deste aparelho
const BOARD_KEY = 'prancha'
const SETTINGS_KEY = 'configuracoes'
const IMAGE_PREFIX = 'imagem:'
const SAVE_DELAY_MS = 500

// Sem IndexedDB (ex.: alguns modos privados), o app funciona, só não salva
const isAvailable = typeof indexedDB !== 'undefined'
let database: UseStore | undefined

// Abre o banco só no primeiro uso
function db(): UseStore {
  database ??= createStore('comunicador-alternativo', 'dados')
  return database
}

export async function loadBoard(): Promise<Board | null> {
  if (!isAvailable) return null
  try {
    const saved: unknown = await get(BOARD_KEY, db())
    if (saved === undefined) return null
    const result = validateBoard(saved)
    if (!result.ok) {
      console.warn('Prancha salva inválida; usando o vocabulário inicial:', result.error)
      return null
    }
    return result.value
  } catch (error) {
    console.warn('Não foi possível ler a prancha salva:', error)
    return null
  }
}

export async function saveBoard(board: Board) {
  if (!isAvailable) return
  // Cópia simples: o IndexedDB não aceita os proxies reativos do Vue
  const plain = JSON.parse(JSON.stringify(board)) as Board
  await set(BOARD_KEY, plain, db())
  await pruneImages(plain)
}

// --- Configurações ---

export async function loadSettings(): Promise<Settings | null> {
  if (!isAvailable) return null
  try {
    const saved: unknown = await get(SETTINGS_KEY, db())
    // Campos que faltarem ou vierem inválidos ficam no padrão
    return saved === undefined ? null : sanitizeSettings(saved)
  } catch (error) {
    console.warn('Não foi possível ler as configurações salvas:', error)
    return null
  }
}

export async function saveSettings(settings: Settings) {
  if (!isAvailable) return
  await set(SETTINGS_KEY, JSON.parse(JSON.stringify(settings)) as Settings, db())
}

// --- Imagens ---

const urlCache = new Map<string, string>()
// Imagens salvas que a prancha ainda não usa (ex.: foto de um card sendo salvo agora)
const protectedKeys = new Set<string>()

function forgetUrl(key: string) {
  const url = urlCache.get(key)
  if (url) URL.revokeObjectURL(url)
  urlCache.delete(key)
}

export async function saveImage(key: string, blob: Blob) {
  if (!isAvailable) return
  forgetUrl(key)
  protectedKeys.add(key)
  await set(IMAGE_PREFIX + key, blob, db())
}

export async function loadImage(key: string): Promise<Blob | undefined> {
  if (!isAvailable) return undefined
  return get<Blob>(IMAGE_PREFIX + key, db())
}

// URL para usar no <img>; guardada em cache para não recriar a cada tela
export async function imageUrl(key: string): Promise<string | null> {
  const cached = urlCache.get(key)
  if (cached) return cached
  const blob = await loadImage(key)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urlCache.set(key, url)
  return url
}

export async function deleteImage(key: string) {
  if (!isAvailable) return
  forgetUrl(key)
  protectedKeys.delete(key)
  await del(IMAGE_PREFIX + key, db())
}

export async function listImageKeys(): Promise<string[]> {
  if (!isAvailable) return []
  return (await keys(db()))
    .filter((key): key is string => typeof key === 'string' && key.startsWith(IMAGE_PREFIX))
    .map((key) => key.slice(IMAGE_PREFIX.length))
}

// Chaves das imagens que a prancha usa
export function referencedImageKeys(board: Board): Set<string> {
  const pictos = [...Object.values(board.cards), ...board.categories].map((item) => item.picto)
  return new Set(pictos.map(storedImageKey).filter((key): key is string => key !== null))
}

// Apaga imagens que nenhum card ou categoria usa mais
async function pruneImages(board: Board) {
  const used = referencedImageKeys(board)
  for (const key of await listImageKeys()) {
    if (used.has(key)) protectedKeys.delete(key)
    else if (!protectedKeys.has(key)) await deleteImage(key)
  }
}

// --- Backup ---

// Monta o backup: prancha, imagens em base64 e configurações
export async function createBackup(): Promise<BackupFile> {
  const board = JSON.parse(JSON.stringify(useBoardStore().board)) as Board
  const images: Record<string, string> = {}
  for (const key of referencedImageKeys(board)) {
    const blob = await loadImage(key)
    if (blob) images[key] = await blobToDataUrl(blob)
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    board,
    images,
    settings: JSON.parse(JSON.stringify(useSettingsStore().$state)),
  }
}

// Substitui a prancha, as imagens e as configurações pelas do backup (já validado)
export async function applyBackup(backup: BackupFile) {
  for (const [key, dataUrl] of Object.entries(backup.images)) {
    await saveImage(key, await dataUrlToBlob(dataUrl))
  }
  useBoardStore().replaceBoard(backup.board)
  useSettingsStore().$patch(backup.settings)
}

// Chama `save` ~500 ms depois da última alteração em `source`
function autosave<T>(source: () => T, save: (value: T) => Promise<void>, what: string) {
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(
    source,
    () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        save(source()).catch((error: unknown) => {
          console.error(`Não foi possível salvar ${what}:`, error)
        })
      }, SAVE_DELAY_MS)
    },
    { deep: true },
  )
}

// Carrega a prancha e as configurações salvas e passa a salvar automaticamente a cada alteração
export async function setupPersistence() {
  const boardStore = useBoardStore()
  const settings = useSettingsStore()
  const [savedBoard, savedSettings] = await Promise.all([loadBoard(), loadSettings()])
  if (savedBoard) boardStore.replaceBoard(savedBoard)
  if (savedSettings) settings.$patch(savedSettings)

  autosave(() => boardStore.board, saveBoard, 'a prancha')
  autosave(() => settings.$state, saveSettings, 'as configurações')
}
