import * as cheerio from 'cheerio'
import type { Parser, ParsedMetric } from './types'
import { batchFromMetrics, rowsToMetrics } from './table'

function decode(content: string | Uint8Array): string {
  return typeof content === 'string' ? content : new TextDecoder('utf-8').decode(content)
}

function candidateLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html)
  const links: string[] = []
  $('a[href]').each((_index, element) => {
    const href = $(element).attr('href') ?? ''
    const text = `${$(element).text()} ${href}`
    if (!/20\d{2}|分数线|录取|控制线|招生计划|专业目录|专升本|复试/.test(text)) return
    try {
      const url = new URL(href, baseUrl)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return
      if (url.hostname !== new URL(baseUrl).hostname) return
      if (!links.includes(url.toString())) links.push(url.toString())
    } catch {
      // 相对链接解析失败时跳过。
    }
  })
  return links.slice(0, 20)
}

export const htmlTableParser: Parser = {
  id: 'html-table@1',
  async parse({ content, url, context }) {
    const html = decode(content)
    const $ = cheerio.load(html)
    const title = ($('title').first().text() || $('h1').first().text() || '').trim()
    const metrics: ParsedMetric[] = []
    const issues: string[] = []
    $('table').each((_index, table) => {
      const rows: string[][] = []
      $(table)
        .find('tr')
        .each((_rowIndex, tr) => {
          const cells: string[] = []
          $(tr)
            .find('th,td')
            .each((_cellIndex, cell) => {
              cells.push($(cell).text().trim())
            })
          if (cells.length) rows.push(cells)
        })
      const result = rowsToMetrics(rows)
      metrics.push(...result.metrics)
      issues.push(...result.issues)
    })
    if (metrics.length === 0) {
      return {
        batches: [],
        issues: [`${title || url}：没有识别到分数线表格`, ...issues.slice(0, 5)],
        links: candidateLinks(html, url)
      }
    }
    return {
      batches: [batchFromMetrics(metrics, context, { title: title || undefined })],
      issues: [],
      links: candidateLinks(html, url)
    }
  }
}
