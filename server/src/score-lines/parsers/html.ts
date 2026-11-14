import * as cheerio from 'cheerio'
import type { Parser, ParsedMetric } from './types'
import { batchFromMetrics, rowsToMetrics } from './table'
import { categoryBatchesFromRows } from './category-table'
import { candidateLinks, decodeHtml, extractRedirect, pageShape } from './html-shape'

export const htmlTableParser: Parser = {
  id: 'html-table@1',
  async parse({ content, url, context, contentType }) {
    const html = decodeHtml(content, contentType)
    const shape = pageShape(html)
    const $ = cheerio.load(html)
    const title = ($('title').first().text() || $('h1').first().text() || '').trim()
    const items = candidateLinks(html, url, context.urlInclude)
    const links = items.map((item) => item.url)
    const base = { links, linkItems: items, shape }

    // 解码后仍大量乱码：明确报编码问题，不把空结果当成「没有表格」。
    const replacement = (html.match(/�/g) ?? []).length
    if (replacement > 20 && replacement > html.length * 0.001) {
      return {
        batches: [],
        issues: [`${title || url}：页面编码异常，无法读取正文`],
        failure: { code: 'decode', detail: title || url },
        ...base
      }
    }

    const metrics: ParsedMetric[] = []
    const issues: string[] = []
    const tables: string[][][] = []
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
      if (rows.length) tables.push(rows)
      const result = rowsToMetrics(rows)
      metrics.push(...result.metrics)
      issues.push(...result.issues)
    })
    if (metrics.length === 0) {
      // 先用科目表跑，失败再按「类别 × 分数」识别（专升本省控线常见）。
      const categoryBatches = tables.flatMap((rows) =>
        categoryBatchesFromRows(rows, context, title)
      )
      if (categoryBatches.length) {
        return { batches: categoryBatches, issues: [], ...base }
      }
      const detail = `${title || url}：没有识别到分数线表格`
      return {
        batches: [],
        issues: [detail, ...issues.slice(0, 5)],
        failure: {
          code: shape.tables === 0 ? 'no_table' : 'unsupported_table',
          detail
        },
        // 0 表 0 链接的页面大概率是「点击进入」引导页，交给抓取器跟一跳。
        redirect:
          shape.tables === 0 && shape.links === 0 ? extractRedirect(html, url) : '',
        ...base
      }
    }
    return {
      batches: [batchFromMetrics(metrics, context, { title: title || undefined })],
      issues: [],
      ...base
    }
  }
}
