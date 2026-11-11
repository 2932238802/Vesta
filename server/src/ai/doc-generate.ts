import type { Answers, JobCard, Survey } from '../../../shared/src/types'
import {
  deadlineFact,
  docFacts,
  normalizeDocAiContent,
  serializeDoc,
  type DocAiContent
} from '../../../shared/src/doc'
import { defaultReportSkill } from '../../../shared/src/ai'
import { computeDocScores } from '../../../shared/src/docScore'
import { inferDirectionKey, jobDirections } from '../../../shared/src/job-map'
import { config } from '../env'
import { getReportSkill, now } from '../db'
import { askDeepSeek, parseJsonObject } from './deepseek'
import { searchWeb, type SearchResult } from './bocha'

export interface DocAiMeta {
  model: string
  generatedAt: string
}

const DOC_SKILL = `# 大学四年规划报告

你是一名面向中国大学生的规划顾问，说话直接、克制，不贩卖焦虑，也不做硬推销。

## 你会收到
1. 一份问卷回答（题目编号 Q1—Q26）。
2. 系统算好的数字：五因素得分、个人四维得分、潜力档位、目标差距、英语位置、关键节点与时间。

## 只输出 JSON
{
  "conclusion": "一句话结论，把表面问题和真实卡点分开说，必须提到一个具体数字或事实",
  "sections": [
    { "title": "你现在卡在哪一层", "text": "..." },
    { "title": "什么时候要命", "text": "..." },
    { "title": "五年后的你", "text": "..." },
    { "title": "接下来 30 天", "text": "..." },
    { "title": "给你一句实话", "text": "..." }
  ]
}

## 五个小标题的写法（顺序固定，不能改）
1. 你现在卡在哪一层：从回答里挑一个最具体的卡点（词汇 / 听力 / 开口 / 方法 / 时间），说清它在考试或面试里长什么样。
2. 什么时候要命：用系统给的关键节点、剩余月份和投入总量，写清错过会怎样。数字直接用系统给的，不要自己改。
3. 五年后的你：引用 TA 写的原话，加上想去的城市和想做的事，写一段 TA 能认出来的画面，不写鸡汤。
4. 接下来 30 天：给 3 个能在 30 天内开始的具体动作，每条带时间点或完成标准。
5. 给你一句实话：一句克制、具体的提醒，不威胁、不安慰。

## 五段的分工与英语的分量
- 「你现在卡在哪一层」写最具体的那个卡点，可以是英语，也可以不是；如果卡点是英语，这一段里说透，其他段就不要再展开英语。
- 英语整体最多占全文三分之一，别通篇讲英语：其余四段各最多带一句英语，不能再多。
- 不要主动把英语当成唯一问题；先看 TA 真正的卡点（实习、方向、信息差、执行力、家庭条件都可能更致命）。
- 英语判断以系统给的「英语位置」为准：学生正在准备四级/六级，或目标路径（升本、考研、保研、考编、出国）对英语有要求时，英语就是真实差距，必须写清楚卡在哪、下一步怎么补。
- 不得写「这条路对英语没有硬性门槛」「保持阅读和表达就够了」「英语不是重点」这类绝对判断。路径暂时看不出英语要求时，也只能写「以目标院校或单位最新公告为准」，不能替目标下结论。
- 需要建议补英语时，可以中性地说「系统学习」「成体系地补」「找人带着练」「按一套完整计划走」；如果学生自己提到学校课没用、没人纠正、不知道怎么练，可以说明系统课程或有人带的训练能补上路径、反馈和阶段测评。只写能补什么，不点名机构，不承诺提分或过级，也不把上课写成唯一解。

## 硬性要求
- 正文 800—1200 字，纯文本，不要 Markdown 标题或列表符号。
- 不得出现「报班」「报课」「学费」「名额」「不学就来不及」「不过级就没戏」这类硬广或施压字样；也不得写「不必依赖付费课程」「不用报班」这类主动否定。
- 年级必须和系统给的关键节点一致：大一学生的秋招/夏令营在两年以后，不能说成「还有五六个月」或者「马上大三」。
- 不编造分数线、薪资、政策；需要事实时写「以官方最新公告为准」。
- 分数、档位、剩余月份、投入小时数都由系统给出，报告页会单独展示；正文里引用即可，不要重新计算，也不要写出与系统数字冲突的数字。
- 专业分数偏低时，不要用「天坑」「野鸡」「垃圾专业」这类词评价专业，也不要替专业下「读了没用」的结论；只写对口岗位密度、岗位要求和可替代方向。
- 不要复述题目，不要写「你很棒」这类空话。
- conclusion 一句话，sections 必须正好 5 条，每条 title 用上面固定标题。`

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

