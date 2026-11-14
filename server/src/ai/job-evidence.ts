import type { SearchResult } from './bocha'
import type { JobDirection } from '../../../shared/src/job-map'
import { cityInText, MAJOR_CITIES } from '../../../shared/src/doc'
import { calendarMonthsBetween, isOlderThanMonths } from '../../../shared/src/date'

// 招聘原文超过 18 个整月就不再当投递入口，只保留要求结构。
export const JOB_MAX_AGE_MONTHS = 18

export function parseTime(value?: string): number {
  if (!value) return 0
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

/** 标题里常带「2022届」「[2024]」这类年份，是发布时间之外的第二条时效证据。 */
function yearInTitle(title?: string): number {
  if (!title) return 0
  let earliest = 0
  const maxYear = new Date().getFullYear() + 1
  for (const match of title.matchAll(
    /(?<!\d)((?:19|20)\d{2})(?!\d)\s*(?:届|年|[-/.]\d{1,2})?/g
  )) {
    const year = Number(match[1])
    if (year < 2000 || year > maxYear) continue
    earliest = earliest === 0 ? year : Math.min(earliest, year)
  }
  return earliest
}

/** 发布日期和标题年份冲突时按更早的年份从年初算，宁严勿松。 */
function jobEvidenceDate(date?: string, title?: string): string {
  const published = parseTime(date)
  const publishedYear = published ? new Date(published).getFullYear() : 0
  const titleYear = yearInTitle(title)
  if (!published) return titleYear ? `${titleYear}-01-01` : ''
  if (titleYear && publishedYear && titleYear === publishedYear) return date ?? ''
  if (titleYear) return `${Math.min(publishedYear || titleYear, titleYear)}-01-01`
  return date ?? ''
}

export function isOldJob(date?: string, title?: string): boolean {
  return isOlderThanMonths(jobEvidenceDate(date, title), JOB_MAX_AGE_MONTHS)
}

/** 摘要截断时尽量停在句号，避免出现半句话。 */
export function clipSentence(value: string, max = 96): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  if (clean.length <= max) return clean
  const head = clean.slice(0, max)
  const cut = Math.max(
    ...['。', '！', '？', '；', '!', '?', ';'].map((mark) => head.lastIndexOf(mark))
  )
  if (cut >= max / 2) return head.slice(0, cut + 1)
  return `${head.trimEnd()}…`
}

function formatSalary(min: number, max: number, annual: boolean): string {
  if (annual) {
    if (min >= 10000) {
      const fmt = (value: number) =>
        (value / 10000).toFixed(value % 10000 === 0 ? 0 : 1).replace(/\.0$/, '')
      return `年薪${fmt(min)}-${fmt(max)}万`
    }
    return `年薪${min}-${max} 元`
  }
  if (min % 1000 === 0 && max % 1000 === 0) return `${min / 1000}-${max / 1000}K`
  return `${min}-${max} 元`
}

/** 只接受带金额单位的区间；「1-3 年经验」这类年限不算薪资。 */
export function salaryOf(snippet: string): string {
  const text = snippet.replace(/\s+/g, ' ')
  const withUnit =
    /(\d+(?:\.\d+)?)\s*([kK千万])\s*[-—~至到]\s*(\d+(?:\.\d+)?)\s*([kK千万])/.exec(text)
  if (withUnit) {
    const left = Number(withUnit[1]) * (withUnit[2] === '万' ? 10000 : 1000)
    const right = Number(withUnit[3]) * (withUnit[4] === '万' ? 10000 : 1000)
    if (left >= 1000 && right >= 1000 && right <= 500000) {
      const context = text.slice(
        Math.max(0, withUnit.index - 8),
        withUnit.index + withUnit[0].length + 8
      )
      return formatSalary(left, right, /年薪|\/\s*年|年包|每年/.test(context))
    }
  }

  const pattern = /(\d+(?:\.\d+)?)\s*[-—~至到]\s*(\d+(?:\.\d+)?)\s*(k|K|千|万|元)?/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    const [raw, leftText, rightText, unit] = match
    const left = Number(leftText)
    const right = Number(rightText)
    const end = match.index + raw.length
    const after = text.slice(end, end + 2)
    if (/^\s*(年|个月|月)/.test(after)) continue
    if (!unit && (left < 1000 || right < 1000)) continue
    if (left > 500000 || right > 500000) continue
    const context = text.slice(Math.max(0, match.index - 8), end + 8)
    const annual = /年薪|\/\s*年|年包|每年/.test(context)
    if (unit === '元') {
      return formatSalary(left, right, annual)
    }
    if (unit) {
      const factor = unit === '万' ? 10000 : 1000
      return formatSalary(left * factor, right * factor, annual)
    }
    return `${leftText}-${rightText} 元`
  }
  return ''
}

/** 薪资统计、专业介绍、就业前景这类文章页不是具体岗位，不能当招聘卡片。 */
export function looksLikeArticle(text: string): boolean {
  return /(薪资样本|职位薪资样本|取自\s*\d+\s*份|薪资水平报告|工资待遇报告|就业前景(如何|怎么样)?|就业方向|就业分析|专业(介绍|排名)|报考指南|值得报吗|工资待遇排名)/.test(
    text
  )
}

