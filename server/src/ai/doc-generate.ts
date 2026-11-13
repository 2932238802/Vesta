import type {
  Answers,
  JobCard,
  ReportSearchMeta,
  ReportSearchSource,
  Survey
} from '../../../shared/src/types'
import {
  buildDocReport,
  deadlineFact,
  normalizeDocAiContent,
  resolveTargetCity,
  serializeDoc,
  type DocAiContent,
  type DocReportInput
} from '../../../shared/src/doc'
import { computeDocScores } from '../../../shared/src/docScore'
import { formatCalendarDate } from '../../../shared/src/date'
import { config } from '../env'
import { getDocReportSkill, now, type ReportSkillSource } from '../db'
import { askDeepSeek, parseJsonObject } from './deepseek'
import { clipSentence, isCityLanding, isOldJob, parseTime, searchJobs } from './doc-search'
import { buildModuleSpecs, jobSpec, moduleSpecsForPrompt, outputContract } from './doc-prompts'
import {
  auditNumbers,
  collectAllowedNumbers,
  contentProblems,
  crossModuleIssues,
  findTextIssues,
  repetitionIssues,
  type RepetitionContext
} from './doc-audit'

export interface DocAiMeta {
  model: string
  generatedAt: string
  skill: Pick<ReportSkillSource, 'id' | 'name' | 'hash'>
  search: ReportSearchMeta
  audit: { passed: true; repaired: boolean }
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
    city: resolveTargetCity(survey, answers).city,
    englishWeeklyHours: scores.english.weeklyHours
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
    sources,
    searchYear: Number(record.searchYear ?? record.cohortYear) || undefined
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

// 保持原有 import 路径可用：以下符号已拆到独立文件。
export { searchJobs } from './doc-search'
export { findTextIssues, repetitionIssues } from './doc-audit'
