import { config } from '../env'

export interface SearchResult {
  title: string
  url: string
  site: string
  publishedAt: string
  snippet: string
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  if (!config.bochaApiKey) return []

  const response = await fetch(`${config.bochaBaseUrl.replace(/\/$/, '')}/web-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.bochaApiKey}`
    },
    body: JSON.stringify({
      query: query.slice(0, 120),
      freshness: 'noLimit',
      summary: true,
      count: 6
    }),
    signal: AbortSignal.timeout(25_000)
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Bocha 检索失败（${response.status}）${text.slice(0, 160)}`)
  }

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Bocha 返回了无法解析的内容')
  }

  const root = data as {
    code?: number
    msg?: string
    message?: string
    data?: { webPages?: { value?: unknown[] } }
  }
  const code = Number(root.code)
  if (Number.isFinite(code) && code !== 200) {
    throw new Error(`Bocha 检索失败：${root.msg || root.message || code}`)
  }

  const items = root.data?.webPages?.value
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const url = clip(record.url, 600)
    if (!/^https?:\/\//i.test(url)) continue
    results.push({
      title: clip(record.name ?? record.title, 180) || url,
      url,
      site: clip(record.siteName ?? record.site, 100),
      publishedAt: clip(record.datePublished ?? record.date, 40),
      snippet: clip(record.summary || record.snippet, 900)
    })
  }
  return results
}
