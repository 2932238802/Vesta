import type { SearchResult } from './bocha'
import { clipSentence, salaryOf } from './job-card'
import { inferDirectionKey, type JobDirection } from '../../../shared/src/job-map'
import { cityInText, MAJOR_CITIES } from '../../../shared/src/doc'
import {
  calendarMonthsBetween,
  isOlderThanMonths,
  toCalendarDate
} from '../../../shared/src/date'

/** 全链路唯一的招聘时效门槛：今天往前 12 个完整月。 */
export const JOB_MAX_AGE_MONTHS = 12

export function parseTime(value?: string): number {
  if (!value) return 0
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

/** 标题里常带「2022届」「[2024]」这类年份，是发布时间之外的第二条时效证据。 */
export function yearInTitle(title?: string): number {
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

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function isoDate(year: number, month: number, day: number): string {
  const probe = toCalendarDate(`${year}-${pad2(month)}-${pad2(day)}`)
  return probe ? `${probe.year}-${pad2(probe.month)}-${pad2(probe.day)}` : ''
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
}

/** 摘要里的发布时间是第三条证据；只认带年份和「发布 / 更新 / posted」标签的写法。 */
function dateInSnippet(snippet?: string): string {
  if (!snippet) return ''
  const text = snippet.replace(/\s+/g, ' ')
  const labeled =
    /(?:发布时间|发布日期|更新时间|刊登时间|刷新时间|更新于|posted(?:\s+on)?|published(?:\s+on)?)\s*[:：]?\s*(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/i.exec(
      text
    )
  if (labeled) return isoDate(Number(labeled[1]), Number(labeled[2]), Number(labeled[3]))
  const english =
    /(?:posted|published)\s*(?:on)?\s*[:：]?\s*(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{4})/i.exec(text)
  if (!english) return ''
  const month = MONTHS[english[2].slice(0, 3).toLowerCase()]
  return month ? isoDate(Number(english[3]), month, Number(english[1])) : ''
}

/** 三条日期证据取最早：博查日期、标题年份、摘要里的发布时间。 */
export function evidenceDate(item: SearchResult): string {
  const candidates: string[] = []
  const published = parseTime(item.publishedAt)
  if (published) {
    const date = new Date(published)
    candidates.push(
      `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    )
  }
  const titleYear = yearInTitle(item.title)
  if (titleYear) candidates.push(`${titleYear}-01-01`)
  const snippet = dateInSnippet(item.snippet)
  if (snippet) candidates.push(snippet)
  if (!candidates.length) return ''
  return candidates.sort()[0]
}

/** 旧报告只存了日期和标题，兼容入口按同样两条证据判过期。 */
export function isOldJob(date?: string, title?: string): boolean {
  const published = parseTime(date)
  const publishedYear = published ? new Date(published).getFullYear() : 0
  const titleYear = yearInTitle(title)
  let evidence = date ?? ''
  if (!published) evidence = titleYear ? `${titleYear}-01-01` : ''
  else if (titleYear && titleYear !== publishedYear) {
    evidence = `${Math.min(publishedYear || titleYear, titleYear)}-01-01`
  }
  return isOlderThanMonths(evidence, JOB_MAX_AGE_MONTHS)
}

/** 网址本身就是文章 / 问答 / 词条页时，标题再像招聘也不当岗位详情。 */
const ARTICLE_URL =
  /(?:^|[/.])(?:news|newsdetail|article|ask|question|zhidao|baike|zhihu|tieba|blog|wiki|gonglue|baokao|zhaokao)(?:[/.]|$)/i

/** 岗位详情页的常见路径与 ID。 */
const JOB_URL =
  /(?:\/jobs?(?:[/?]|$)|jobdetail|job_detail|jobinfo|zhaogong|zhaopin|position|positions|careers?|compjob|correcruit|job_\d+|jobid=|\/id\/\d+)/i

const JOB_DUTIES =
  /岗位职责|任职要求|职位描述|工作内容|岗位要求|职位要求|job description|responsibilities|qualifications/i

/** 薪资统计、专业介绍、就业前景、培训推荐这类文章页不是具体岗位。 */
export function looksLikeArticle(item: SearchResult): boolean {
  if (ARTICLE_URL.test(item.url)) return true
  const text = `${item.title} ${item.snippet}`
  if (JOB_DUTIES.test(text) || salaryOf(item.snippet)) return false
  return /(薪资样本|职位薪资样本|取自\s*\d+\s*份|薪资水平报告|工资待遇报告|就业前景(如何|怎么样)?|就业方向|就业分析|专业(介绍|排名)|报考指南|值得报吗|工资待遇排名|培训机构|培训学校|培训课程|去哪学|哪里学|问答|贴吧|论坛|百科)/.test(
    text
  )
}

const ROLE_OR_COMPANY =
  /工程师|工程|设计师|设计|研发|专员|经理|主管|助理|会计|出纳|审计|教师|老师|护士|医生|律师|顾问|销售|运营|开发|测试|分析师|程序员|文员|行政|人事|财务|法务|翻译|编辑|记者|策划|客服|采购|物流|技术员|操作工|实习生|有限公司|集团|银行|事务所|研究院|医院|学校|学院|公司|job ?search|jobs?\b|careers?|recruit|talent|engineer|developer|designer|manager|java|python|web|sql|php|ui|ux|\d{4,}\s*[-—~至]\s*\d{4,}/i

/** 详情页：URL 带岗位路径 / ID，或标题里同时有招聘词和公司名 / 岗位名。 */
export function isDetailPage(item: SearchResult): boolean {
  if (ARTICLE_URL.test(item.url)) return false
  if (JOB_URL.test(item.url)) return true
  // 很多站点用纯数字 ID 的 .html，但文章站已在上面排除。
  if (/\d{5,}\.(?:s?html?|php|aspx?)(?:[?#]|$)/i.test(item.url)) return true
  const title = `${item.title}`
  return (
    /招聘|职位|岗位|任职要求|岗位职责|职位描述|job description|responsibilities/i.test(
      `${item.title} ${item.snippet}`
    ) && (/有限公司|集团|银行|事务所|研究院|医院|学校|学院|公司/.test(title) || ROLE_OR_COMPANY.test(title))
  )
}

/** 门户页：标题去掉站点后缀后，只剩「XX人才网 / XX招聘网」这类入口名。 */
export function isPortalPage(title: string): boolean {
  const segments = title
    .split(/\s*[-—_|｜]\s*/)
    .map((part) => part.replace(/\s+/g, ''))
    .filter(Boolean)
  const portalName =
    /^(?:中国公共招聘网|[一-龥A-Za-z0-9]{0,12}(?:人才网|招聘网|招聘信息网|求职网|就业网|就业信息网|就业指导中心|人社局)|应届生求职网|首页|招聘信息|校园招聘|社会招聘|最新职位|热门职位)$/
  const meaningful = segments.filter((part) => !portalName.test(part))
  if (!meaningful.length) return true
  return !meaningful.some((part) => ROLE_OR_COMPANY.test(part))
}

/** 城市落地页只有地名，没有具体岗位。 */
export function isCityLanding(title: string): boolean {
  return MAJOR_CITIES.includes(title.replace(/\s+/g, ''))
}

/** 岗位证据：薪资、经验/学历、人数/截止各算一项，职责描述也算一项。 */
function evidenceCount(item: SearchResult): { strong: number; weak: number } {
  const text = `${item.title} ${item.snippet}`
  const strong = [
    Boolean(salaryOf(item.snippet)) ||
      /薪资|月薪|年薪|salary|\$\s*\d+|\d{4,}\s*[-—~至]\s*\d{4,}\s*元(?:\s*\/\s*月)?/i.test(text),
    /经验不限|应届毕业生|应届生|在校|(?:\d+)\s*[-—~至]\s*(?:\d+)\s*年|(?:\d+)\s*年以上|experience/i.test(
      text
    ) ||
      /学历不限|本科|大专|硕士|博士|中专|统招|学历|bachelor|master|degree/i.test(text),
    /招\s*\d+\s*人|招聘人数|人数[:：]\s*\d+|\b\d+\s*(?:名|人)\b|headcount/i.test(text) ||
      /截止(?:日期|时间)|报名时间|有效期至|deadline/i.test(text),
    JOB_DUTIES.test(text)
  ].filter(Boolean).length

  const weak = [
    /招聘|岗位|职位|应届|校招|实习|jobs?|careers?|hiring|engineer|developer|designer|manager/i.test(
      `${item.title} ${item.url}`
    ),
    /有限公司|集团|银行|事务所|研究院|医院|学校|学院|公司/.test(text) ||
      /:\/\/[^/]*(?:jobs|careers)\./i.test(item.url),
    Boolean(cityInText(text))
  ].filter(Boolean).length
  return { strong, weak }
}

const ROLE_SUFFIX =
  /(?:工程师|设计师|程序员|经理|专员|主管|顾问|助理|会计|老师|教师|护士|医生|律师|翻译|编辑|记者|策划|运营|销售|客服|文员|行政|人事|财务|法务|采购|物流|审计|出纳|实习生|开发|测试|设计)$/

const ROLE_EN: [RegExp, string[]][] = [
  [/工程师|工程/, ['engineer', 'engineering']],
  [/设计师|设计/, ['designer', 'design']],
  [/开发/, ['developer', 'development', 'engineer']],
  [/测试/, ['test', 'qa', 'quality']],
  [/经理|主管/, ['manager', 'lead']],
  [/销售/, ['sales']],
  [/运营/, ['operations', 'operation']],
  [/会计|财务/, ['accountant', 'finance']],
  [/老师|教师/, ['teacher']],
  [/翻译/, ['translator', 'translation']],
  [/律师/, ['lawyer', 'legal']],
  [/护士|医生|护理/, ['nurse', 'doctor', 'medical']],
  [/采购/, ['purchasing', 'procurement']],
  [/物流/, ['logistics']],
  [/编辑|记者/, ['editor', 'journalist']],
  [/分析/, ['analyst', 'analysis']]
]

function roleVariants(role: string): string[] {
  const variants = new Set<string>([role])
  const stripped = role.replace(ROLE_SUFFIX, '')
  if (stripped.length >= 2 && stripped !== role) variants.add(stripped)
  role
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .forEach((token) => variants.add(token))
  ROLE_EN.forEach(([pattern, words]) => {
    if (pattern.test(role)) words.forEach((word) => variants.add(word))
  })
  return [...variants].filter((value) => value.length >= 2)
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

function isRelevant(
  text: string,
  ctx: JobJudgeContext,
  directionKey: string | undefined
): boolean {
  const lower = text.toLowerCase()
  if (ctx.useDirections) {
    const direction = ctx.directions.find((entry) => entry.key === directionKey)
    return direction ? directionRelevant(text, direction) : false
  }
  return roleVariants(ctx.roleCanonical).some((value) => lower.includes(value.toLowerCase()))
}

export type DropReason =
  | ''
  | 'drop_undated'
  | 'drop_too_old'
  | 'drop_landing'
  | 'drop_portal'
  | 'drop_article'
  | 'drop_not_detail'
  | 'drop_unrelated'
  | 'drop_no_evidence'

export interface JobJudgeContext {
  city: string
  roleCanonical: string
  directions: JobDirection[]
  directionKey?: string
  useDirections: boolean
  /** 固定「今天」用于回归用例；生产不传 */
  now?: Date
}

export interface JobVerdict {
  keep: boolean
  reason: DropReason
  /** 三条日期证据里最早的一条；空串表示无日期 */
  date: string
  score: number
  directionKey?: string
}

function jobScore(item: SearchResult, targetCity: string, date: string): number {
  let score = 0
  const time = parseTime(date)
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

/**
 * 一条结果要同时满足「详情页 + 岗位证据 + 相关」才收。
 * 顺序有讲究：先判时效和门户，再判文章 / 详情，最后判相关性。
 */
export function judgeJob(item: SearchResult, ctx: JobJudgeContext): JobVerdict {
  const date = evidenceDate(item)
  const inferred =
    ctx.directionKey ||
    (ctx.directions.length ? inferDirectionKey(`${item.title} ${item.snippet}`, ctx.directions) : undefined)
  const reject = (reason: DropReason): JobVerdict => ({
    keep: false,
    reason,
    date,
    score: 0,
    directionKey: inferred
  })
  if (!date) return reject('drop_undated')
  if (isOlderThanMonths(date, JOB_MAX_AGE_MONTHS, ctx.now ?? new Date())) {
    return reject('drop_too_old')
  }
  if (isCityLanding(item.title)) return reject('drop_landing')
  if (isPortalPage(item.title)) return reject('drop_portal')
  if (looksLikeArticle(item)) return reject('drop_article')
  if (!isDetailPage(item)) return reject('drop_not_detail')

  const text = `${item.title} ${item.snippet}`
  if (!isRelevant(text, ctx, inferred)) return reject('drop_unrelated')

  const evidence = evidenceCount(item)
  if (evidence.strong < 2 && evidence.weak < 3) return reject('drop_no_evidence')

  return {
    keep: true,
    reason: '',
    date,
    score: jobScore(item, ctx.city, date) + (inferred ? 1 : 0),
    directionKey: inferred
  }
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
