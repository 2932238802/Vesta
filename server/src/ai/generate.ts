import type {
  Answers,
  ReportBlock,
  ReportOverrides,
  ScoreResult,
  Survey
} from '../../../shared/src/types'
import { buildReport, answerLabel } from '../../../shared/src/report'
import { computeScores, tierRuleOf } from '../../../shared/src/scoring'
import {
  findBannedPhrase,
  mergeAiContent,
  normalizeAiContent,
  type AiReportContent
} from '../../../shared/src/ai'
import { config } from '../env'
import {
  db,
  getActiveSurvey,
  getReportSkill,
  getSurvey,
  getTemplate,
  now,
  recordEvent
} from '../db'
import { parseJson } from '../util'
import { searchWeb, type SearchResult } from './bocha'
import { askDeepSeek, parseJsonObject } from './deepseek'
import { generateDocContent } from './doc-generate'

export interface AiMeta {
  model: string
  searchQueries: string[]
  searchUsed: boolean
  searchError: string
  resultCount: number
  sourceCount: number
  generatedAt: string
}

interface SubmissionRow {
  id: string
  slug: string
  invite_id: string
  survey_id: string
  answers: string
  scores: string
  overrides: string
  claimed_at: string | null
  created_at: string
  ai_status: string
  ai_error: string
  ai_attempts: number
  ai_started_at: string | null
}

type StrengthsBlock = Extract<ReportBlock, { type: 'strengths' }>
type GapsBlock = Extract<ReportBlock, { type: 'gaps' }>

const running = new Set<string>()
const retryTimers = new Map<string, NodeJS.Timeout>()
const MAX_AI_ATTEMPTS = 4
const RETRY_DELAYS_MS = [5_000, 15_000, 30_000]

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export function isAiConfigured(): boolean {
  return Boolean(config.deepseekApiKey && config.deepseekBaseUrl)
}

export function isSearchConfigured(): boolean {
  return Boolean(config.bochaApiKey && config.bochaBaseUrl)
}

function getSubmission(id: string): SubmissionRow | undefined {
  return db.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as
    | SubmissionRow
    | undefined
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError') return 'AI 请求超时'
    if (error.name === 'AbortError') return 'AI 请求超时'
    return error.message.replace(/\s+/g, ' ').trim().slice(0, 500)
  }
  return 'AI 生成失败'
}

export function isRetryableError(message: string): boolean {
  // 审校、数字核对、模块完整性都是模型单次输出的问题，再生成一次有机会修好；
  // 只有配置缺失/规则为空这类问题重试也没用。
  if (/未配置|分析规则为空|分析规则不存在|没有可用的正文/.test(message)) {
    return false
  }
  return !/DeepSeek 请求失败（(400|401|402|403|404|422)/.test(message)
}

function contentProblems(
  content: AiReportContent,
  input: {
    strengthKeys: string[]
    gapKeys: string[]
    requiresConsistency: boolean
  }
): string[] {
  const problems: string[] = []
  if (!content.hero.summary) problems.push('hero.summary 一句话诊断')
  if (!content.target.cityNote) problems.push('target.cityNote 城市与岗位分析')
  if (!content.target.salaryNote) problems.push('target.salaryNote 薪资对照')
  if (!content.target.closing) problems.push('target.closing 下一步核实事项')
  for (const key of input.strengthKeys) {
    if (!content.strengths.some((item) => item.key === key)) {
      problems.push(`strengths 缺少维度 ${key}`)
    }
  }
  for (const key of input.gapKeys) {
    if (!content.gaps.some((item) => item.key === key)) {
      problems.push(`gaps 缺少维度 ${key}`)
    }
  }
  if (input.requiresConsistency && !content.consistency?.paragraphs.length) {
    problems.push('consistency 自评与行为对照')
  }
  if (content.cognition.paragraphs.length < 2) {
    problems.push('cognition.paragraphs 至少需要两段')
  }
  if (content.actions.items.length < 3) {
    problems.push('actions.items 至少需要三条')
  }
  if (!content.actions.closing) problems.push('actions.closing 收尾')
  return problems
}

function textFields(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim())
}

function cleanGoal(survey: Survey, value: unknown): { choice: string; note: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { choice: '', note: '' }
  }
  const record = value as { choice?: unknown; note?: unknown; other?: unknown }
  const picked = typeof record.choice === 'string' ? record.choice : ''
  const note = typeof record.note === 'string' ? record.note.trim() : ''
  const other = typeof record.other === 'string' ? record.other.trim() : ''
  const label =
    survey.questions
      .find((question) => question.id === 'a10')
      ?.options?.find((option) => option.id === picked)?.label ?? ''
  return { choice: other ? `${label}：${other}` : label, note }
}

