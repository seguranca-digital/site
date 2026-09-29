// Baixa do ARASAAC os pictogramas do vocabulário inicial, para uso offline.
//
// Uso:
//   npm run pictogramas                 → busca só o que ainda não está no mapa
//   npm run pictogramas -- --atualizar  → refaz todas as buscas (útil depois de mudar labels
//                                          ou searchTerms); PNGs que já existem não são baixados de novo
//
// Para cada card e categoria: usa `arasaacId` se houver; se não, busca `searchTerm ?? label`
// (ou `searchTerm ?? name`, nas categorias) e pega o primeiro resultado. Salva o PNG em
// public/pictogramas/{id}.png e grava { id do card/categoria: id do ARASAAC } em
// src/data/pictogramas-map.json. No fim, apaga os PNGs que nenhum item usa mais.

import { access, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'

const API = 'https://api.arasaac.org/v1'
const DELAY_MS = 200

const root = new URL('../', import.meta.url)
const vocabularyUrl = new URL('src/data/vocabulario-inicial.json', root)
const mapUrl = new URL('src/data/pictogramas-map.json', root)
const pictogramsDir = new URL('public/pictogramas/', root)

const refresh = process.argv.includes('--atualizar')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function exists(url) {
  try {
    await access(url)
    return true
  } catch {
    return false
  }
}

async function readJson(url, fallback) {
  return (await exists(url)) ? JSON.parse(await readFile(url, 'utf8')) : fallback
}

// Retorna o _id do primeiro resultado, ou undefined se a busca não encontrar nada
async function search(term) {
  await sleep(DELAY_MS)
  const response = await fetch(`${API}/pictograms/br/search/${encodeURIComponent(term)}`)
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error(`busca "${term}": HTTP ${response.status}`)
  const results = await response.json()
  return results[0]?._id
}

async function download(pictogramId, fileUrl) {
  await sleep(DELAY_MS)
  const response = await fetch(`${API}/pictograms/${pictogramId}?download=false`)
  const type = response.headers.get('content-type') ?? ''
  if (!response.ok || !type.startsWith('image/png')) {
    throw new Error(`download ${pictogramId}: HTTP ${response.status} (${type})`)
  }
  await writeFile(fileUrl, Buffer.from(await response.arrayBuffer()))
}

const vocabulary = await readJson(vocabularyUrl)
const previousMap = await readJson(mapUrl, {})
await mkdir(pictogramsDir, { recursive: true })

const entries = [
  ...Object.values(vocabulary.cards).map((card) => ({
    id: card.id,
    term: card.searchTerm ?? card.label,
    arasaacId: card.arasaacId,
  })),
  ...vocabulary.categories.map((category) => ({
    id: category.id,
    term: category.searchTerm ?? category.name,
    arasaacId: category.arasaacId,
  })),
]

const map = {}
const notFound = []
const failures = []
let searched = 0
let downloaded = 0

for (const entry of entries) {
  try {
    let pictogramId = entry.arasaacId ?? (refresh ? undefined : previousMap[entry.id])
    if (pictogramId === undefined) {
      searched++
      // Se a nova busca falhar, mantém o pictograma anterior (se houver)
      pictogramId = (await search(entry.term)) ?? previousMap[entry.id]
    }
    if (pictogramId === undefined) {
      notFound.push(`${entry.id} ("${entry.term}")`)
      continue
    }
    map[entry.id] = pictogramId

    const fileUrl = new URL(`${pictogramId}.png`, pictogramsDir)
    if (!(await exists(fileUrl))) {
      await download(pictogramId, fileUrl)
      downloaded++
      console.log(`↓ ${entry.id} → ${pictogramId}.png`)
    }
  } catch (error) {
    failures.push(`${entry.id}: ${error.message}`)
  }
}

await writeFile(mapUrl, JSON.stringify(map, null, 2) + '\n')

// Apaga PNGs que nenhum item usa mais (ex.: depois de trocar um arasaacId).
// Com falhas de rede o mapa pode estar incompleto, então não apaga nada.
const removed = []
if (failures.length === 0) {
  const usedFiles = new Set(Object.values(map).map((pictogramId) => `${pictogramId}.png`))
  for (const file of await readdir(pictogramsDir)) {
    if (/^\d+\.png$/.test(file) && !usedFiles.has(file)) {
      await rm(new URL(file, pictogramsDir))
      removed.push(file)
    }
  }
}

console.log(
  `\n${entries.length} itens | ${Object.keys(map).length} com pictograma | ` +
    `${searched} buscas | ${downloaded} PNGs baixados | ${removed.length} PNGs sem uso apagados`,
)
if (removed.length > 0) console.log(`Apagados: ${removed.join(', ')}`)
if (notFound.length > 0) {
  console.log(`\nTermos sem resultado (defina "searchTerm" ou "arasaacId" no vocabulário):`)
  for (const item of notFound) console.log(`  - ${item}`)
}
if (failures.length > 0) {
  console.error(`\nFalhas (rode de novo para tentar outra vez):`)
  for (const item of failures) console.error(`  - ${item}`)
  process.exitCode = 1
}
