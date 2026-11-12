import type {
  Answers,
  JobCard,
  ReportSearchMeta,
  ReportSearchSource,
  Survey
} from '../../../shared/src/types'
import {
  cityInText,
  cohortYear,
  friendlySearchError,
  MAJOR_CITIES,
  resolveTargetCity
} from '../../../shared/src/doc'
import { inferDirectionKey, jobDirections, type JobDirection } from '../../../shared/src/job-map'
import { calendarMonthsBetween, isOlderThanMonths } from '../../../shared/src/date'
import { config } from '../env'
import { now } from '../db'
import { searchWeb, type SearchResult } from './bocha'

// 招聘原文超过 18 个整月就不再当投递入口，只保留要求结构。
const JOB_MAX_AGE_MONTHS = 18

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const LIMITED_ERROR = /429|request limit|rate limit|频率|限流|too many/i
/** 瞬时网络错误：重试一次通常就好，不该直接触发整轮补搜。 */
const TRANSIENT_ERROR =
  /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|network|aborted|timeout|timed out/i

async function searchOne(query: string, freshness = 'oneYear'): Promise<SearchResult[]> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await searchWeb(query, { count: 6, freshness })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const limited = LIMITED_ERROR.test(message)
      const transient = TRANSIENT_ERROR.test(message)
      // 无权限、参数错误这类确定性失败，重试也没用，直接抛出。
      if (!limited && !transient) throw error
      // 瞬时网络错误只补一次；429 / 限流保持原来的最多三次退避。
      if (transient && !limited && attempt >= 1) throw error
      if (attempt === 2) throw error
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
      const friendly = friendlySearchError(message)
      console.warn('[doc-report] 招聘检索失败', query, message)
      errors.push(`${query}：${friendly}`)
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
export function isCityLanding(title: string): boolean {
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

function buildSearchSpecs(input: {
  city: string
  role: string
  directions: JobDirection[]
  useDirections: boolean
  cohort: number
}): QuerySpec[] {
  const place = input.city ? `${input.city} ` : ''
  // 用学生自己的毕业届别，不用系统当前年：否则大一新生会被搜成今年的应届。
  const fresh = (keyword: string, key?: string): QuerySpec => ({
    key,
    query: `${place}${keyword} ${input.cohort} 届 招聘`.trim(),
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
  const cohort = cohortYear(survey, answers)
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
  const primarySpecs = buildSearchSpecs({ city, role, directions, useDirections, cohort })

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
      query: `${city ? `${city} ` : ''}${direction.query} ${cohort} 届 招聘`.trim(),
      freshness: 'oneYear'
    }))
    if (usable.length < 3) {
      supplementSpecs.push({
        query: `${city ? `${city} ` : ''}${role} ${cohort} 届 招聘`.trim(),
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
      query: `${city ? `${city} ` : ''}${role} ${cohort} 届 校园招聘`.trim(),
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
      sources,
      cohortYear: cohort
    }
  }
}