function buildSearchQueries(input: {
  city: string
  role: string
  major: string
  priority: string
  goal: string
}): string[] {
  const queries: string[] = []
  const add = (value: string) => {
    const clean = value.replace(/\s+/g, ' ').trim()
    if (clean && !queries.includes(clean)) queries.push(clean)
  }

  if (input.city && input.role) add(`${input.city} ${input.role} 招聘 要求 薪资`)
  else if (input.major) add(`${input.major} 就业 方向 薪资`)

  const priority = input.priority
  const city = input.city
  if (priority.includes('考研')) add('考研 报名时间 报考条件 考试科目 最新')
  else if (priority.includes('保研')) add('推免 保研 申请条件 时间 最新')
  else if (priority.includes('专升本')) add('专升本 报考条件 考试时间 最新')
  else if (priority.includes('公务员')) add('国家公务员考试 报名时间 报考条件 最新')
  else if (priority.includes('事业单位')) {
    add(`${city} 事业单位 教师招聘 报考条件 时间`.trim())
  } else if (priority.includes('直接就业')) {
    add(`${city} 应届生 招聘 要求 最新`.trim())
  }

  const goal = input.goal
  if (
    goal.includes('英语') ||
    goal.includes('四六级') ||
    goal.includes('四级') ||
    goal.includes('六级') ||
    goal.includes('雅思')
  ) {
    add('大学英语四六级 雅思 考试时间 报名条件 最新')
  }
  else if (goal.includes('转专业')) add('大学 转专业 申请条件 时间')
  else if (goal.includes('作品') || goal.includes('竞赛')) {
    add(`${input.major} 大学生 竞赛 报名 时间`.trim())
  } else if (goal.includes('实习') || goal.includes('求职')) {
    add(`${city} ${input.role || input.major} 实习 招聘 要求`.trim())
  }

  if (queries.length < 3 && input.city) {
    add(`${input.city} 应届生 就业 政策 补贴`.trim())
  }
  return queries.slice(0, 3)
}

function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  const out: SearchResult[] = []
  for (const result of results) {
    const key = result.url.replace(/\/$/, '')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(result)
    if (out.length >= 8) break
  }
  return out
}

function formatSearchResults(results: SearchResult[]): string {
  if (!results.length) return '（本次没有可用的检索结果）'
  return results
    .map(
      (result, index) =>
        `[${index + 1}] ${result.title}\nURL: ${result.url}\n站点: ${result.site || '未知'} 时间: ${result.publishedAt || '未知'}\n摘要: ${result.snippet || '无'}`
    )
    .join('\n\n')
}

const OUTPUT_CONTRACT = `## 输出结构（必须遵守）

只输出一个 JSON 对象，不要 Markdown 代码块，不要任何解释。字段必须齐全：

{
  "hero": { "summary": "一句话诊断，1—2 句", "tierLine": "档位说明，1 句" },
  "target": { "cityNote": "城市、岗位与去的原因的分析", "salaryNote": "薪资期待与现实条件的对照", "closing": "一句下一步要核实的事" },
  "strengths": [{ "key": "维度key", "text": "这个优势如何支撑目标" }],
  "gaps": [{ "key": "维度key", "what": "补什么", "how": "怎么补", "when": "什么时候开始" }],
  "consistency": null,
  "cognition": { "paragraphs": ["第 1 段", "第 2 段"] },
  "actions": { "items": ["动作 1", "动作 2", "动作 3"], "closing": "一句收尾" },
  "sources": [{ "title": "来源标题", "url": "来源链接", "usedFor": "用来核对了什么" }]
}

硬性规则：
- hero、target、cognition、actions 的每一段分析都必须由你根据本次资料重写，不得照抄模板或只做填空题。
- target.cityNote、salaryNote、closing 三个字段都必须填写。
- strengths 必须覆盖【本次优势维度】里的每一个 key，每个 key 一条，key 原样使用，不能改写。
- gaps 必须覆盖【本次优先补足维度】里的每一个 key，每个 key 一条，key 原样使用，不能改写。
- cognition.paragraphs 必须写 2—5 段，结合本次选择和优先补足维度分析，不能只复述题目。
- actions.items 必须正好 3 条，按先后顺序排列，每条都要能在 30 天内开始。
- actions.closing 必须填写一句具体的收尾，不能空着。
- consistency 只有确实存在“自评与行为明显矛盾”时才写成 { "intro": "...", "paragraphs": ["..."], "closing": "..." }，否则写 null。
- sources 只能使用【检索结果】里出现过的 URL，最多 5 条；没有检索结果就写空数组 []。不得编造 URL、标题、政策、薪资或时间。
- 所有内容用中文，纯文本，不要 Markdown 标题、列表符号、表情或代码块。
- 不要输出总分类数字，不要修改系统给出的分数。`

