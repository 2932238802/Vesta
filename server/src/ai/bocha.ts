import { config } from '../env'
import { db, now } from '../db'

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

export interface SearchOptions {
  count?: number
  freshness?: string
}

/** 招聘原文按周更新就够：同城同专业的学生和 AI 自动重试都靠它省下外呼。 */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** 只做空白折叠和转小写，不改词序、不删词，避免把语义不同的检索词合并成一条。 */
function cacheKey(query: string, options: SearchOptions): string {
  const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase()
  return `${normalized}|c${options.count ?? 6}|f${options.freshness ?? 'noLimit'}`
}

function dropCache(key: string): void {
  try {
    db.prepare('DELETE FROM search_cache WHERE key = ?').run(key)
  } catch {
    // 清理失败不影响本次检索
  }
}

function readCache(key: string): SearchResult[] | null {
  try {
    const row = db.prepare('SELECT results, created_at FROM search_cache WHERE key = ?').get(key) as
      | { results: string; created_at: string }
      | undefined
    if (!row) return null
    const created = Date.parse(row.created_at)
    if (!Number.isFinite(created) || Date.now() - created > CACHE_TTL_MS) {
      dropCache(key)
      return null
    }
    const parsed: unknown = JSON.parse(row.results)
    if (!Array.isArray(parsed)) {
      dropCache(key)
      return null
    }
    // 按 fetchSearch 的同一规则归一化，避免脏缓存让下游拿到缺失的字符串字段。
    const items = parsed.filter((item): item is Record<string, unknown> => {
      if (!item || typeof item !== 'object') return false
      const record = item as Record<string, unknown>
      return typeof record.url === 'string' && /^https?:\/\//i.test(record.url)
    })
    // 空数组是合法的「空结果缓存」（P2）；非空数组被全部过滤掉说明行已损坏，删掉当未命中。
    if (parsed.length > 0 && items.length === 0) {
      dropCache(key)
      return null
    }
    return items.map((record) => {
      const url = clip(record.url, 2000)
      return {
        title: clip(record.title, 180) || url,
        url,
        site: clip(record.site, 100),
        publishedAt: clip(record.publishedAt, 40),
        snippet: clip(record.snippet, 900)
      }
    })
  } catch {
    dropCache(key)
    return null
  }
}

function writeCache(key: string, results: SearchResult[]): void {
  try {
    db.prepare(
      `INSERT INTO search_cache (key, results, created_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET results = excluded.results, created_at = excluded.created_at`
    ).run(key, JSON.stringify(results), now())
    // 顺手清理过期行，不额外加定时任务。
    db.prepare('DELETE FROM search_cache WHERE created_at < ?').run(
      new Date(Date.now() - CACHE_TTL_MS).toISOString()
    )
  } catch (error) {
    // 缓存写失败不影响本次检索，只是下次还要再花一次额度。
    console.warn('[bocha] 写入检索缓存失败', error instanceof Error ? error.message : error)
  }
}

/** 单进程内的并发去重：同一个 key 同时只外呼一次（当前部署是单实例）。 */
const inflight = new Map<string, Promise<SearchResult[]>>()

async function fetchSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
  const response = await fetch(`${config.bochaBaseUrl.replace(/\/$/, '')}/web-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.bochaApiKey}`
    },
    body: JSON.stringify({
      query: query.slice(0, 120),
      freshness: options.freshness ?? 'noLimit',
      summary: true,
      count: options.count ?? 6
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
    // 部分站点的链接会把标题/薪资放在 query 里，可能超过 600 字；
    // 截断会同时弄坏链接和字段，所以放宽到 2000。
    const url = clip(record.url, 2000)
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

/**
 * 检索顺序：配置检查 → 缓存 → 单飞 → 外呼 → 写缓存。
 * 失败照旧 throw，错误不缓存；429 重试和 AI 重试行为不变。
 */
export async function searchWeb(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  if (!config.bochaApiKey) {
    throw new Error('未配置 BOCHA_API_KEY，无法检索')
  }
  if (!config.bochaBaseUrl) {
    throw new Error('未配置 BOCHA_BASE_URL，无法检索')
  }

  const key = cacheKey(query, options)
  const cached = readCache(key)
  if (cached) return cached

  const pending = inflight.get(key)
  if (pending) return pending

  const task = fetchSearch(query, options)
    .then((results) => {
      writeCache(key, results)
      return results
    })
    .finally(() => {
      // 失败也要删，否则后续同一检索词会一直挂在 rejected 的 Promise 上。
      inflight.delete(key)
    })
  inflight.set(key, task)
  return task
}
