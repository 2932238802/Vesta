import type {
  Answers,
  JobCard,
  ReportPayload,
  ReportSearchMeta,
  ReportSearchSource,
  Survey
} from '../../../shared/src/types'
import {
  buildDocReport,
  cityInText,
  deadlineFact,
  MAJOR_CITIES,
  normalizeDocAiContent,
  resolveTargetCity,
  serializeDoc,
  type DocAiContent,
  type DocReportInput
} from '../../../shared/src/doc'
import { computeDocScores } from '../../../shared/src/docScore'
import { inferDirectionKey, jobDirections, type JobDirection } from '../../../shared/src/job-map'
import { calendarMonthsBetween, formatCalendarDate, isOlderThanMonths } from '../../../shared/src/date'
import { config } from '../env'
import { getDocReportSkill, now, type ReportSkillSource } from '../db'
import { askDeepSeek, parseJsonObject } from './deepseek'
import { searchWeb, type SearchResult } from './bocha'

export interface DocAiMeta {
  model: string
  generatedAt: string
  skill: Pick<ReportSkillSource, 'id' | 'name' | 'hash'>
  search: ReportSearchMeta
  audit: { passed: true; repaired: boolean }
}

interface ModuleItemSpec {
  key: string
  data: Record<string, unknown>
}

interface ModuleSpec {
  key: string
  kind: string
  /** 这个模块必须有一句 AI 判断 */
  summaryRequired: boolean
  /** 这个模块必须有 AI 正文 */
  paragraphsRequired: boolean
  /** 每个 item 必须写 text */
  textRequired: boolean
  /** 每个 item 必须填哪些字段 */
  allFields: string[]
  /** 每个 item 至少要填其中几个字段之一 */
  anyFields: string[]
  data: Record<string, unknown>
  items: ModuleItemSpec[]
}