interface GenerateInput {
  survey: Survey
  answers: Answers
  scores: ScoreResult
  name: string
  slug: string
  createdAt: string
  claimed: boolean
  overrides: ReportOverrides
}

async function generateContent(input: GenerateInput): Promise<{
  content: AiReportContent
  meta: AiMeta
}> {
  const { survey, answers, scores } = input
  const template = getTemplate()
  const targetFields = textFields(answers.a8)
  const locationFields = textFields(answers.a4)
  const major = typeof answers.a2 === 'string' ? answers.a2.trim() : ''
  const city = targetFields[0] || locationFields[0] || locationFields[1] || ''
  const role = targetFields[1] || (major ? `${major}相关岗位` : '')
  const reason = targetFields[2] || ''
  const salary = answerLabel(
    survey.questions.find((question) => question.id === 'a7'),
    answers.a7
  )
  const priority = answerLabel(
    survey.questions.find((question) => question.id === 'a9'),
    answers.a9
  )
  const goalRecord = cleanGoal(survey, answers.a10)
  const goal = [goalRecord.choice, goalRecord.note].filter(Boolean).join('；')

  const base = buildReport({
    survey,
    answers,
    scores,
    template,
    name: input.name,
    slug: input.slug,
    createdAt: input.createdAt,
    claimed: input.claimed,
    overrides: input.overrides
  })
  const strengths = base.blocks.find(
    (block): block is StrengthsBlock => block.type === 'strengths'
  )
  const gaps = base.blocks.find((block): block is GapsBlock => block.type === 'gaps')

  const strengthKeys = strengths?.items.map((item) => item.key) ?? []
  const gapKeys = gaps?.items.map((item) => item.key) ?? []

  const queries = buildSearchQueries({ city, role, major, priority, goal })
  let results: SearchResult[] = []
  let searchError = ''
  if (!isSearchConfigured()) {
    searchError = '未配置 BOCHA_API_KEY，本次没有联网检索'
  } else if (queries.length > 0) {
    const settled = await Promise.allSettled(queries.map((query) => searchWeb(query)))
    const errors: string[] = []
    for (const item of settled) {
      if (item.status === 'fulfilled') results.push(...item.value)
      else errors.push(errorMessage(item.reason))
    }
    results = dedupeResults(results)
    if (errors.length > 0) {
      searchError = results.length
        ? `部分检索失败：${errors[0]}`
        : errors[0] ?? '联网检索失败'
    }
  }

  const answerText = survey.questions
    .map((question) => {
      const value = answerLabel(question, answers[question.id])
      return value ? `${question.code} ${question.title}：${value}` : ''
    })
    .filter(Boolean)
    .join('\n')

  const scoreText = scores.dimensions
    .map((dimension) => `${dimension.key} ${dimension.name}：${dimension.score} 分`)
    .join('\n')
  const tierRule = tierRuleOf(survey, scores.tier)

  const strengthText =
    strengths?.items
      .map((item) => `${item.key} ${item.name}：${item.score} 分`)
      .join('\n') || '（本次没有优势维度模块）'
  const gapText =
    gaps?.items.map((item) => `${item.key} ${item.name}：${item.score} 分`).join('\n') ||
    '（本次没有优先补足维度模块）'

  const sourceList = results.map((result) => ({
    title: result.title,
    url: result.url,
    site: result.site
  }))

  const userPrompt = `今天是 ${new Date().toISOString().slice(0, 10)}。

【回答】
${answerText}

【分数】
总分 ${scores.total}，${scores.tier} 档（${tierRule.label}）。
${scoreText}

【本次优势维度】
${strengthText}

【本次优先补足维度】
${gapText}

【目标】
城市：${city || '未填'}
岗位或行业：${role || '未填'}
期望月薪：${salary || '未填'}
当前优先方向：${priority || '未填'}
6—12 个月目标：${goal || '未填'}
去这个城市的原因：${reason || '未填'}

【检索结果】
${formatSearchResults(results)}

【检索状态】
${searchError || (results.length ? `共 ${results.length} 条可用结果` : '没有检索到可用结果')}

请按 Skill 的要求分析，并且只输出规定的 JSON 对象。`

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${getReportSkill()}\n\n---\n\n${OUTPUT_CONTRACT}`
    },
    { role: 'user', content: userPrompt }
  ]

  async function requestJson(history: ChatMessage[]): Promise<unknown> {
    const rawText = await askDeepSeek(history)
    try {
      return parseJsonObject(rawText)
    } catch {
      const repair: ChatMessage[] = [
        ...history,
        { role: 'assistant', content: rawText.slice(0, 4000) },
        {
          role: 'user',
          content: '上一条不是合法 JSON。请严格按输出结构，只输出一个合法 JSON 对象，不要代码块。'
        }
      ]
      return parseJsonObject(await askDeepSeek(repair))
    }
  }

  const normalizeOptions = {
    strengthKeys,
    gapKeys,
    allowedSources: sourceList
  }
  let content = normalizeAiContent(await requestJson(messages), normalizeOptions)
  const requiresConsistency = base.blocks.some((block) => block.type === 'consistency')

  for (let pass = 0; pass < 2; pass += 1) {
    const problems = contentProblems(content, {
      strengthKeys,
      gapKeys,
      requiresConsistency
    })
    const banned = findBannedPhrase(content)
    if (problems.length === 0 && !banned) break

    const feedback = [
      '你上一次输出的报告内容有以下问题，需要修正：',
      ...problems.map((item) => `- ${item}`),
      banned ? `- 出现了禁用表述「${banned}」，必须换一种具体、克制的说法重写` : '',
      '请保留已经正确的分析，补全所有缺失字段，并重新输出完整 JSON。',
      '不要使用模板式套话，所有分析必须基于本次回答、分数和目标重新写。'
    ]
      .filter(Boolean)
      .join('\n')

    const repairedRaw = await requestJson([
      ...messages,
      { role: 'assistant', content: JSON.stringify(content).slice(0, 12_000) },
      { role: 'user', content: feedback }
    ])
    const repaired = normalizeAiContent(repairedRaw, normalizeOptions)
    content = mergeAiContent(repaired, content)
  }

  const problems = contentProblems(content, {
    strengthKeys,
    gapKeys,
    requiresConsistency
  })
  if (problems.length > 0) {
    throw new Error(`AI 报告内容仍不完整：${problems[0]}`)
  }

  const banned = findBannedPhrase(content)
  if (banned) {
    throw new Error(`AI 报告出现禁用表述「${banned}」`)
  }

  return {
    content,
    meta: {
      model: config.deepseekModel,
      searchQueries: queries,
      searchUsed: isSearchConfigured() && queries.length > 0,
      searchError,
      resultCount: results.length,
      sourceCount: content.sources.length,
      generatedAt: now()
    }
  }
}

async function generate(submissionId: string): Promise<void> {
  const row = getSubmission(submissionId)
  if (!row || row.ai_status === 'ready') return

  if (!isAiConfigured()) {
    db.prepare(
      "UPDATE submissions SET ai_status = 'failed', ai_error = ?, ai_finished_at = ? WHERE id = ?"
    ).run('AI 分析还没有配置', now(), submissionId)
    return
  }

  const started = now()
  const update = db
    .prepare(
      `UPDATE submissions
       SET ai_status = 'running', ai_attempts = ai_attempts + 1, ai_started_at = ?,
           ai_finished_at = NULL, ai_error = ''
       WHERE id = ? AND ai_status != 'ready'`
    )
    .run(started, submissionId)
  if (update.changes === 0) return

  try {
    const invite = db
      .prepare('SELECT name FROM invites WHERE id = ?')
      .get(row.invite_id) as { name: string } | undefined
    const survey = getSurvey(row.survey_id) ?? getActiveSurvey()
    const answers = parseJson<Answers>(row.answers, {})

    // 文档版问卷：整份报告交给 AI 写，按问卷答案 + 规则事实出结论。
    if (survey.reportMode === 'doc') {
      const { content, meta, jobs, search } = await generateDocContent({
        survey,
        answers,
        name: invite?.name ?? '',
        slug: row.slug,
        createdAt: row.created_at,
        claimed: Boolean(row.claimed_at)
      })
      db.prepare(
        `UPDATE submissions
         SET ai_status = 'ready', ai_report = ?, ai_meta = ?, ai_error = '', ai_finished_at = ?
         WHERE id = ?`
      ).run(
        JSON.stringify({ doc: true, content, jobs, search }),
        JSON.stringify(meta),
        now(),
        submissionId
      )
      recordEvent(row.invite_id, 'ai_report_ready', { model: meta.model })
      return
    }

    const storedScores = parseJson<ScoreResult>(row.scores, computeScores(survey, answers))
    const scores =
      Array.isArray(storedScores.dimensions) && storedScores.dimensions.length
        ? storedScores
        : computeScores(survey, answers)

    const { content, meta } = await generateContent({
      survey,
      answers,
      scores,
      name: invite?.name ?? '',
      slug: row.slug,
      createdAt: row.created_at,
      claimed: Boolean(row.claimed_at),
      overrides: parseJson<ReportOverrides>(row.overrides, {})
    })

    db.prepare(
      `UPDATE submissions
       SET ai_status = 'ready', ai_report = ?, ai_meta = ?, ai_error = '', ai_finished_at = ?
       WHERE id = ?`
    ).run(JSON.stringify(content), JSON.stringify(meta), now(), submissionId)
    recordEvent(row.invite_id, 'ai_report_ready', {
      model: meta.model,
      sourceCount: meta.sourceCount
    })
  } catch (error) {
    const message = errorMessage(error)
    const attempt = row.ai_attempts + 1
    if (attempt < MAX_AI_ATTEMPTS && isRetryableError(message)) {
      const delay = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)]
      const retryMessage = `第 ${attempt} 次 AI 分析未完成，将自动重试：${message}`
      db.prepare(
        `UPDATE submissions
         SET ai_status = 'pending', ai_error = ?, ai_finished_at = ?
         WHERE id = ?`
      ).run(retryMessage, now(), submissionId)
      recordEvent(row.invite_id, 'ai_report_retry', { message, attempt, delay })
      console.warn('[ai-report] 自动重试', submissionId, retryMessage)
      scheduleReportGeneration(submissionId, delay)
      return
    }

    db.prepare(
      `UPDATE submissions
       SET ai_status = 'failed', ai_error = ?, ai_finished_at = ?
       WHERE id = ?`
    ).run(message, now(), submissionId)
    recordEvent(row.invite_id, 'ai_report_failed', { message, attempt })
    console.error('[ai-report]', submissionId, message)
  }
}

function scheduleReportGeneration(submissionId: string, delay: number): void {
  if (retryTimers.has(submissionId)) return
  const timer = setTimeout(() => {
    retryTimers.delete(submissionId)
    startReportGeneration(submissionId)
  }, delay)
  timer.unref?.()
  retryTimers.set(submissionId, timer)
}

export function startReportGeneration(submissionId: string): void {
  const timer = retryTimers.get(submissionId)
  if (timer) {
    clearTimeout(timer)
    retryTimers.delete(submissionId)
  }
  if (running.has(submissionId)) return
  running.add(submissionId)
  void generate(submissionId)
    .catch((error) => console.error('[ai-report] 未处理异常', submissionId, errorMessage(error)))
    .finally(() => running.delete(submissionId))
}

export function ensureReportGeneration(input: {
  id: string
  status: string
  startedAt: string | null
  finishedAt: string | null
  attempts: number
  error: string
}): boolean {
  if (!isAiConfigured() || input.status === 'ready') return false

  if (input.status === 'running') {
    const started = input.startedAt ? Date.parse(input.startedAt) : 0
    if (started && Date.now() - started < 4 * 60_000) return false
    startReportGeneration(input.id)
    return true
  }

  if (input.status === 'failed') {
    if (input.attempts >= MAX_AI_ATTEMPTS) return false
    const finished = input.finishedAt ? Date.parse(input.finishedAt) : 0
    if (finished && Date.now() - finished < 5_000) return false
    startReportGeneration(input.id)
    return true
  }

  startReportGeneration(input.id)
  return true
}

export function regenerateReport(submissionId: string): boolean {
  const row = getSubmission(submissionId)
  if (!row) return false
  if (row.ai_status === 'running' && running.has(submissionId)) return true
  db.prepare(
    `UPDATE submissions
     SET ai_status = 'pending', ai_error = '', ai_attempts = 0,
         ai_started_at = NULL, ai_finished_at = NULL
     WHERE id = ?`
  ).run(submissionId)
  startReportGeneration(submissionId)
  return true
}

export function readStoredContent(raw: string | null): AiReportContent | null {
  if (!raw) return null
  try {
    const parsed = parseJson<unknown>(raw, null)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as AiReportContent
  } catch {
    return null
  }
}