const REVIEW_SKILL = `你是报告审校员，只做校对，不重写立场。

## 你要检查的低级问题
1. 空标签留下的痕迹：像「卡住你的是、，」「、，」「的是，」这种中间没有内容、只有标点的句子。
2. 未替换的占位符或变量：{{ }}、{name}、undefined、null、NaN、XX、某同学、示例。
3. 重复或连用标点：「，，」「。。」「、，」「；；」，以及段落开头结尾多余的顿号逗号。
4. 语病和半截话：缺主语的句子、重复词（「你想你想」）、句子被截断。
5. 和系统数字冲突：分数、剩余月份、每周小时数与给定数字不一致。
6. 禁用词：报班、报课、学费、名额、不学就来不及、不过级就没戏；以及「不必依赖付费课程」「不用报班」这类主动否定。
7. 没有依据的判断：凭空出现的分数线、薪资、院校要求（应写「以官方最新公告为准」）。
8. 英语弱化判断：出现「这条路对英语没有硬性门槛」「保持阅读和表达就够了」「英语不是重点」等没有数据支撑的弱化表述。

## 输出（只输出 JSON）
{
  "issues": ["发现的问题，没有就空数组"],
  "conclusion": "修正后的一句话结论",
  "sections": [ { "title": "原标题", "text": "修正后的正文" } ]
}

## 要求
- 五个小标题和顺序必须保持原样，不能增删。
- 只改有问题的地方；没问题的句子原样保留，不要润色成另一种风格。
- 不要新增事实，不要编造数字；拿不准的删掉或改成「以官方最新公告为准」。
- 如果年级和关键节点对不上（例如大一被写成「还有五六个月就要秋招」「马上大三」），按系统给的剩余月份改正。
- 如果英语内容超过全文三分之一，或五段里有三段都在讲英语，压缩英语，把篇幅还给实习、方向、信息差、执行力这些真正的卡点。
- 不要输出 Markdown。`

/** 先用规则挑一遍明显的低级问题，避免把坏文本直接交给审校。 */
function findTextIssues(content: DocAiContent): string[] {
  const issues: string[] = []
  const texts = [
    content.conclusion,
    ...content.sections.map((section) => `${section.title}｜${section.text}`)
  ]
  for (const text of texts) {
    if (!text.trim()) {
      issues.push('存在空段落')
      continue
    }
    if (/(\{\{|\}\}|\{name\}|undefined|null|NaN|XX|示例)/.test(text)) {
      issues.push(`出现未替换的占位内容：${text.slice(0, 40)}`)
    }
    if (/([、，。；：,;:])\1/.test(text) || /[、，]\s*[，、]/.test(text)) {
      issues.push(`标点重复或连用：${text.slice(0, 40)}`)
    }
    if (/的是[、，]/.test(text)) {
      issues.push(`「的是」后面缺内容：${text.slice(0, 40)}`)
    }
    if (/(报班|报课|学费|名额|不学就来不及|不过级就没戏|不必依赖付费课程|不用报班)/.test(text)) {
      issues.push(`出现禁用词：${text.slice(0, 40)}`)
    }
    if (/没有硬性门槛|保持阅读和表达就够了|英语不是(重点|主线)/.test(text)) {
      issues.push(`出现英语弱化判断：${text.slice(0, 40)}`)
    }
    if (/(天坑|野鸡|垃圾专业|最差专业)/.test(text)) {
      issues.push(`出现贬低专业的说法：${text.slice(0, 40)}`)
    }
  }
  return issues
}

