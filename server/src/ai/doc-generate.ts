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
  deadlineFact,
  normalizeDocAiContent,
  serializeDoc,
  type DocAiContent,
  type DocReportInput
} from '../../../shared/src/doc'
import { computeDocScores } from '../../../shared/src/docScore'
import { inferDirectionKey, jobDirections, type JobDirection } from '../../../shared/src/job-map'
import { calendarMonthsBetween, isOlderThanMonths } from '../../../shared/src/date'
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

const MAJOR_CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '苏州',
  '重庆', '天津', '长沙', '郑州', '青岛', '厦门', '合肥', '宁波', '东莞', '佛山',
  '无锡', '济南', '福州', '大连', '沈阳', '昆明', '南昌', '贵阳', '南宁', '石家庄',
  '太原', '长春', '哈尔滨', '兰州', '乌鲁木齐', '呼和浩特', '海口', '银川', '西宁', '拉萨'
]

// 招聘原文超过 18 个整月就不再当投递入口，只保留要求结构。
const JOB_MAX_AGE_MONTHS = 18

function parseTime(value?: string): number {
  if (!value) return 0
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

function isOldJob(date?: string): boolean {
  return isOlderThanMonths(date ?? '', JOB_MAX_AGE_MONTHS)
}

function cityInText(value: string): string {
  return MAJOR_CITIES.find((city) => value.includes(city)) ?? ''
}

function cityOf(survey: Survey, answers: Answers): string {
  const question = survey.questions.find((item) => item.id === 'q8')
  const value = answers.q8
  if (!question || typeof value !== 'string') return ''
  const label = question.options?.find((option) => option.id === value)?.label ?? ''
  if (!label || label.includes('还没想好')) return ''
  const clean = label.replace(/（.*?）/g, '').trim()
  // Q8 里有「新一线」「北上广深」「家乡省会」这类档位，不能直接当城市去搜。
  if (MAJOR_CITIES.includes(clean)) return clean
  if (/家乡|回家/.test(clean)) {
    const q4 = answers.q4
    const home = Array.isArray(q4) ? String(q4[0] ?? '') : ''
    return cityInText(home)
  }
  return ''
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

async function searchOne(query: string): Promise<SearchResult[]> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await searchWeb(query, { count: 6 })
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
async function runSearches(specs: { query: string }[]): Promise<SearchRun> {
  const results: SearchResult[][] = []
  const errors: string[] = []
  const queries: string[] = []
  const uniqueUrls = new Set<string>()
  for (let index = 0; index < specs.length; index += 1) {
    if (index > 0) await sleep(500)
    const query = specs[index].query
    queries.push(query)
    try {
      const items = await searchOne(query)
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
  const time = parseTime(item.publishedAt)
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
    query: `${place}${keyword} ${year} 应届 招聘`.trim()
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

  const city = cityOf(survey, answers)
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

  const byUrl = new Map<string, { item: SearchResult; directionKey?: string }>()
  const allErrors: string[] = []
  const allQueries: string[] = []
  const allUrls = new Set<string>()

  const collect = (run: SearchRun, specs: QuerySpec[]): void => {
    allErrors.push(...run.errors)
    allQueries.push(...run.queries)
    run.uniqueUrls.forEach((url) => allUrls.add(url))
    run.results.forEach((items, index) => {
      for (const item of items) {
        const key = dedupeKey(item.url)
        const existing = byUrl.get(key)
        if (!existing) {
          byUrl.set(key, { item, directionKey: specs[index]?.key })
        } else if (!existing.directionKey && specs[index]?.key) {
          byUrl.set(key, { item, directionKey: specs[index].key })
        }
      }
    })
  }

  const buildRanked = (): RankedJob[] => {
    const seenTitles = new Set<string>()
    const ranked: RankedJob[] = []
    for (const { item, directionKey } of byUrl.values()) {
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
        score: jobScore(item, city) + (inferred ? 1 : 0) - (article ? 2 : 0),
        weak: article || !looksLikeJob(item.title, item.snippet)
      })
    }
    return ranked
  }

  const usableOf = (ranked: RankedJob[]): RankedJob[] =>
    ranked
      .filter((entry) => !entry.weak && !isOldJob(entry.item.publishedAt))
      .sort((a, b) => b.score - a.score)

  let run = await runSearches(primarySpecs)
  collect(run, primarySpecs)
  let ranked = buildRanked()
  let usable = usableOf(ranked)

  const missingDirections = useDirections
    ? directions.filter(
        (direction) => !usable.some((entry) => entry.directionKey === direction.key)
      )
    : []

  // 校招方向没搜到足够的新岗位、或某个方向完全没有原文时，再用通用词补位。
  if (usable.length < 3 || missingDirections.length > 0) {
    const supplementSpecs: QuerySpec[] = missingDirections.slice(0, 2).map((direction) => ({
      key: direction.key,
      query: `${city ? `${city} ` : ''}${direction.query} 应届 招聘`.trim()
    }))
    if (usable.length < 3) {
      supplementSpecs.push({
        query: `${city ? `${city} ` : ''}${role} 应届 招聘`.trim()
      })
    }
    if (supplementSpecs.length) {
      run = await runSearches(supplementSpecs)
      collect(run, supplementSpecs)
      ranked = buildRanked()
      usable = usableOf(ranked)
    }
  }

  // 还没有任何可用原文时，才退回普通网页检索；只接受像具体招聘的结果。
  if (ranked.length === 0) {
    const fallbackSpecs: QuerySpec[] = [
      { query: `${city ? `${city} ` : ''}${role} ${queryYear()} 校园招聘`.trim() }
    ]
    run = await runSearches(fallbackSpecs)
    collect(run, fallbackSpecs)
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
  const jobs = picked.slice(0, 10).map(({ item, directionKey }) => ({
    title: cleanJobTitle(item.title),
    company: companyOf(item),
    city: cityInText(`${item.title} ${item.snippet}`),
    salary: salaryOf(item.snippet) || '薪资以原文为准',
    requirement: requirementOf(item),
    url: item.url,
    date: item.publishedAt,
    directionKey,
    stale: isOldJob(item.publishedAt)
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
          relatedJobCount: block.relatedJobs.length
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
        paragraphsRequired: false,
        textRequired: false,
        allFields: [],
        anyFields: [],
        data: {
          lines: block.lines,
          jobs: block.jobs.map(jobSpec)
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
            distance: deadline.distance,
            targetDate: deadline.targetDate
          },
          hoursLine: block.subtitle,
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
        months: deadline.months,
        distance: deadline.distance,
        targetDate: deadline.targetDate,
        text: deadline.text
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

function contentTexts(content: DocAiContent): { where: string; text: string }[] {
  const texts: { where: string; text: string }[] = [
    { where: '结论', text: content.conclusion }
  ]
  for (const module of content.modules) {
    texts.push({ where: `模块 ${module.key} 标题`, text: module.title })
    texts.push({ where: `模块 ${module.key} 判断`, text: module.summary })
    module.paragraphs.forEach((text, index) =>
      texts.push({ where: `模块 ${module.key} 第 ${index + 1} 段`, text })
    )
    for (const item of module.items) {
      texts.push({ where: `模块 ${module.key} 的 ${item.key}`, text: item.text ?? '' })
      for (const [key, value] of Object.entries(item.fields ?? {})) {
        texts.push({ where: `模块 ${module.key} 的 ${item.key}.${key}`, text: value })
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

function collectAllowedNumbers(sources: string[]): Set<string> {
  const allowed = new Set<string>()
  for (const source of sources) {
    for (const match of source.matchAll(/\d+(?:\.\d+)?/g)) {
      allowed.add(normalizeNumberToken(match[0]))
    }
  }
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

function auditNumbers(content: DocAiContent, allowed: Set<string>): string[] {
  const problems: string[] = []
  for (const { where, text } of contentTexts(content)) {
    for (const match of text.matchAll(/\d+(?:\.\d+)?/g)) {
      const token = normalizeNumberToken(match[0])
      if (allowed.has(token)) continue
      problems.push(`${where} 出现系统没有提供的数字「${match[0]}」`)
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
- 所有数字只能原样使用 moduleSpecs、jobSpecs、问卷回答或检索记录里的值，不能自己计算、换算或估算。
- 时间只使用系统给出的粗粒度表达；不要写「547 天」「24 个月」「2 年」这种数字加时间单位。
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
  const planPeriods = specs.flatMap((spec) =>
    spec.items
      .map((item) => item.data.period)
      .filter((period): period is string => typeof period === 'string' && period.length > 0)
  )
  const answerLines = answerText(survey, answers)
  const today = new Date().toISOString().slice(0, 10)
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
    const textIssues = findTextIssues(content, planPeriods)
    const numberIssues = auditNumbers(content, allowedNumbers)
    if (problems.length === 0 && textIssues.length === 0 && numberIssues.length === 0) break
    if (pass === 1) {
      if (numberIssues.length > 0) {
        throw new Error(`数字核对未通过：${numberIssues[0]}`)
      }
      if (problems.length > 0) {
        throw new Error(`AI 报告模块不完整：${problems[0]}`)
      }
      throw new Error(`AI 报告审校未通过：${textIssues[0]}`)
    }

    const feedback = [
      '你上一次输出的报告有以下问题，需要修正：',
      ...problems.slice(0, 10).map((item) => `- ${item}`),
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
        stale: isOldJob(date)
      })
    }
    jobs.sort((a, b) => parseTime(b.date) - parseTime(a.date))
    return { content, jobs, search: normalizeSearchMeta(record.search) }
  } catch {
    return null
  }
}
