import * as cheerio from 'cheerio'
import { decodeHtml, pageShape } from './html-shape'
import { nationalLinesFromHtml } from './national-line'
import type { Parser } from './types'

interface LinkItem {
  url: string
  text: string
}

const YEAR_LIST = /var\s+yearList\s*=\s*\[([\s\S]*?)\]\s*;/
const YEAR_ITEM = /year\s*:\s*'(\d{4})'\s*,\s*url\s*:\s*'([^']+)'/g

/**
 * 专题页内联 `yearList` → 2022–2026 每年国家线文章。
 * text 不带 4 位年份，避免 `selectCandidates()` 把列表页裁成「只抓最新一年」。
 */
export function extractYearLinks(html: string): LinkItem[] {
  const block = YEAR_LIST.exec(html)?.[1]
  if (!block) return []
  const items: LinkItem[] = []
  YEAR_ITEM.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = YEAR_ITEM.exec(block))) {
    const found = match[2]
    if (!items.some((item) => item.url === found)) {
      items.push({ url: found, text: '历年国家线' })
    }
  }
  return items
}

/** 文章页：优先取「初试成绩基本要求」公告页，没有再退回 PDF 附件（避免同一份数据抓两遍）。 */
export function extractNoticeLinks(html: string, baseUrl: string): LinkItem[] {
  const $ = cheerio.load(html)
  const notices: LinkItem[] = []
  const pdfs: LinkItem[] = []
  const seen = new Set<string>()
  $('a[href]').each((_index, element) => {
    const href = $(element).attr('href') ?? ''
    const text = $(element).text().replace(/\s+/g, ' ').trim()
    let url: URL
    try {
      url = new URL(href, baseUrl)
    } catch {
      return
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return
    const absolute = url.toString()
    if (seen.has(absolute)) return
    seen.add(absolute)
    if (/成绩基本要求|国家线/.test(text) && /\/kyzx\/kp\/|\.html?$/i.test(url.pathname)) {
      notices.push({ url: absolute, text })
      return
    }
    if (/\.pdf$/i.test(url.pathname) || /getfile/i.test(url.pathname)) {
      if (/成绩|国家线|基本要求|分数线/.test(text)) pdfs.push({ url: absolute, text })
    }
  })
  return (notices.length ? notices : pdfs).slice(0, 5)
}

export const yzTopicParser: Parser = {
  id: 'yz-topic@1',
  async parse({ content, contentType, url, context }) {
    const html = decodeHtml(content, contentType)
    const shape = pageShape(html)
    // 文章链到的公告页本身就是国家线表格：直接交给 national-line 的口径，避免再抓一次 PDF。
    if (shape.tables > 0) {
      const national = nationalLinesFromHtml(html, context)
      if (national.batches.length) {
        return {
          batches: national.batches,
          issues: national.issues,
          shape,
          parserId: 'national-line@1'
        }
      }
    }
    const yearLinks = extractYearLinks(html)
    const links = yearLinks.length ? yearLinks : extractNoticeLinks(html, url || context.sourceUrl)
    if (links.length) {
      return {
        batches: [],
        issues: [],
        links: links.map((item) => item.url),
        linkItems: links,
        index: true,
        shape
      }
    }
    const detail = '研招网页面没有可跟进的年度国家线链接或表格'
    return {
      batches: [],
      issues: [detail],
      failure: {
        code: shape.tables === 0 ? 'no_table' : 'unsupported_table',
        detail
      },
      shape
    }
  }
}
