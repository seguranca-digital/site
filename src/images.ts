import pictogramasMap from './data/pictogramas-map.json'
import type { PictogramSource } from './types'

const bundledPictogramIds = new Set<number>(Object.values(pictogramasMap as Record<string, number>))

export function isBundledPictogram(id: number): boolean {
  return bundledPictogramIds.has(id)
}

export function bundledPictogramUrl(id: number): string {
  return `${import.meta.env.BASE_URL}pictogramas/${id}.png`
}

export function storedImageKey(picto: PictogramSource): string | null {
  if (picto.kind === 'custom') return picto.blobKey
  if (picto.kind === 'arasaac' && !isBundledPictogram(picto.id)) return `arasaac:${picto.id}`
  return null
}

export async function resizeImage(file: Blob, maxSide = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas indisponível')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('não foi possível gerar a imagem'))),
      'image/jpeg',
      0.85,
    )
  })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob()
}
