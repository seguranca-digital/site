import { ref } from 'vue'

const API = 'https://api.arasaac.org/v1'

export interface ArasaacResult {
  id: number
  keyword: string
}

interface ArasaacApiResult {
  _id: number
  keywords?: { keyword: string }[]
}

export function useArasaac() {
  const results = ref<ArasaacResult[]>([])
  const status = ref<'idle' | 'loading' | 'done' | 'empty' | 'error'>('idle')

  async function search(term: string) {
    const trimmed = term.trim()
    if (trimmed === '') return
    status.value = 'loading'
    results.value = []
    try {
      const response = await fetch(`${API}/pictograms/br/search/${encodeURIComponent(trimmed)}`)
      if (response.status === 404) {
        status.value = 'empty'
        return
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = (await response.json()) as ArasaacApiResult[]
      results.value = data.slice(0, 30).map((item) => ({
        id: item._id,
        keyword: item.keywords?.[0]?.keyword ?? trimmed,
      }))
      status.value = results.value.length > 0 ? 'done' : 'empty'
    } catch {
      status.value = 'error'
    }
  }

  function thumbnailUrl(id: number): string {
    return `https://static.arasaac.org/pictograms/${id}/${id}_300.png`
  }

  async function download(id: number): Promise<Blob> {
    const response = await fetch(`${API}/pictograms/${id}?download=false`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.blob()
  }

  return { results, status, search, thumbnailUrl, download }
}