function sameTitles(a: DocAiContent, b: DocAiContent): boolean {
  if (a.sections.length !== b.sections.length) return false
  return a.sections.every((section, index) => section.title === b.sections[index]?.title)
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

const MAJOR_CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '苏州',
  '重庆', '天津', '长沙', '郑州', '青岛', '厦门', '合肥', '宁波', '东莞', '佛山',
  '无锡', '济南', '福州', '大连', '沈阳', '昆明', '南昌', '贵阳', '南宁', '石家庄',
  '太原', '长春', '哈尔滨', '兰州', '乌鲁木齐', '呼和浩特', '海口', '银川', '西宁', '拉萨'
]

const DAY_MS = 24 * 60 * 60 * 1000
// 招聘信息超过约 18 个月基本失去参考价值。旧数据仍会保留链接，但卡片上会标日期。
const JOB_MAX_AGE_MS = 18 * 30 * DAY_MS

function parseTime(value?: string): number {
  if (!value) return 0
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

function isOldJob(date?: string): boolean {
  const time = parseTime(date)
  return time > 0 && Date.now() - time > JOB_MAX_AGE_MS
}

function cityInText(value: string): string {
  return MAJOR_CITIES.find((city) => value.includes(city)) ?? ''
}

/** 摘要截断时尽量停在句号，避免出现「具有良好品质,无」这种半句话。 */
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

/** 博查有 QPS 限制，串行跑并留间隔，避免一份报告把配额瞬间打满。 */
async function runSearches(specs: { query: string }[]): Promise<SearchResult[][]> {
  const results: SearchResult[][] = []
  for (let index = 0; index < specs.length; index += 1) {
    if (index > 0) await sleep(500)
    try {
      results.push(await searchOne(specs[index].query))
    } catch (error) {
      console.warn('[doc-report] 招聘检索失败', specs[index].query, error)
      results.push([])
    }
  }
  return results
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
    // 「1-3 年经验」「3-6 个月」是年限，不是薪资。
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

/** 猎聘等站点的「上海」城市落地页只有地名，没有具体岗位；薪资统计页仍保留。 */
function isCityLanding(title: string, url: string): boolean {
  const clean = title.replace(/\s+/g, '')
  if (MAJOR_CITIES.includes(clean)) return true
  return /\/city-[a-z]+\//i.test(url) && !/招聘|岗位|职位|薪资/.test(title)
}

function jobSiteOf(url: string): string {
  if (/zhipin\.com/.test(url)) return 'BOSS直聘'
  if (/zhaopin\.com/.test(url)) return '智联招聘'
  if (/51job\.com/.test(url)) return '前程无忧'
  if (/liepin\.com/.test(url)) return '猎聘'
  if (/yingjiesheng\.com/.test(url)) return '应届生求职网'
  if (/jrzp\.com/.test(url)) return '今日招聘'
  return ''
}

/** 具体岗位详情页；列表页、搜索页、公司职位页不能当单条岗位。 */
function isJobDetail(url: string): boolean {
  return /job_detail|\/jobdetail\/|\/jobdetail$|jobs\.zhaopin\.com\/CC|zhaopin\.com\/CC|\/job\/\d|\/jobs\/\d|\/job\/[a-z0-9-]+\.s?html|jrzp\.com\/job|51job\.com\/job|we\.51job\.com\/pc\/job-detail/i.test(
    url
  )
}

function isListingPage(url: string): boolean {
  if (isJobDetail(url)) return false
  return /\/zhaopin\/|\/gongsi\/job\/|\/city-[a-z]+\/|\/c\d+-p\d+\/|\/sou\/|\/zp\w*\/|\/web\/geek\/job|jobs\.zhaopin\.com\/.*\/$|liepin\.com\/[a-z]+\/zp|yingjiesheng\.com\/.*joblist|\/joblist\//i.test(
    url
  )
}

/** 招聘门户、人才网、就业网的总入口页，以及公考/考研培训站，不是具体岗位。 */
function isPortalPage(title: string, url: string): boolean {
  if (/offcn\.com|huatu\.com|zhaokao\.net/.test(url)) return true
  if (/\.edu\.cn/.test(url) && !/有限公司|集团|银行|事务所|研究院/.test(title)) return true
  if (jobSiteOf(url)) return false
  if (/有限公司|集团|银行|事务所|学校|医院|研究院/.test(title)) return false
  return /(中国公共招聘网|人才网|招聘网|人社局|就业网|就业信息网|就业指导中心|招聘信息网)/.test(
    title
  )
}

function jobScore(item: SearchResult, targetCity: string): number {
  let score = 0
  const time = parseTime(item.publishedAt)
  if (time > 0) {
    const age = Date.now() - time
    if (age > JOB_MAX_AGE_MS) score -= 4
    else if (age <= 90 * DAY_MS) score += 4
    else if (age <= 365 * DAY_MS) score += 3
    else score += 1
  }

  const text = `${item.title} ${item.snippet}`
  if (jobSiteOf(item.url)) score += 3
  if (isJobDetail(item.url)) score += 3
  if (/招聘|岗位|职位|应届生|校招/.test(item.title)) score += 2
  if (/薪资|月薪|年薪|待遇/.test(text)) score += 1
  const foundCity = cityInText(text)
  if (targetCity && foundCity && targetCity.includes(foundCity)) score += 2
  return score
}

/** 标题里常带「...招聘」和站点后缀，卡片上只留岗位名。 */
function cleanJobTitle(title: string): string {
  const raw = title.replace(/\s+/g, ' ').trim()
  const quoted = /[「【]([^」】]+?)(?:招聘|招聘中)[」】]/.exec(raw)?.[1]
  if (quoted) return quoted.trim().slice(0, 60)
  // 应届生求职网：岗位名招聘_公司名招聘信息-站点
  const beforeUnderscore = /^(.+?)招聘_/.exec(raw)?.[1]
  if (beforeUnderscore) return beforeUnderscore.trim().slice(0, 60)
  return raw
    .replace(/[-_](BOSS直聘|智联招聘|猎聘|前程无忧|应届生求职网|58同城).*$/, '')
    .trim()
    .slice(0, 60)
}

/** 应届生求职网的链接里带着岗位标题、薪资和公司名，摘要没写时可以补上。 */
function urlJobMeta(url: string): { salary?: string; company?: string } {
  const match = /[?&]property=([^&]+)/.exec(url)
  if (!match) return {}
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Record<string, unknown>
    return {
      salary: typeof parsed.monthSalary === 'string' ? parsed.monthSalary : undefined,
      company: typeof parsed.companyName === 'string' ? parsed.companyName : undefined
    }
  } catch {
    return {}
  }
}

