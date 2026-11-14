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
import { log } from '../log'
import { clipSentence, isCityLanding, isOldJob, parseTime, searchJobs } from './doc-search'
import { buildModuleSpecs, jobSpec, moduleSpecsForPrompt, outputContract, type ModuleSpec } from './doc-prompts'
import {
  auditNumbers,
  collectAllowedNumbers,
  contentProblems,
  crossModuleIssues,
  findTextIssues,
  repetitionIssues,
  type RepetitionContext
} from './doc-audit'
import { sanitizeDocContent } from './doc-sanitize'

export interface DocAiMeta {
  model: string
  generatedAt: string
  skill: Pick<ReportSkillSource, 'id' | 'name' | 'hash'>
  search: ReportSearchMeta
  audit: { passed: boolean; repaired: boolean; issues?: string[] }
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

interface DocAudit {
  problems: string[]
  consistency: string[]
  repetitions: string[]
  texts: string[]
  numbers: string[]
  all: string[]
}

function auditDocContent(input: {
  content: DocAiContent
  specs: ModuleSpec[]
  repetitionContext: RepetitionContext
  planPeriods: string[]
  allowedNumbers: Set<string>
}): DocAudit {
  const problems = contentProblems(input.content, input.specs)
  const consistency = crossModuleIssues(input.content, input.specs)
  const repetitions = repetitionIssues(input.content, input.repetitionContext)
  const texts = findTextIssues(input.content, input.planPeriods)
  const numbers = auditNumbers(input.content, input.allowedNumbers, input.specs)
  return {
    problems,
    consistency,
    repetitions,
    texts,
    numbers,
    all: [...problems, ...consistency, ...repetitions, ...texts, ...numbers]
  }
}

async function requestJson(
  history: { role: 'system' | 'user' | 'assistant'; content: string }[],
  submissionId: string | undefined,
  stage: string
): Promise<unknown> {
  const context = { submissionId, stage }
  const rawText = await askDeepSeek(history, { context })
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
    return parseJsonObject(
      await askDeepSeek(repair, { context: { ...context, stage: `${stage}_json_repair` } })
    )
  }
}

export async function generateDocContent(input: {
  survey: Survey
  answers: Answers
  name: string
  slug: string
  createdAt: string
  claimed: boolean
  submissionId?: string
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
  const { jobs, search } = await searchJobs(survey, answers, {
    submissionId: input.submissionId
  })
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
  const searchSummary = `本次${search.attempted ? '已执行外部检索' : '没有执行外部检索'}，采用 ${jobs.length} 条原文。`

  const userPrompt = `今天是 ${today}。
学生：${input.name || '同学'}

【问卷回答】
${answerLines}

【代码算好的模块事实 moduleSpecs】
${JSON.stringify(moduleSpecsForPrompt(specs))}

【招聘原文 jobSpecs】
${JSON.stringify(jobSpecs)}

【检索记录】
${searchSummary}

请按 Skill 的要求写整份报告，只输出规定的 JSON 对象。`

  const messages = [
    { role: 'system' as const, content: `${skill.skill}\n\n---\n\n${outputContract()}` },
    { role: 'user' as const, content: userPrompt }
  ]

  let content = normalizeDocAiContent(
    await requestJson(messages, input.submissionId, 'doc.initial')
  )
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

  let auditIssues: string[] = []
  for (let pass = 0; pass < 2; pass += 1) {
    const audit = auditDocContent({
      content,
      specs,
      repetitionContext,
      planPeriods,
      allowedNumbers
    })
    if (audit.all.length === 0) {
      log.info('doc.audit_passed', { submissionId: input.submissionId, reworked: repaired })
      break
    }
    log.warn('doc.audit_failed', {
      submissionId: input.submissionId,
      pass: pass + 1,
      problems: audit.problems.length,
      consistency: audit.consistency.length,
      repetition: audit.repetitions.length,
      text: audit.texts.length,
      number: audit.numbers.length,
      first: audit.all[0]
    })
    // 质量类问题不再判死：重写一次后仍有残余，记录后交给 sanitizeDocContent() 清洗并放行。
    if (pass === 1) {
      auditIssues = audit.all
      break
    }

    const feedback = [
      '你上一次输出的报告有以下问题，需要修正：',
      ...audit.problems.slice(0, 10).map((item) => `- ${item}`),
      ...audit.consistency.slice(0, 6).map((item) => `- ${item}`),
      ...audit.repetitions.slice(0, 6).map((item) => `- ${item}`),
      ...audit.texts.slice(0, 10).map((item) => `- ${item}`),
      ...audit.numbers.slice(0, 10).map((item) => `- ${item}`),
      '请保留已经正确的分析，补全所有缺失模块和字段，并重新输出完整 JSON。',
      '不要新增任何数字；数字只能原样使用系统提供的值。'
    ].join('\n')

    content = normalizeDocAiContent(
      await requestJson(
        [
          ...messages,
          { role: 'assistant' as const, content: JSON.stringify(content).slice(0, 14_000) },
          { role: 'user' as const, content: feedback }
        ],
        input.submissionId,
        `doc.rework_${pass + 1}`
      )
    )
    repaired = true
  }

  // 失败下限：AI 没给出可解析的正文时仍失败；模板兜底是明确禁止的。
  if (content.modules.length === 0 && content.sections.length === 0) {
    throw new Error('AI 报告没有可用的正文')
  }
  if (auditIssues.length > 0) {
    log.warn('doc.audit_waived', {
      submissionId: input.submissionId,
      issues: auditIssues.length,
      first: auditIssues[0]
    })
  }

  return {
    content: sanitizeDocContent(content, specs),
    jobs,
    search,
    meta: {
      model: config.deepseekModel,
      generatedAt: now(),
      skill: { id: skill.id, name: skill.name, hash: skill.hash },
      search,
      audit: { passed: auditIssues.length === 0, repaired, issues: auditIssues.slice(0, 20) }
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