export function looksLikeJob(title: string, snippet: string): boolean {
  const text = `${title} ${snippet}`
  if (looksLikeArticle(text)) return false
  if (/^职位信息$|^招聘岗位$|^热门职位$|^最新职位$/.test(title.trim())) return false
  return /招聘|岗位|职位|应届生|校招|实习/.test(text)
}

/** 城市落地页只有地名，没有具体岗位。 */
export function isCityLanding(title: string): boolean {
  return MAJOR_CITIES.includes(title.replace(/\s+/g, ''))
}

/** 招聘门户、人才网、就业网的总入口页不是具体岗位。 */
export function isPortalPage(title: string): boolean {
  if (/有限公司|集团|银行|事务所|学校|医院|研究院/.test(title)) return false
  return /(中国公共招聘网|人才网|招聘网|人社局|就业网|就业信息网|就业指导中心|招聘信息网)/.test(
    title
  )
}

export function jobScore(item: SearchResult, targetCity: string): number {
  let score = 0
  const time = parseTime(jobEvidenceDate(item.publishedAt, item.title))
  if (time > 0) {
    const months = calendarMonthsBetween(time, new Date())
    if (months > JOB_MAX_AGE_MONTHS) score -= 4
    else if (months <= 3) score += 4
    else if (months <= 12) score += 3
    else score += 1
  }

  const text = `${item.title} ${item.snippet}`
  if (/招聘|岗位|职位|应届生|校招/.test(item.title)) score += 2
  if (/薪资|月薪|年薪|待遇/.test(text)) score += 1
  const foundCity = cityInText(text)
  if (targetCity && foundCity && targetCity.includes(foundCity)) score += 2
  return score
}

/** 标题里常带站点后缀，卡片上只留岗位名。 */
export function cleanJobTitle(title: string): string {
  const raw = title.replace(/\s+/g, ' ').trim()
  const quoted = /[「【]([^」】]+?)(?:招聘|招聘中)[」】]/.exec(raw)?.[1]
  if (quoted) return quoted.trim().slice(0, 60)
  const beforeUnderscore = /^(.+?)招聘_/.exec(raw)?.[1]
  if (beforeUnderscore) return beforeUnderscore.trim().slice(0, 60)
  return raw.replace(/[-_](招聘|职位|岗位).*$/, '').trim().slice(0, 60)
}

export function dedupeKey(url: string): string {
  return url.replace(/\/$/, '')
}

/** 从标题/摘要里找公司名；找不到就用来源站名，不编造。 */
export function companyOf(item: SearchResult): string {
  const title = item.title.replace(/\s+/g, '')
  const after = /_([^_「」]{2,80}?)招聘(?:信息|[-_]|$)/.exec(title)?.[1]
  if (after) return after.replace(/^\d{4}年/, '').trim()
  const inTitle =
    /(?:招聘|职位)[-_]([^\-_]{2,40}?(?:有限公司|集团|银行|事务所|中心))/.exec(title)?.[1]
  if (inTitle) return inTitle
  const inSnippet =
    /([一-龥A-Za-z0-9（）()]{2,30}?(?:股份有限公司|有限公司|集团|银行|事务所|科技公司|信息技术公司))/.exec(
      item.snippet
    )?.[1]
  if (inSnippet) return inSnippet
  return item.site || '招聘页面'
}

function experienceOf(snippet: string): string {
  return /(经验不限|在校\/应届|应届生|\d+-\d+年|\d+年以上)/.exec(snippet)?.[1] ?? ''
}

function educationOf(snippet: string): string {
  return /(学历不限|本科|大专|硕士|博士|中专\/中技)/.exec(snippet)?.[1] ?? ''
}

/** 摘要里优先留岗位职责/要求；没有就清掉前面的福利堆砌和登录提示。 */
export function requirementOf(item: SearchResult): string {
  const head = item.snippet.slice(0, 180)
  let text = item.snippet.replace(/\s+/g, ' ').trim()
  text = text.replace(/^招聘中\s*/, '')
  const stop = text.search(/点击登录|首次验证|微信扫码|竞争力分析|求职安全|安全提示/)
  if (stop > 0) text = text.slice(0, stop)
  const marker = /(岗位职责|岗位要求|任职要求|任职资格|职位描述|工作内容|岗位描述|职位要求)/.exec(
    text
  )
  if (marker) {
    text = text.slice(marker.index)
  } else {
    text = text.replace(
      /^(?:\S{2,8}(?:险|金|奖|假|补|团建|旅游|餐|住|双休|体检|零食)\s*)+/,
      ''
    )
  }
  const prefix = [
    educationOf(head) ? `学历：${educationOf(head)}` : '',
    experienceOf(head) ? `经验：${experienceOf(head)}` : ''
  ]
    .filter(Boolean)
    .join('；')
  const body = clipSentence(text, 120)
  return clipSentence([prefix, body].filter(Boolean).join('；'), 140)
}

/** 方向检索会带回跑偏的岗位，至少要和方向词沾边。 */
export function directionRelevant(text: string, direction: JobDirection): boolean {
  const lower = text.toLowerCase()
  if (direction.keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) return true
  return direction.query
    .split(/\s+/)
    .filter(Boolean)
    .some((token) => lower.includes(token.toLowerCase()))
}