function answerText(survey: Survey, answers: Answers): string {
  const values = serializeDoc(survey, answers)
  return Object.entries(values)
    .map(([key, value]) => {
      const text = Array.isArray(value) ? value.join('、') : value === null ? '' : String(value)
      return text.trim() ? `${key}：${text}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

// 招聘原文超过 18 个整月就不再当投递入口，只保留要求结构。
const JOB_MAX_AGE_MONTHS = 18

function parseTime(value?: string): number {
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

function isOldJob(date?: string, title?: string): boolean {
  return isOlderThanMonths(jobEvidenceDate(date, title), JOB_MAX_AGE_MONTHS)
}

/** 摘要截断时尽量停在句号，避免出现半句话。 */
function clipSentence(value: string, max = 96): string {
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function searchOne(query: string, freshness = 'oneYear'): Promise<SearchResult[]> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await searchWeb(query, { count: 6, freshness })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const limited = /429|request limit|频率|限流/i.test(message)
      if (!limited || attempt === 2) throw error
      await sleep(1200 * (attempt + 1))
    }
  }
  return []
}

interface SearchRun {
  results: SearchResult[][]
  errors: string[]
  queries: string[]
  uniqueUrls: Set<string>
}

/** 博查有 QPS 限制，串行跑并留间隔，避免一份报告把配额瞬间打满。 */
async function runSearches(specs: QuerySpec[]): Promise<SearchRun> {
  const results: SearchResult[][] = []
  const errors: string[] = []
  const queries: string[] = []
  const uniqueUrls = new Set<string>()
  for (let index = 0; index < specs.length; index += 1) {
    if (index > 0) await sleep(500)
    const query = specs[index].query
    queries.push(query)
    try {
      const items = await searchOne(query, specs[index].freshness)
      results.push(items)
      items.forEach((item) => uniqueUrls.add(item.url.replace(/\/$/, '')))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('[doc-report] 招聘检索失败', query, message)
      errors.push(`${query}：${message}`)
      results.push([])
    }
  }
  return { results, errors, queries, uniqueUrls }
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
function salaryOf(snippet: string): string {
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
function looksLikeArticle(text: string): boolean {
  return /(薪资样本|职位薪资样本|取自\s*\d+\s*份|薪资水平报告|工资待遇报告|就业前景(如何|怎么样)?|就业方向|就业分析|专业(介绍|排名)|报考指南|值得报吗|工资待遇排名)/.test(
    text
  )
}

function looksLikeJob(title: string, snippet: string): boolean {
  const text = `${title} ${snippet}`
  if (looksLikeArticle(text)) return false
  if (/^职位信息$|^招聘岗位$|^热门职位$|^最新职位$/.test(title.trim())) return false
  return /招聘|岗位|职位|应届生|校招|实习/.test(text)
}

/** 城市落地页只有地名，没有具体岗位。 */
function isCityLanding(title: string): boolean {
  return MAJOR_CITIES.includes(title.replace(/\s+/g, ''))
}

/** 招聘门户、人才网、就业网的总入口页不是具体岗位。 */
function isPortalPage(title: string): boolean {
  if (/有限公司|集团|银行|事务所|学校|医院|研究院/.test(title)) return false
  return /(中国公共招聘网|人才网|招聘网|人社局|就业网|就业信息网|就业指导中心|招聘信息网)/.test(
    title
  )
}

function jobScore(item: SearchResult, targetCity: string): number {
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
function cleanJobTitle(title: string): string {
  const raw = title.replace(/\s+/g, ' ').trim()
  const quoted = /[「【]([^」】]+?)(?:招聘|招聘中)[」】]/.exec(raw)?.[1]
  if (quoted) return quoted.trim().slice(0, 60)
  const beforeUnderscore = /^(.+?)招聘_/.exec(raw)?.[1]
  if (beforeUnderscore) return beforeUnderscore.trim().slice(0, 60)
  return raw.replace(/[-_](招聘|职位|岗位).*$/, '').trim().slice(0, 60)
}

function dedupeKey(url: string): string {
  return url.replace(/\/$/, '')
}

/** 从标题/摘要里找公司名；找不到就用来源站名，不编造。 */
function companyOf(item: SearchResult): string {
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
function requirementOf(item: SearchResult): string {
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
function directionRelevant(text: string, direction: JobDirection): boolean {
  const lower = text.toLowerCase()
  if (direction.keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) return true
  return direction.query
    .split(/\s+/)
    .filter(Boolean)
    .some((token) => lower.includes(token.toLowerCase()))
}

interface QuerySpec {
  key?: string
  query: string
  /** 博查时间窗：主检索用一年，补位用一个月；不传时沿用博查默认 */
  freshness?: string
  /** 补位结果只作要求结构参考，不参与门槛统计 */
  fallback?: boolean
}

function queryYear(): number {
  return new Date().getFullYear()
}

function buildSearchSpecs(input: {
  city: string
  role: string
  directions: JobDirection[]
  useDirections: boolean
}): QuerySpec[] {
  const place = input.city ? `${input.city} ` : ''
  const year = queryYear()
  const fresh = (keyword: string, key?: string): QuerySpec => ({
    key,
    query: `${place}${keyword} ${year} 应届 招聘`.trim(),
    freshness: 'oneYear'
  })
  const specs: QuerySpec[] = []
  if (input.useDirections) {
    input.directions.forEach((direction) => {
      specs.push(fresh(direction.query, direction.key))
    })
  } else {
    specs.push(fresh(input.role))
  }
  return specs
}

interface RankedJob {
  item: SearchResult
  score: number
  weak: boolean
  directionKey?: string
  fallback: boolean
}

/** 用博查抓真实招聘原文，做成可点开的卡片；查询词、来源和失败原因全部记录下来。 */
export async function searchJobs(
  survey: Survey,
  answers: Answers
): Promise<{ jobs: JobCard[]; search: ReportSearchMeta }> {
  const searchedAt = now()
  const configured = Boolean(config.bochaApiKey && config.bochaBaseUrl)
  if (!configured) {
    const reason = !config.bochaApiKey
      ? '未配置 BOCHA_API_KEY，无法检索招聘原文'
      : '未配置 BOCHA_BASE_URL，无法检索招聘原文'
    return {
      jobs: [],
      search: {
        configured: false,
        attempted: false,
        queries: [],
        error: reason,
        resultCount: 0,
        searchedAt,
        sources: []
      }
    }
  }

  const city = resolveTargetCity(survey, answers).city
  const explicitRole = String(answers.q5a ?? '').trim()
  const major = String(answers.q2 ?? '').trim()
  // 学生没写具体岗位时，用专业方向去搜；不要把「专业+相关岗位」当岗位名。
  const role = explicitRole || major
  if (!role) {
    return {
      jobs: [],
      search: {
        configured: true,
        attempted: false,
        queries: [],
        error: '问卷里没有专业或目标岗位，无法生成检索词',
        resultCount: 0,
        searchedAt,
        sources: []
      }
    }
  }

  const directions = jobDirections(major)
  const useDirections = directions.length > 0 && !explicitRole
  const primarySpecs = buildSearchSpecs({ city, role, directions, useDirections })

  const byUrl = new Map<string, { item: SearchResult; directionKey?: string; fallback: boolean }>()
  const allErrors: string[] = []
  const allQueries: string[] = []
  const allUrls = new Set<string>()

  const collect = (run: SearchRun, specs: QuerySpec[]): void => {
    allErrors.push(...run.errors)
    allQueries.push(...run.queries)
    run.uniqueUrls.forEach((url) => allUrls.add(url))
    run.results.forEach((items, index) => {
      const spec = specs[index]
      for (const item of items) {
        const key = dedupeKey(item.url)
        const existing = byUrl.get(key)
        if (!existing) {
          byUrl.set(key, {
            item,
            directionKey: spec?.key,
            fallback: Boolean(spec?.fallback)
          })
        } else {
          // 同一 URL 在主检索和补位里都出现时，按主检索处理（不标 fallback）。
          if (!existing.directionKey && spec?.key) existing.directionKey = spec.key
          if (!spec?.fallback) existing.fallback = false
        }
      }
    })
  }

  const buildRanked = (): RankedJob[] => {
    const seenTitles = new Set<string>()
    const ranked: RankedJob[] = []
    for (const { item, directionKey, fallback } of byUrl.values()) {
      const titleKey = `${item.title.replace(/\s+/g, '')}|${item.site}`
      if (seenTitles.has(titleKey)) continue
      seenTitles.add(titleKey)
      if (isCityLanding(item.title)) continue
      if (isPortalPage(item.title)) continue
      const text = `${item.title} ${item.snippet}`
      const article = looksLikeArticle(text)
      const inferred = directionKey || inferDirectionKey(text, directions)
      if (useDirections && inferred) {
        const direction = directions.find((entry) => entry.key === inferred)
        if (direction && !directionRelevant(text, direction)) continue
      }
      ranked.push({
        item,
        directionKey: inferred,
        score: jobScore(item, city) + (inferred ? 1 : 0) - (article ? 2 : 0) - (fallback ? 1 : 0),
        weak: article || !looksLikeJob(item.title, item.snippet),
        fallback
      })
    }
    return ranked
  }

  const usableOf = (ranked: RankedJob[]): RankedJob[] =>
    ranked
      .filter(
        (entry) => !entry.weak && !isOldJob(entry.item.publishedAt, entry.item.title)
      )
      .sort((a, b) => b.score - a.score)

  // 渐进式检索：先搜第 1 个方向，可用原文够 3 条就不再花后面的额度；
  // 不足时才退回全量检索，行为与改动前一致（见 docs/archive/20261112/7-博查检索成本优化-设计方案.md）。
  const [firstSpec, ...restSpecs] = primarySpecs
  let run = await runSearches(firstSpec ? [firstSpec] : [])
  collect(run, firstSpec ? [firstSpec] : [])
  let ranked = buildRanked()
  let usable = usableOf(ranked)
  let searchedAll = restSpecs.length === 0

  if (usable.length < 3 && restSpecs.length > 0) {
    // runSearches 只在同一个 run 内保持 500ms 间隔；这里另起一轮，手动补上间隔。
    await sleep(500)
    run = await runSearches(restSpecs)
    collect(run, restSpecs)
    ranked = buildRanked()
    usable = usableOf(ranked)
    searchedAll = true
  }

  // 没搜完就不判断缺失方向，避免「只搜了一个方向」把其余方向当成缺位再补搜一次。
  const missingDirections =
    searchedAll && useDirections
      ? directions.filter(
          (direction) => !usable.some((entry) => entry.directionKey === direction.key)
        )
      : []

  // 校招方向没搜到足够的新岗位、或某个方向完全没有原文时，再用通用词补位。
  if (usable.length < 3 || missingDirections.length > 0) {
    const supplementSpecs: QuerySpec[] = missingDirections.slice(0, 2).map((direction) => ({
      key: direction.key,
      query: `${city ? `${city} ` : ''}${direction.query} 应届 招聘`.trim(),
      freshness: 'oneYear'
    }))
    if (usable.length < 3) {
      supplementSpecs.push({
        query: `${city ? `${city} ` : ''}${role} 应届 招聘`.trim(),
        freshness: 'oneYear'
      })
    }
    if (supplementSpecs.length) {
      run = await runSearches(supplementSpecs)
      collect(run, supplementSpecs)
      ranked = buildRanked()
      usable = usableOf(ranked)
    }
  }

  // 一年内可用原文仍不足 3 条时，用一个月窗补一次。
  // 补来的结果只作「要求结构参考」，标记 fallback 后不进 directionFacts 统计。
  if (usable.length < 3 && primarySpecs[0]) {
    const fallbackSpec: QuerySpec = {
      ...primarySpecs[0],
      freshness: 'oneMonth',
      fallback: true
    }
    run = await runSearches([fallbackSpec])
    collect(run, [fallbackSpec])
    ranked = buildRanked()
    usable = usableOf(ranked)
  }

  // 还没有任何可用原文时，才退回普通网页检索；只接受像具体招聘的结果。
  if (ranked.length === 0) {
    const fallbackSpec: QuerySpec = {
      query: `${city ? `${city} ` : ''}${role} ${queryYear()} 校园招聘`.trim(),
      freshness: 'oneYear',
      fallback: true
    }
    run = await runSearches([fallbackSpec])
    collect(run, [fallbackSpec])
    ranked = buildRanked()
    usable = usableOf(ranked)
  }

  // 优先取「像具体招聘且不太旧」的结果；不够 3 条时，再补其他可核对原文。
  const picked = [...usable]
  if (useDirections) {
    const perDirection: RankedJob[] = []
    for (const direction of directions) {
      perDirection.push(
        ...usable.filter((entry) => entry.directionKey === direction.key).slice(0, 2)
      )
    }
    picked.length = 0
    picked.push(...perDirection)
    const rest = usable.filter(
      (entry) =>
        !picked.some(
          (pickedItem) => dedupeKey(pickedItem.item.url) === dedupeKey(entry.item.url)
        )
    )
    picked.push(...rest.slice(0, 2))
  } else {
    picked.length = 0
    picked.push(...usable.slice(0, 3))
  }
  if (picked.length < 3) {
    const rest = ranked
      .filter(
        (entry) =>
          !picked.some(
            (pickedItem) => dedupeKey(pickedItem.item.url) === dedupeKey(entry.item.url)
          )
      )
      .filter(
        (entry) =>
          !entry.weak || /招聘|岗位|职位/.test(`${entry.item.title} ${entry.item.snippet}`)
      )
      .sort((a, b) => b.score - a.score)
    picked.push(...rest.slice(0, 3 - picked.length))
  }

  picked.sort((a, b) => b.score - a.score)
  const jobs = picked.slice(0, 10).map(({ item, directionKey, fallback }) => ({
    title: cleanJobTitle(item.title),
    company: companyOf(item),
    city: cityInText(`${item.title} ${item.snippet}`),
    salary: salaryOf(item.snippet),
    requirement: requirementOf(item),
    url: item.url,
    date: item.publishedAt,
    directionKey,
    stale: isOldJob(item.publishedAt, item.title),
    fallback
  }))

  let error = ''
  if (allErrors.length > 0) {
    error = jobs.length
      ? `部分检索失败：${allErrors[0]}`
      : `检索失败：${allErrors[0]}`
  } else if (jobs.length === 0) {
    error = '检索已经执行，但没有返回可用的招聘原文'
  }

  const sources: ReportSearchSource[] = jobs.map((job) => ({
    title: job.title,
    url: job.url,
    site: job.company,
    date: job.date
  }))

  return {
    jobs,
    search: {
      configured: true,
      attempted: allQueries.length > 0,
      queries: [...new Set(allQueries)],
      error,
      resultCount: allUrls.size,
      searchedAt,
      sources
    }
  }
}

function jobSpec(job: JobCard): Record<string, unknown> {
  return {
    title: job.title,
    company: job.company,
    city: job.city,
    salary: job.salary,
    requirement: job.requirement,
    date: job.date ?? '',
    url: job.url,
    stale: Boolean(job.stale),
    fallback: Boolean(job.fallback),
    directionKey: job.directionKey ?? '',
    meets: job.meets ?? [],
    missing: job.missing ?? []
  }
}

function buildModuleSpecs(input: {
  base: ReportPayload
  survey: Survey
  answers: Answers
  scores: ReturnType<typeof computeDocScores>
  jobs: JobCard[]
}): ModuleSpec[] {
  const { base, survey, answers, scores } = input
  const specs: ModuleSpec[] = []
  const answersView = serializeDoc(survey, answers)
  const deadline = deadlineFact(survey, answers)
  const targetCity = resolveTargetCity(survey, answers)

  for (const block of base.blocks) {
    if (block.type === 'scorecard') {
      specs.push({
        key: 'scorecard',
        kind: 'scores',
        summaryRequired: true,
        paragraphsRequired: false,
        textRequired: true,
        allFields: [],
        anyFields: [],
        data: {
          scale: '0—10',
          potentialLevel: block.potential.level,
          spaceLabel: block.potential.label,
          backgroundCount: block.background.length,
          personalCount: block.personal.length
        },
        items: [...block.background, ...block.personal].map((item) => ({
          key: item.key,
          data: {
            label: item.label,
            score: item.score,
            source: item.source ?? '',
            rule: item.note,
            benchmark: item.benchmark ?? ''
          }
        }))
      })
    } else if (block.type === 'assets') {
      specs.push({
        key: 'assets',
        kind: 'resources',
        summaryRequired: true,
        paragraphsRequired: false,
        textRequired: true,
        allFields: [],
        anyFields: [],
        data: { count: block.items.length },
        items: block.items.map((item) => ({
          key: item.key,
          data: { name: item.name, source: item.source ?? '' }
        }))
      })
    } else if (block.type === 'jobmap') {
      specs.push({
        key: 'jobmap',
        kind: 'directions',
        summaryRequired: true,
        paragraphsRequired: false,
        textRequired: false,
        allFields: ['name'],
        anyFields: ['what', 'entry', 'salary', 'fit'],
        data: {
          directionCount: block.directions.length,
          relatedJobCount: block.relatedJobs.length,
          targetCity
        },
        items: block.directions.map((direction) => ({
          key: direction.key,
          data: {
            nameHint: direction.name,
            facts: direction.facts,
            jobs: direction.jobs.map(jobSpec)
          }
        }))
      })
    } else if (block.type === 'gap') {
      specs.push({
        key: 'gap',
        kind: 'gap',
        summaryRequired: true,
        paragraphsRequired: true,
        textRequired: false,
        allFields: [],
        anyFields: [],
        data: {
          lines: block.lines,
          jobs: block.jobs.map(jobSpec),
          targetCity
        },
        items: []
      })
    } else if (block.type === 'roadmap') {
      specs.push({
        key: 'roadmap',
        kind: 'plan',
        summaryRequired: true,
        paragraphsRequired: false,
        textRequired: false,
        allFields: ['label', 'goal', 'output'],
        anyFields: [],
        data: {
          node: {
            node: deadline.node,
            windowText: deadline.windowText,
            targetDate: deadline.targetDate
          },
          phaseCount: block.phases.length
        },
        items: block.phases.map((phase) => ({
          key: phase.key,
          data: { period: phase.period }
        }))
      })
    } else if (block.type === 'checklist') {
      specs.push({
        key: 'checklist',
        kind: 'verification',
        summaryRequired: true,
        paragraphsRequired: false,
        textRequired: false,
        allFields: ['title', 'detail'],
        anyFields: [],
        data: { count: block.items.length },
        items: block.items.map((item) => ({
          key: item.key,
          data: { search: item.search }
        }))
      })
    } else if (block.type === 'section') {
      specs.push({
        key: 'english',
        kind: 'english',
        summaryRequired: false,
        paragraphsRequired: true,
        textRequired: false,
        allFields: [],
        anyFields: [],
        data: { ...scores.english },
        items: []
      })
    }
  }

  specs.push(
    {
      key: 'stuck',
      kind: 'chapter',
      summaryRequired: false,
      paragraphsRequired: true,
      textRequired: false,
      allFields: [],
      anyFields: [],
      data: {
        q13_execution: answersView.q13_execution,
        q14_method: answersView.q14_method,
        q16_info: answersView.q16_info,
        q19_how: answersView.q19_how,
        q20_weekly_hours: answersView.q20_weekly_hours,
        q28_self: answersView.q28_self
      },
      items: []
    },
    {
      key: 'deadline',
      kind: 'chapter',
      summaryRequired: false,
      paragraphsRequired: true,
      textRequired: false,
      allFields: [],
      anyFields: [],
      data: {
        node: deadline.node,
        windowText: deadline.windowText,
        targetDate: deadline.targetDate
      },
      items: []
    },
    {
      key: 'future',
      kind: 'chapter',
      summaryRequired: false,
      paragraphsRequired: true,
      textRequired: false,
      allFields: [],
      anyFields: [],
      data: {
        q26_future: answersView.q26_future,
        q8_city: answersView.q8_city,
        q5a_target_job: answersView.q5a_target_job,
        q28_self: answersView.q28_self
      },
      items: []
    }
  )

  return specs
}

function moduleSpecsForPrompt(specs: ModuleSpec[]): unknown[] {
  return specs.map((spec) => ({
    key: spec.key,
    kind: spec.kind,
    summaryRequired: spec.summaryRequired,
    paragraphsRequired: spec.paragraphsRequired,
    fields: spec.items.some((item) => item.data)
      ? { all: spec.allFields, any: spec.anyFields, textRequired: spec.textRequired }
      : undefined,
    data: spec.data,
    items: spec.items
  }))
}

function contentProblems(content: DocAiContent, specs: ModuleSpec[]): string[] {
  const problems: string[] = []
  if (!content.conclusion) problems.push('缺少 conclusion 一句话结论')
  const expected = new Set(specs.map((spec) => spec.key))
  const seen = new Set<string>()
  for (const module of content.modules) {
    if (!expected.has(module.key)) {
      problems.push(`出现了 moduleSpecs 里没有的模块 ${module.key}`)
    }
    if (seen.has(module.key)) problems.push(`模块 ${module.key} 重复`)
    seen.add(module.key)
  }
  for (const spec of specs) {
    const module = content.modules.find((item) => item.key === spec.key)
    if (!module) {
      problems.push(`缺少模块 ${spec.key}`)
      continue
    }
    if (!module.title) problems.push(`模块 ${spec.key} 缺少标题`)
    if (spec.summaryRequired && !module.summary) {
      problems.push(`模块 ${spec.key} 缺少 summary 判断`)
    }
    if (spec.paragraphsRequired && module.paragraphs.length === 0) {
      problems.push(`模块 ${spec.key} 缺少正文段落`)
    }
    const itemKeys = new Set(spec.items.map((item) => item.key))
    for (const item of module.items) {
      if (!itemKeys.has(item.key)) {
        problems.push(`模块 ${spec.key} 出现了未声明的 item ${item.key}`)
      }
    }
    for (const expectedItem of spec.items) {
      const item = module.items.find((entry) => entry.key === expectedItem.key)
      if (!item) {
        problems.push(`模块 ${spec.key} 缺少 item ${expectedItem.key}`)
        continue
      }
      if (spec.textRequired && !item.text) {
        problems.push(`模块 ${spec.key} 的 item ${item.key} 缺少 text`)
      }
      for (const field of spec.allFields) {
        if (!item.fields?.[field]?.trim()) {
          problems.push(`模块 ${spec.key} 的 item ${item.key} 缺少字段 ${field}`)
        }
      }
      if (
        spec.anyFields.length > 0 &&
        !spec.anyFields.some((field) => item.fields?.[field]?.trim())
      ) {
        problems.push(
          `模块 ${spec.key} 的 item ${item.key} 至少要填写 ${spec.anyFields.join(' / ')} 中的一个`
        )
      }
    }
  }
  return problems
}

/** 跨模块一致性：同一件事不能让两个模块各说一套。返回给 AI 重写用的具体冲突。 */
function crossModuleIssues(content: DocAiContent, specs: ModuleSpec[]): string[] {
  const issues: string[] = []
  const moduleOf = (key: string) => content.modules.find((item) => item.key === key)
  const specOf = (key: string) => specs.find((item) => item.key === key)

  // gap 的「只有一项空着」是整体结论，不能和评分卡里技能/实习的低分并存。
  const scorecard = specOf('scorecard')
  const gap = moduleOf('gap')
  if (scorecard && gap) {
    const weak = scorecard.items.some(
      (item) =>
        (item.key === 'skill' || item.key === 'practice') &&
        typeof item.data.score === 'number' &&
        item.data.score < 3
    )
    const texts = [gap.summary, ...gap.paragraphs]
    if (
      weak &&
      texts.some((text) => /只有一[项个]|只剩一[项个]|只差一[项个]|只缺一[项个]/.test(text))
    ) {
      issues.push(
        'gap 写了「只有一项空着」这类整体结论，但评分卡里技能或实习低于 3 分；只能说某一个答案字段空着，不能概括成整体只差一项'
      )
    }
  }

  // 方向卡：过期原文参与时 entry 必须带结构参考前缀；原文对专业写法不一致时 fit 必须写明。
  const jobmap = moduleOf('jobmap')
  const jobmapSpec = specOf('jobmap')
  if (jobmap && jobmapSpec) {
    for (const specItem of jobmapSpec.items) {
      const item = jobmap.items.find((entry) => entry.key === specItem.key)
      if (!item) continue
      const jobs = Array.isArray(specItem.data.jobs)
        ? (specItem.data.jobs as Record<string, unknown>[])
        : []
      const entry = item.fields?.entry?.trim() ?? ''
      if (
        entry &&
        jobs.some((job) => job.stale === true) &&
        !/仅看要求结构|不能当投递入口/.test(entry)
      ) {
        issues.push(
          `方向 ${specItem.key} 有过期原文参与，entry 必须写「仅看要求结构，不能当投递入口」，不能当成现在的投递门槛`
        )
      }
      const facts = Array.isArray(specItem.data.facts)
        ? specItem.data.facts.filter((fact): fact is string => typeof fact === 'string')
        : []
      const fit = item.fields?.fit?.trim() ?? ''
      if (
        fit &&
        facts.some((fact) => fact.includes('原文对专业的写法不一致')) &&
        !/不一致|以具体岗位为准/.test(fit)
      ) {
        issues.push(
          `方向 ${specItem.key} 的原文对专业写法不一致，fit 必须写明「原文对专业的写法不一致，以具体岗位为准」`
        )
      }
    }
  }
  return issues
}

interface RepetitionContext {
  /** 系统给出的粗粒度时间距离，如「三年」「5 个月」 */
  distance: string
  /** Q8 选项原文，如「新一线（杭州、成都、武汉、西安等）」 */
  cityLabel: string
  /** resolveTargetCity() 落到检索词里的具体城市，可能为空 */
  city: string
}

/** 取「新一线（杭州、成都、武汉、西安等）」括号里的城市清单。 */
function cityListInLabel(labelText: string): string {
  const inner = /[（(]([^）)]+)[）)]/.exec(labelText)?.[1]?.replace(/\s+/g, '') ?? ''
  return inner.length >= 4 ? inner : ''
}

/**
 * 全报告去重：时间距离、目标城市档位串、「缺一段经历」整句这类同一事实，
 * 系统已经给了固定次数，AI 正文多写就判重复，先反馈重写，不写进报告。
 */
export function repetitionIssues(content: DocAiContent, ctx: RepetitionContext): string[] {
  const issues: string[] = []
  const seen = new Set<string>()
  const distancePattern =
    /(?:还有|距离)[^。；\n]{0,16}?约?\s*(?:[一二两三四五六七八九十半]+|\d+)\s*(?:个)?(?:年|月)/g
  const missingPattern = /缺一段[^。；\n]{0,24}/g

  const cityLabel = ctx.cityLabel.replace(/\s+/g, '')
  const cityList = cityListInLabel(cityLabel)
  // 只有 Q8 选的是「新一线」「北上广深」「家乡（…）」这类档位写法时才拦；北京、杭州这种具体城市不必拦。
  const checkCityLabel =
    Boolean(cityLabel) &&
    cityLabel !== ctx.city &&
    (/[（(]/.test(cityLabel) || /新一线|北上广深|等/.test(cityLabel))
  const cityTarget = ctx.city || '本次未限定城市'

  let missingCount = 0
  const distanceWhere = new Set<string>()
  const distanceText = ctx.distance.replace(/\s+/g, '')
  for (const { where, text } of contentTexts(content)) {
    if (!text.trim()) continue
    const flat = text.replace(/\s+/g, '')
    for (const match of text.matchAll(distancePattern)) {
      distanceWhere.add(where)
      const key = `distance:${match[0]}`
      if (seen.has(key)) continue
      seen.add(key)
      issues.push(
        `${where} 重复了系统已经给出的时间距离「${match[0]}」；整份报告只在 gap 的「关键时间窗」和路线图副标题各写一次，正文和标题不要再写`
      )
    }
    // 「大约三年」「三年后」这类没有「还有 / 距离」前缀的写法同样算重复。
    if (
      distanceText &&
      !distanceWhere.has(where) &&
      (flat.includes(`约${distanceText}`) || flat.includes(`${distanceText}后`))
    ) {
      distanceWhere.add(where)
      issues.push(
        `${where} 重复了系统已经给出的时间距离「${ctx.distance}」；整份报告只在 gap 的「关键时间窗」和路线图副标题各写一次，正文和标题不要再写`
      )
    }
    if (checkCityLabel) {
      if ((flat.includes(cityLabel) || (cityList && flat.includes(cityList))) && !seen.has(`city:${where}`)) {
        seen.add(`city:${where}`)
        issues.push(
          `${where} 回抄了问卷 Q8 的目标城市选项原文；目标城市统一写系统给的具体城市「${cityTarget}」，不要带整串档位说明`
        )
      }
    }
    missingCount += [...text.matchAll(missingPattern)].length
  }

  if (missingCount > 1) {
    issues.push(
      `「缺一段和目标方向对得上的经历」这类整句出现了 ${missingCount} 处；整份报告最多保留一处，岗位卡只写这条原文的具体要求`
    )
  }

  if (ctx.distance) {
    for (const module of content.modules) {
      const where = `模块 ${module.key} 标题`
      if (module.title && module.title.includes(ctx.distance) && !distanceWhere.has(where)) {
        issues.push(`${where} 重复了时间距离「${ctx.distance}」；标题不要复述系统已给的时间`)
      }
    }
  }

  return issues
}

interface ContentText {
  where: string
  text: string
  moduleKey?: string
  itemKey?: string
  moduleSummary?: boolean
}

function contentTexts(content: DocAiContent): ContentText[] {
  const texts: ContentText[] = [
    { where: '结论', text: content.conclusion }
  ]
  for (const module of content.modules) {
    texts.push({ where: `模块 ${module.key} 标题`, text: module.title, moduleKey: module.key })
    texts.push({
      where: `模块 ${module.key} 判断`,
      text: module.summary,
      moduleKey: module.key,
      moduleSummary: true
    })
    module.paragraphs.forEach((text, index) =>
      texts.push({
        where: `模块 ${module.key} 第 ${index + 1} 段`,
        text,
        moduleKey: module.key
      })
    )
    for (const item of module.items) {
      texts.push({
        where: `模块 ${module.key} 的 ${item.key}`,
        text: item.text ?? '',
        moduleKey: module.key,
        itemKey: item.key
      })
      for (const [key, value] of Object.entries(item.fields ?? {})) {
        texts.push({
          where: `模块 ${module.key} 的 ${item.key}.${key}`,
          text: value,
          moduleKey: module.key,
          itemKey: item.key
        })
      }
    }
  }
  return texts
}

/** 规则层先挡明显问题，AI 再修一次；问题还在就失败，不把坏文本写进报告。 */
export function findTextIssues(content: DocAiContent, planPeriods: string[] = []): string[] {
  const issues: string[] = []
  // 系统生成的阶段时间窗（如「第 10—28 个月」）是合法事实；只有当数字正好落在
  // 这段窗口里才放行，「还有 28 个月」这种距离表达仍然要拦。
  const insidePlanWindow = (text: string, match: RegExpMatchArray): boolean => {
    if (match.index === undefined) return false
    for (const period of planPeriods) {
      let from = 0
      while (from <= text.length) {
        const start = text.indexOf(period, from)
        if (start === -1) break
        const end = start + period.length
        if (match.index >= start && match.index < end) return true
        from = start + 1
      }
    }
    return false
  }
  for (const { where, text } of contentTexts(content)) {
    if (!text.trim()) continue
    if (/(\{\{|\}\}|\{name\}|undefined|null|NaN|XX|示例)/.test(text)) {
      issues.push(`${where} 出现未替换的占位内容`)
    }
    if (/([、，。；：,;:])\1/.test(text) || /[、，]\s*[，、]/.test(text)) {
      issues.push(`${where} 标点重复或连用`)
    }
    if (/的是[、，]/.test(text)) {
      issues.push(`${where} 的「的是」后面缺内容`)
    }
    if (/(报班|报课|学费|名额|不学就来不及|不过级就没戏|不必依赖付费课程|不用报班)/.test(text)) {
      issues.push(`${where} 出现禁用词`)
    }
    if (/没有硬性门槛|保持阅读和表达就够了|英语不是(重点|主线)/.test(text)) {
      issues.push(`${where} 出现没有材料支撑的英语弱化判断`)
    }
    if (/(天坑|野鸡|垃圾专业|最差专业)/.test(text)) {
      issues.push(`${where} 出现贬低专业的说法`)
    }
    if (/\d+(?:\.\d+)?\s*天/.test(text)) {
      issues.push(`${where} 使用了「天」作为时间距离，必须换成粗粒度表达`)
    }
    for (const match of text.matchAll(/(\d+)\s*个月/g)) {
      if (Number(match[1]) >= 12 && !insidePlanWindow(text, match)) {
        issues.push(`${where} 的「${match[0]}」没有使用一年/两年的粗粒度表达`)
      }
    }
    for (const match of text.matchAll(/(^|[^\d])(\d{1,2})\s*年/g)) {
      issues.push(`${where} 的「${match[2]} 年」必须改成中文粗粒度表达`)
    }
  }
  return [...new Set(issues)]
}

function normalizeNumberToken(value: string): string {
  const number = Number(value)
  return Number.isFinite(number) ? String(number) : value
}

function collectNumberTokens(sources: string[]): Set<string> {
  const numbers = new Set<string>()
  for (const source of sources) {
    for (const match of source.matchAll(/\d+(?:\.\d+)?/g)) {
      numbers.add(normalizeNumberToken(match[0]))
    }
  }
  return numbers
}

function collectAllowedNumbers(sources: string[]): Set<string> {
  const allowed = collectNumberTokens(sources)
  // 中文数字和问卷里的「四级」「大一」是同一事实的另一种写法，不把它误判成新数字。
  const chinese: Record<string, string> = {
    一: '1',
    二: '2',
    两: '2',
    三: '3',
    四: '4',
    五: '5',
    六: '6',
    七: '7',
    八: '8',
    九: '9',
    十: '10'
  }
  const joined = sources.join('\n')
  for (const [char, value] of Object.entries(chinese)) {
    if (joined.includes(char)) allowed.add(value)
  }
  return allowed
}

/** 「0—10 分」「满分 10 分」「10 分制」是量纲或门槛说明，不是单项得分。 */
function isScoreDimension(text: string, index: number, end: number): boolean {
  const before = text.slice(Math.max(0, index - 8), index)
  // end 落在「分」之后；从「分」本身开始取，才能识别「10 分制」。
  const after = text.slice(Math.max(index, end - 1), end + 1)
  return (
    /[—~\-至/]\s*$/.test(before) ||
    /(满分|入场线|门槛|基准)\s*$/.test(before) ||
    /^\s*分制/.test(after)
  )
}

/** 识别文本里的分数表达：`N 分`、`得分 N`、`N/10`。其余数字交给全报告白名单。 */
function findScoreValues(text: string): { value: number; index: number; end: number }[] {
  const hits: { value: number; index: number; end: number }[] = []
  const seen = new Set<string>()
  const patterns = [
    /(\d+(?:\.\d+)?)\s*分/g,
    /(?:得分|分数)\s*(?:为|是|约|在|：|:)?\s*(\d+(?:\.\d+)?)/g,
    /(\d+(?:\.\d+)?)\s*\/\s*10(?!\d)/g
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = Number(match[1])
      if (!Number.isFinite(value)) continue
      const matchIndex = match.index ?? 0
      const index = matchIndex + match[0].indexOf(match[1])
      const key = `${value}@${index}`
      if (seen.has(key)) continue
      seen.add(key)
      hits.push({ value, index, end: matchIndex + match[0].length })
    }
  }
  return hits
}

function auditNumbers(content: DocAiContent, allowed: Set<string>, specs: ModuleSpec[]): string[] {
  const problems: string[] = []

  // scorecard 的分数单独校验：item 文本里的分数必须等于该项 score，
  // 模块 summary 里的分数必须是本模块某一项的 score；都不能靠全报告白名单混过去。
  const itemScores = new Map<string, number>()
  const scorecardScores = new Set<string>()
  for (const spec of specs) {
    if (spec.key !== 'scorecard') continue
    for (const item of spec.items) {
      if (typeof item.data.score !== 'number') continue
      itemScores.set(`${spec.key}/${item.key}`, item.data.score)
      scorecardScores.add(normalizeNumberToken(String(item.data.score)))
    }
  }

  for (const entry of contentTexts(content)) {
    for (const match of entry.text.matchAll(/\d+(?:\.\d+)?/g)) {
      const token = normalizeNumberToken(match[0])
      if (!allowed.has(token)) {
        problems.push(`${entry.where} 出现系统没有提供的数字「${match[0]}」`)
      }
    }

    const itemScore = entry.itemKey
      ? itemScores.get(`${entry.moduleKey}/${entry.itemKey}`)
      : undefined
    const isScorecardSummary = entry.moduleSummary === true && entry.moduleKey === 'scorecard'
    if (itemScore === undefined && !isScorecardSummary) continue

    for (const hit of findScoreValues(entry.text)) {
      if (isScoreDimension(entry.text, hit.index, hit.end)) continue
      if (itemScore !== undefined) {
        if (hit.value !== itemScore) {
          problems.push(
            `${entry.where} 写了 ${hit.value} 分，但系统给这一项的分数是 ${itemScore} 分`
          )
        }
      } else if (!scorecardScores.has(normalizeNumberToken(String(hit.value)))) {
        problems.push(`${entry.where} 写了 ${hit.value} 分，但不是这一模块任何一项的分数`)
      }
    }
  }
  return [...new Set(problems)].slice(0, 8)
}

function outputContract(): string {
  return `## 本次机器约束

只输出一个 JSON 对象，不要 Markdown 代码块，不要解释：
{"conclusion":"一句话结论","modules":[{"key":"moduleSpecs 里的 key","title":"你写的标题","summary":"一句话判断","paragraphs":["正文"],"items":[{"key":"item key","text":"解释","fields":{"字段":"内容"}}]}]}

- modules 必须覆盖 moduleSpecs 里的每一个 key，不能增、不能删、不能改 key。
- 每个模块的 items 必须覆盖该模块 items 里的每一个 key。
- summaryRequired 为 true 的模块必须写 summary；paragraphsRequired 为 true 的模块必须写至少一段 paragraphs。
- gap 的 summary / paragraphs 只能基于 moduleSpecs.data.lines 和 jobs 里已有的事实写；没有的事实不要补，不要再写固定的「入场线」「城市判断」「下一步」建议句。
- gap 说「空着」「还没有」只能指某一个问卷答案字段（例如目标岗位没写），不能写成「整体只差一项」「只有一项空着」这类整体结论；moduleSpecs.data.lines 里「现在能写进简历的」写「还没有」时，必须承认简历里目前没有可写的经历或技能。
- jobmap 某个方向有 stale 为 true 的招聘原文参与时，entry 必须以「仅看要求结构，不能当投递入口」开头，不能当成现在的投递门槛。
- jobmap 的 facts 出现「原文对专业的写法不一致」时，fit 要写明这句、以具体岗位为准，不能只写「原文没写专业限制」。
- scorecard 每个 item 的 text 如提到分数，必须等于该 item 在 moduleSpecs 里的 score；scorecard 的 summary 如提到分数，必须是本模块某一项的 score。不要写别的 item 的分数，也不要用 10 分制总分冒充单项分。
- 所有数字只能原样使用 moduleSpecs、jobSpecs、问卷回答或检索记录里的值，不能自己计算、换算或估算。
- jobSpecs 里 fallback 为 true 的原文是主检索不足时的补位结果，只能参考要求结构，不能用来统计「几条原文」或门槛数量；stale 为 true 的过期原文同理，不能当成当前投递门槛。
- 原文没有写薪资时不要写「薪资以原文为准」之类的话，也不要补一个薪资数字；没有就略过薪资。
- 时间只使用系统给出的粗粒度表达；不要写「547 天」「24 个月」「2 年」这种数字加时间单位。
- 整份报告的时间距离只由系统给出两处：gap 的「关键时间窗」和 roadmap 副标题。conclusion、模块标题和正文都不要再写「还有约 X」「距离 X」或「X 年后」；deadline 模块只讲这个节点的准备含义。
- 目标城市统一写 moduleSpecs 给出的具体城市（gap.data.targetCity.city）；不要回抄问卷 Q8 选项原文，也不要带「新一线（杭州、成都、武汉、西安等）」这类整串档位说明。
- 英语块不要再重复每周投入和总时长（roadmap 副标题已经给过一次），只写怎么补、怎么验证。
- 「简历上缺一段和目标方向对得上的经历」这类整句整份报告最多出现一次；岗位卡只写这条原文的具体要求，不要复述整句。
- 过期原文的说明由块副标题统一给出；模块正文和标题不要逐条重复「这是某年的公告」。
- roadmap 的 label 只写阶段名（如「方向确认」「实践积累」），不要重复系统给的时间窗，也不要写月份数字。`
}

async function requestJson(history: { role: 'system' | 'user' | 'assistant'; content: string }[]): Promise<unknown> {
  const rawText = await askDeepSeek(history)
  try {
    return parseJsonObject(rawText)
  } catch {
    const repair = [
      ...history,
      { role: 'assistant' as const, content: rawText.slice(0, 4000) },
      {
        role: 'user' as const,
        content: '上一条不是合法 JSON。请严格按输出结构，只输出一个合法 JSON 对象，不要代码块。'
      }
    ]
    return parseJsonObject(await askDeepSeek(repair))
  }
}

export async function generateDocContent(input: {
  survey: Survey
  answers: Answers
  name: string
  slug: string
  createdAt: string
  claimed: boolean
}): Promise<{
  content: DocAiContent
  meta: DocAiMeta
  jobs: JobCard[]
  search: ReportSearchMeta
}> {
  const { survey, answers } = input
  // 只认管理后台当前启用的规则；为空或找不到时直接失败，绝不回退到内置模板。
  const skill = getDocReportSkill()
  const scores = computeDocScores(survey, answers)
  const deadline = deadlineFact(survey, answers)

  // 先搜索，再构建模块事实：招聘原文是 jobmap / gap 的证据，不能等 AI 写完再补。
  const { jobs, search } = await searchJobs(survey, answers)
  const baseInput: DocReportInput = {
    survey,
    answers,
    name: input.name,
    slug: input.slug,
    createdAt: input.createdAt,
    claimed: input.claimed
  }
  const base = buildDocReport(baseInput, jobs)
  const specs = buildModuleSpecs({ base, survey, answers, scores, jobs })
  const answersView = serializeDoc(survey, answers)
  const repetitionContext: RepetitionContext = {
    distance: deadline.distance,
    cityLabel: typeof answersView.q8_city === 'string' ? answersView.q8_city : '',
    city: resolveTargetCity(survey, answers).city
  }
  const planPeriods = specs.flatMap((spec) =>
    spec.items
      .map((item) => item.data.period)
      .filter((period): period is string => typeof period === 'string' && period.length > 0)
  )
  const answerLines = answerText(survey, answers)
  const today = formatCalendarDate(new Date())
  const jobSpecs = jobs.map(jobSpec)
  const searchSummary = search.error
    ? `状态：${search.error}`
    : search.attempted
      ? `已执行 ${search.queries.length} 次检索，返回 ${search.resultCount} 条结果，采用 ${jobs.length} 条原文。`
      : '本次没有执行外部检索。'

  const userPrompt = `今天是 ${today}。
学生：${input.name || '同学'}

【问卷回答】
${answerLines}

【代码算好的模块事实 moduleSpecs】
${JSON.stringify(moduleSpecsForPrompt(specs))}

【招聘原文 jobSpecs】
${JSON.stringify(jobSpecs)}

【检索记录】
检索词：${search.queries.join('；') || '（无）'}
${searchSummary}

请按 Skill 的要求写整份报告，只输出规定的 JSON 对象。`

  const messages = [
    { role: 'system' as const, content: `${skill.skill}\n\n---\n\n${outputContract()}` },
    { role: 'user' as const, content: userPrompt }
  ]

  let content = normalizeDocAiContent(await requestJson(messages))
  let repaired = false
  const allowedNumbers = collectAllowedNumbers([
    answerLines,
    JSON.stringify(specs),
    JSON.stringify(jobSpecs),
    JSON.stringify(search),
    survey.title,
    input.name,
    today
  ])

  for (let pass = 0; pass < 2; pass += 1) {
    const problems = contentProblems(content, specs)
    const consistencyIssues = crossModuleIssues(content, specs)
    const repetitions = repetitionIssues(content, repetitionContext)
    const textIssues = findTextIssues(content, planPeriods)
    const numberIssues = auditNumbers(content, allowedNumbers, specs)
    if (
      problems.length === 0 &&
      consistencyIssues.length === 0 &&
      repetitions.length === 0 &&
      textIssues.length === 0 &&
      numberIssues.length === 0
    ) {
      break
    }
    if (pass === 1) {
      if (numberIssues.length > 0) {
        throw new Error(`数字核对未通过：${numberIssues[0]}`)
      }
      if (problems.length > 0) {
        throw new Error(`AI 报告模块不完整：${problems[0]}`)
      }
      if (consistencyIssues.length > 0) {
        throw new Error(`AI 报告前后矛盾：${consistencyIssues[0]}`)
      }
      if (repetitions.length > 0) {
        throw new Error(`AI 报告重复：${repetitions[0]}`)
      }
      throw new Error(`AI 报告审校未通过：${textIssues[0]}`)
    }

    const feedback = [
      '你上一次输出的报告有以下问题，需要修正：',
      ...problems.slice(0, 10).map((item) => `- ${item}`),
      ...consistencyIssues.slice(0, 6).map((item) => `- ${item}`),
      ...repetitions.slice(0, 6).map((item) => `- ${item}`),
      ...textIssues.slice(0, 10).map((item) => `- ${item}`),
      ...numberIssues.slice(0, 10).map((item) => `- ${item}`),
      '请保留已经正确的分析，补全所有缺失模块和字段，并重新输出完整 JSON。',
      '不要新增任何数字；数字只能原样使用系统提供的值。'
    ].join('\n')

    content = normalizeDocAiContent(
      await requestJson([
        ...messages,
        { role: 'assistant' as const, content: JSON.stringify(content).slice(0, 14_000) },
        { role: 'user' as const, content: feedback }
      ])
    )
    repaired = true
  }

  return {
    content,
    jobs,
    search,
    meta: {
      model: config.deepseekModel,
      generatedAt: now(),
      skill: { id: skill.id, name: skill.name, hash: skill.hash },
      search,
      audit: { passed: true, repaired }
    }
  }
}

export interface StoredDocReport {
  content: DocAiContent
  jobs: JobCard[]
  search?: ReportSearchMeta
}

/** 旧报告里可能存着「1-3」这种从年限误抓的薪资，读取时清掉。 */
function cleanStoredSalary(value: string): string {
  const clean = value.trim()
  if (!clean) return ''
  const bare = /^(\d+(?:\.\d+)?)\s*[-—~至]\s*(\d+(?:\.\d+)?)$/.exec(clean)
  if (bare && (Number(bare[1]) < 1000 || Number(bare[2]) < 1000)) return ''
  return clean
}

/** 旧报告里的摘要曾被硬截 90 字，读取时补省略号，避免像一句没写完的话。 */
function cleanStoredRequirement(value: string): string {
  const clean = clipSentence(value, 120)
  if (!clean) return ''
  if (clean.length >= 80 && !/[。！？；!?;…]$/.test(clean)) return `${clean}…`
  return clean
}

function normalizeSearchMeta(raw: unknown): ReportSearchMeta | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const record = raw as Record<string, unknown>
  const strings = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : []
  const sources: ReportSearchSource[] = []
  if (Array.isArray(record.sources)) {
    for (const item of record.sources) {
      if (!item || typeof item !== 'object') continue
      const source = item as Record<string, unknown>
      const url = typeof source.url === 'string' ? source.url : ''
      if (!/^https?:\/\//i.test(url)) continue
      sources.push({
        title: String(source.title ?? '检索原文').trim() || '检索原文',
        url,
        site: String(source.site ?? '').trim(),
        date: typeof source.date === 'string' ? source.date : undefined
      })
    }
  }
  return {
    configured: record.configured === true,
    attempted: record.attempted === true,
    queries: strings(record.queries),
    error: typeof record.error === 'string' ? record.error : '',
    resultCount: Number(record.resultCount) || 0,
    searchedAt: typeof record.searchedAt === 'string' ? record.searchedAt : '',
    sources
  }
}

export function readDocContent(raw: string | null): StoredDocReport | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const record = parsed as { doc?: unknown; content?: unknown; jobs?: unknown; search?: unknown }
    if (record.doc !== true) return null
    const content = normalizeDocAiContent(record.content)
    if (!content.conclusion && content.sections.length === 0 && content.modules.length === 0) {
      return null
    }
    const rawJobs = Array.isArray(record.jobs) ? record.jobs : []
    const jobs: JobCard[] = []
    for (const item of rawJobs) {
      if (!item || typeof item !== 'object') continue
      const job = item as Record<string, unknown>
      if (typeof job.url !== 'string' || !/^https?:\/\//i.test(job.url)) continue
      const title = String(job.title ?? '招聘信息').trim() || '招聘信息'
      if (isCityLanding(title)) continue
      const date = typeof job.date === 'string' ? job.date : undefined
      jobs.push({
        title,
        company: String(job.company ?? '').trim(),
        city: String(job.city ?? '').trim(),
        salary: cleanStoredSalary(String(job.salary ?? '')),
        requirement: cleanStoredRequirement(String(job.requirement ?? '')),
        url: job.url,
        date,
        directionKey: typeof job.directionKey === 'string' ? job.directionKey : undefined,
        stale: isOldJob(date, title),
        fallback: job.fallback === true
      })
    }
    jobs.sort((a, b) => parseTime(b.date) - parseTime(a.date))
    return { content, jobs, search: normalizeSearchMeta(record.search) }
  } catch {
    return null
  }
}
