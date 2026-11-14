import * as cheerio from 'cheerio'

const DEFAULT_INCLUDE = /20\d{2}|分数线|录取|控制线|招生计划|专业目录|专升本|复试/

export interface LinkItem {
  url: string
  text: string
}

export interface PageShape {
  tables: number
  rows: number
  cols: number
  links: number
}

/** 先看 content-type，再看页内 meta；GBK 站不再整页乱码。 */
export function decodeHtml(content: string | Uint8Array, contentType = ''): string {
  if (typeof content === 'string') return content
  const sniff = new TextDecoder('latin1').decode(content.subarray(0, 4096))
  const header = /charset=([\w-]+)/i.exec(contentType)?.[1]
  const meta = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(sniff)?.[1]
  const charset = (header || meta || 'utf-8').toLowerCase()
  try {
    return new TextDecoder(charset).decode(content)
  } catch {
    return new TextDecoder('utf-8').decode(content)
  }
}

export function pageShape(html: string): PageShape {
  const $ = cheerio.load(html)
  let rows = 0
  let cols = 0
  $('tr').each((_index, tr) => {
    rows += 1
    const count = $(tr).find('th,td').length
    if (count > cols) cols = count
  })
  return { tables: $('table').length, rows, cols, links: $('a[href]').length }
}

/** 引导页的跳转写在 onclick / meta refresh / script 里，不在 <a href> 里。 */
export function extractRedirect(html: string, baseUrl: string): string {
  const $ = cheerio.load(html)
  const candidates: string[] = []
  $('meta[http-equiv]').each((_index, element) => {
    if (!/^refresh$/i.test($(element).attr('http-equiv') ?? '')) return
    const content = $(element).attr('content') ?? ''
    const match = /url\s*=\s*['"]?([^'";]+)/i.exec(content)
    if (match) candidates.push(match[1])
  })
  $('[onclick]').each((_index, element) => {
    const code = $(element).attr('onclick') ?? ''
    const match =
      /window\.open\(\s*['"]([^'"]+)['"]/.exec(code) ??
      /location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/.exec(code)
    if (match) candidates.push(match[1])
  })
  $('script:not([src])').each((_index, element) => {
    const code = $(element).text()
    const match =
      /(?:window\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/.exec(code) ??
      /window\.open\(\s*['"]([^'"]+)['"]/.exec(code)
    if (match) candidates.push(match[1])
  })
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate.trim(), baseUrl)
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString()
    } catch {
      // 解析失败换下一个
    }
  }
  return ''
}

/** 同域候选链接；urlInclude 可由来源配置覆盖。 */
export function candidateLinks(
  html: string,
  baseUrl: string,
  urlInclude = ''
): LinkItem[] {
  let include = DEFAULT_INCLUDE
  if (urlInclude.trim()) {
    try {
      include = new RegExp(urlInclude.trim(), 'i')
    } catch {
      // 管理员写的正则不合法时退回默认关键词，不中断抓取
    }
  }
  const host = new URL(baseUrl).hostname
  const $ = cheerio.load(html)
  const items: LinkItem[] = []
  const seen = new Set<string>()
  $('a[href]').each((_index, element) => {
    const href = $(element).attr('href') ?? ''
    const text = `${$(element).attr('title') ?? ''} ${$(element).text()} ${href}`.replace(/\s+/g, ' ').trim()
    if (!include.test(text)) return
    try {
      const url = new URL(href, baseUrl)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return
      if (url.hostname !== host) return
      const absolute = url.toString()
      if (seen.has(absolute)) return
      seen.add(absolute)
      items.push({ url: absolute, text })
    } catch {
      // 相对链接解析失败时跳过
    }
  })
  return items.slice(0, 50)
}