/** 同一岗位可能有 m/q 两个域名，按 jobdetail 编号去重。 */
function dedupeKey(url: string): string {
  const detail = /jobdetail\/(\d+)|jobid=(\d+)/.exec(url)
  if (detail) return `job-${detail[1] || detail[2]}`
  return url.replace(/\/$/, '')
}

/** 从站点标题/摘要里找公司名；找不到就用来源站名，不编造。 */
function companyOf(item: SearchResult, fromUrl = ''): string {
  // 猎聘的搜索标题是「岗位_2026城市岗位招聘信息」，里面没有公司名。
  if (/liepin\.com/.test(item.url)) return '猎聘'
  const title = item.title.replace(/\s+/g, '')
  const after = /_([^_「」]{2,80}?)招聘(?:信息|[-_]|$)/.exec(title)?.[1]
  if (after) return after.replace(/^\d{4}年/, '').trim()
  const inTitle =
    /(?:招聘|职位)[-_]([^\-_]{2,40}?(?:有限公司|集团|银行|事务所|中心))/.exec(title)?.[1]
  if (inTitle) return inTitle
  if (fromUrl) return fromUrl
  const inSnippet =
    /([一-龥A-Za-z0-9（）()]{2,30}?(?:股份有限公司|有限公司|集团|银行|事务所|科技公司|信息技术公司))/.exec(
      item.snippet
    )?.[1]
  if (inSnippet) return inSnippet
  return jobSiteOf(item.url) || item.site || '招聘页面'
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
    // BOSS/智联摘要常先列福利：五险一金、年终奖、团建、双休……
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


/** 方向检索会带回跑偏的岗位（例如搜「单证」返回财务岗），至少要和方向词沾边。 */
function directionRelevant(text: string, direction: { query: string; keywords: string[] }): boolean {
  const lower = text.toLowerCase()
  if (direction.keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) return true
  return direction.query
    .split(/\s+/)
    .filter(Boolean)
    .some((token) => lower.includes(token.toLowerCase()))
}

/** 用博查抓真实招聘原文，做成可点开的卡片；失败不影响报告。 */
export async function searchJobs(survey: Survey, answers: Answers): Promise<JobCard[]> {
  if (!config.bochaApiKey) return []
  const city = cityOf(survey, answers)
  const explicitRole = String(answers.q5a ?? '').trim()
  const major = String(answers.q2 ?? '').trim()
  // 学生没写具体岗位时，用专业方向去搜；不要把「专业+相关岗位」当岗位名。
  const role = explicitRole || major
  if (!role) return []

  const directions = jobDirections(major)
  const useDirections = directions.length > 0 && !explicitRole
  const place = city ? `${city} ` : ''
  const siteQuery = (site: string, keyword: string) =>
    `site:${site} ${place}${keyword} 应届 招聘`.trim()

  type QuerySpec = { key?: string; query: string }
  const specs: QuerySpec[] = []
  // 应届生求职网的岗位是校招/实习原文，字段比综合搜索完整，优先用它。
  // BOSS/智联/猎聘的网页索引更新慢，只在不够 3 条时补位。
  const freshQuery = (site: string, keyword: string) =>
    `site:${site} ${place}${keyword} 2026 应届`.trim()
  if (useDirections) {
    directions.forEach((direction) => {
      specs.push({ key: direction.key, query: freshQuery('yingjiesheng.com', direction.query) })
    })
  } else {
    specs.push({ query: freshQuery('yingjiesheng.com', role) })
    specs.push({ query: siteQuery('liepin.com', role) })
  }

  const byUrl = new Map<string, { item: SearchResult; directionKey?: string }>()
  const collect = (results: SearchResult[][], list: QuerySpec[]): void => {
    results.forEach((items, index) => {
      for (const item of items) {
        const key = dedupeKey(item.url)
        const existing = byUrl.get(key)
        // 同一链接被方向检索和专业总览同时抓到，优先保留带方向的。
        if (!existing) {
          byUrl.set(key, { item, directionKey: list[index]?.key })
        } else if (!existing.directionKey && list[index]?.key) {
          byUrl.set(key, { item, directionKey: list[index].key })
        }
      }
    })
  }

  const buildRanked = (): {
    item: SearchResult
    score: number
    weak: boolean
    directionKey?: string
  }[] => {
    const seenTitles = new Set<string>()
    const ranked: {
      item: SearchResult
      score: number
      weak: boolean
      directionKey?: string
    }[] = []
    for (const { item, directionKey } of byUrl.values()) {
      const titleKey = `${item.title.replace(/\s+/g, '')}|${item.site}`
      if (seenTitles.has(titleKey)) continue
      seenTitles.add(titleKey)
      if (isCityLanding(item.title, item.url)) continue
      // 门户入口、列表页、搜索页不是某条具体岗位，直接丢掉。
      if (isPortalPage(item.title, item.url) || isListingPage(item.url)) continue
      const text = `${item.title} ${item.snippet}`
      const article =
        looksLikeArticle(text) || /edu\.jobui\.com\/major|jobui\.com\/salary/.test(item.url)
      const inferred = directionKey || inferDirectionKey(text, directions)
      if (useDirections && inferred) {
        const direction = directions.find((item) => item.key === inferred)
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

  let results = await runSearches(specs)
  collect(results, specs)
  let ranked = buildRanked()
  let usable = ranked
    .filter((entry) => !entry.weak && !isOldJob(entry.item.publishedAt))
    .sort((a, b) => b.score - a.score)

  const missingDirections = useDirections
    ? directions.filter(
        (direction) => !usable.some((entry) => entry.directionKey === direction.key)
      )
    : []

  // 校招站没搜到足够的新岗位、或某个方向完全没有原文时，再用猎聘/BOSS补位。
  if (usable.length < 3 || missingDirections.length > 0) {
    const supplementSpecs: QuerySpec[] = missingDirections.slice(0, 2).map((direction) => ({
      key: direction.key,
      query: freshQuery('liepin.com', direction.query)
    }))
    if (usable.length < 3) {
      supplementSpecs.push({ query: siteQuery('liepin.com', role) })
      supplementSpecs.push({ query: siteQuery('zhipin.com', role) })
    }
    results = await runSearches(supplementSpecs)
    collect(results, supplementSpecs)
    ranked = buildRanked()
    usable = ranked
      .filter((entry) => !entry.weak && !isOldJob(entry.item.publishedAt))
      .sort((a, b) => b.score - a.score)
  }

  // 还没有任何可用原文时，才退回普通网页检索；只接受像具体招聘的结果。
  if (ranked.length === 0) {
    const fallbackSpecs: QuerySpec[] = [
      { query: `${place}${role} 2026 校园招聘`.trim() }
    ]
    results = await runSearches(fallbackSpecs)
    collect(results, fallbackSpecs)
    ranked = buildRanked()
    usable = ranked
      .filter((entry) => !entry.weak && !isOldJob(entry.item.publishedAt))
      .sort((a, b) => b.score - a.score)
  }

  // 优先取「像具体招聘且不太旧」的结果；不够 3 条时，再把其余可核对原文的链接补上，
  // 保证分析观点有来源，同时卡片会显示发布日期并标注信息较早。
  const picked = [...usable]
  if (useDirections) {
    // 每个方向最多两条，确保岗位地图里每个方向都有原文；剩下的给专业总览。
    const perDirection: typeof usable = []
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
  return picked.slice(0, 10).map(({ item, directionKey }) => {
    const meta = urlJobMeta(item.url)
    return {
      title: cleanJobTitle(item.title),
      company: companyOf(item, meta.company),
      city: cityInText(`${item.title} ${item.snippet}`),
      salary:
        (meta.salary ? salaryOf(meta.salary) : '') ||
        salaryOf(item.snippet) ||
        '薪资以原文为准',
      requirement: requirementOf(item),
      url: item.url,
      date: item.publishedAt,
      directionKey
    }
  })
}

export async function generateDocContent(input: {
  survey: Survey
  answers: Answers
  name: string
}): Promise<{ content: DocAiContent; meta: DocAiMeta; jobs: JobCard[] }> {
  const { survey, answers, name } = input
  const facts = docFacts(survey, answers)
  const scores = computeDocScores(survey, answers)
  const node = deadlineFact(survey, answers)
  const scoreText = [...scores.background, ...scores.personal]
    .map((item) => `${item.label}：${item.score} 分`)
    .join('\n')
  const weekly = scores.english.weeklyHours
  const english = scores.english
  const englishPosition = english.pathNeeds
    ? '目标路径对英语有明确要求'
    : english.preparing
      ? '目标路径暂时看不出硬性要求，但学生本人正在准备四级/六级，英语仍算触发'
      : '按当前选择暂时看不出硬性英语门槛，不得替目标下结论，只能写「以官方最新公告为准」'

  const userPrompt = `学生：${name || '同学'}

【问卷回答】
${answerText(survey, answers)}

【系统算好的分数】（报告页会原样展示，正文引用即可，不要改数）
${scoreText}
可提升空间：${scores.potential.label}（${scores.potential.text}）
【英语位置】${english.stage || '还没填'}；${englishPosition}
每周英语投入：约 ${weekly} 小时（这是「一周」的总时长，不是每天）

【系统事实】
建议卡点：${facts.stuck}（${facts.stuckDetail}）
建议结论：${facts.oneLine}
关键节点：${node.node}，${node.windowText}，还剩约 ${node.months} 个月
五年后的画面要点：${facts.future}

请按 Skill 要求写报告，只输出 JSON 对象。`

  // 管理后台「AI 分析规则」如果被改过，就把自定义规则一起作为补充口径。
  const customSkill = getReportSkill().trim()
  const skill =
    customSkill && customSkill !== defaultReportSkill
      ? `${DOC_SKILL}\n\n---\n\n## 顾问补充规则（优先遵循）\n${customSkill}`
      : DOC_SKILL

  const messages = [
    { role: 'system' as const, content: skill },
    { role: 'user' as const, content: userPrompt }
  ]

  // 招聘信息检索和写作并行，检索失败只是少一块卡片，不影响报告。
  const [contentResult, jobs] = await Promise.all([
    (async () => {
      let text = normalizeDocAiContent(parseJsonObject(await askDeepSeek(messages)))
      if (!text.conclusion || text.sections.length < 5) {
        const repair = [
          ...messages,
          { role: 'assistant' as const, content: JSON.stringify(text).slice(0, 12_000) },
          {
            role: 'user' as const,
            content:
              '上面的 JSON 不完整。请补齐 conclusion，并确保 sections 正好 5 条、每条都有 title 和 text，只输出合法 JSON。'
          }
        ]
        text = normalizeDocAiContent(parseJsonObject(await askDeepSeek(repair)))
      }
      return text
    })(),
    searchJobs(survey, answers).catch((error) => {
      console.warn('[doc-report] 招聘检索失败', error)
      return [] as JobCard[]
    })
  ])

  let content = contentResult

  if (!content.conclusion || content.sections.length < 3) {
    throw new Error('AI 报告内容不完整')
  }

  // 第二次 AI：审校。只做校对和修补，标题与顺序保持不变。
  const reviewMessages = [
    { role: 'system' as const, content: REVIEW_SKILL },
    {
      role: 'user' as const,
      content: `【学生回答】
${answerText(survey, answers)}

【系统算好的数字】（不能改）
${scoreText}
可提升空间：${scores.potential.label}
关键节点：${node.node}，还剩约 ${node.months} 个月

【待审报告】
${JSON.stringify(content, null, 2)}

请按审校要求检查并输出 JSON。`
    }
  ]

  try {
    const reviewed = normalizeDocAiContent(parseJsonObject(await askDeepSeek(reviewMessages)))
    if (
      reviewed.conclusion &&
      reviewed.sections.length === content.sections.length &&
      sameTitles(content, reviewed)
    ) {
      content = reviewed
    }
  } catch (error) {
    // 审校失败不影响主报告，下面还有一轮确定性检查。
    console.warn('[doc-report] 审校未完成，继续用初稿', error)
  }

  const issues = findTextIssues(content)
  const blocking = issues.filter(
    (issue) =>
      issue.startsWith('出现未替换') ||
      issue.startsWith('存在空段落') ||
      issue.startsWith('出现禁用词') ||
      issue.startsWith('出现英语弱化判断') ||
      issue.startsWith('出现贬低专业')
  )
  if (blocking.length > 0) {
    throw new Error(`AI 报告审校未通过：${blocking[0]}`)
  }
  if (issues.length > 0) {
    console.warn('[doc-report] 审校遗留小问题', issues)
  }

  return {
    content,
    jobs,
    meta: { model: config.deepseekModel, generatedAt: now() }
  }
}

export interface StoredDocReport {
  content: DocAiContent
  jobs: JobCard[]
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

export function readDocContent(raw: string | null): StoredDocReport | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const record = parsed as { doc?: unknown; content?: unknown; jobs?: unknown }
    if (record.doc !== true) return null
    const content = normalizeDocAiContent(record.content)
    if (!content.conclusion && content.sections.length === 0) return null
    const rawJobs = Array.isArray(record.jobs) ? record.jobs : []
    const jobs: JobCard[] = []
    for (const item of rawJobs) {
      if (!item || typeof item !== 'object') continue
      const job = item as Record<string, unknown>
      if (typeof job.url !== 'string' || !/^https?:\/\//i.test(job.url)) continue
      const title = String(job.title ?? '招聘信息').trim() || '招聘信息'
      // 城市落地页不是具体招聘/薪资资料，留着会误导。
      if (isCityLanding(title, job.url)) continue
      jobs.push({
        title,
        company: String(job.company ?? '').trim(),
        city: String(job.city ?? '').trim(),
        salary: cleanStoredSalary(String(job.salary ?? '')),
        requirement: cleanStoredRequirement(String(job.requirement ?? '')),
        url: job.url,
        date: typeof job.date === 'string' ? job.date : undefined,
        directionKey:
          typeof job.directionKey === 'string' ? job.directionKey : undefined
      })
    }
    jobs.sort((a, b) => parseTime(b.date) - parseTime(a.date))
    return { content, jobs }
  } catch {
    return null
  }
}
