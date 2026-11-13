import { Router } from 'express'
import {
  chooseConsultForestPath,
  defaultConsultTemplate,
  updateConsultNodesById,
  type ConsultBeat,
  type ConsultBeatKind,
  type ConsultContext,
  type ConsultForest,
  type ConsultModuleOption,
  type ConsultOutcome,
  type ConsultRun,
  type ConsultRunSection,
  type ConsultRunSectionStatus,
  type ConsultRunStatus,
  type ConsultTemplate,
  type ConsultTree
} from '../../../../shared/src/consult'
import type { ConsultPurposePlan } from '../../../../shared/src/consult-purpose'
import { buildModulesFromPlan, type ConsultModulePlan } from '../../consult-modules'
import { db, newId, now } from '../../db'
import { isAiConfigured } from '../../ai/generate'
import {
  buildConsultDocument,
  composeConsultChapter,
  planConsultOutline,
  type ComposeConsultInput,
  type ConsultChapterPlan,
  type ConsultChapterResult
} from '../../ai/consult'
import { buildPurposePlan, findPurposeTemplate } from '../../ai/purpose'
import {
  composePurposeChapter,
  planPurposeChapters,
  type PurposeChapterPlan,
  type PurposeChapterResult
} from '../../ai/purpose-consult'
import { beatsToText, composePurposeModuleBeats, planPurposeModuleDraft } from '../../ai/purpose-module'
import { clampString, parseJson } from '../../util'
import { noStore } from '../../auth'
import { log } from '../../log'
import {
  buildConsultExportModel,
  consultExportFilename,
  renderConsultDocx,
  renderConsultHtml,
  renderConsultText
} from '../../consult-export'
import {
  DEFAULT_TARGET_LENGTH,
  OUTCOMES,
  asRecord,
  readActiveTemplateId,
  readPurposePayload,
  readScoring,
  readTemplates,
  sanitizeContext,
  sanitizeTargetLength
} from './shared'
import {
  activeTree,
  addAnswerHistory,
  findNode,
  readForest,
  treeForPath,
  writeForest
} from './forest'

export const runsRouter = Router()

interface ConsultRunRow {
  id: string
  template_id: string
  template_name: string
  mode: string
  purpose_template_id: string
  purpose_path: string
  context: string
  path: string
  steps: string
  output: string
  status: string
  error: string
  outcome: string
  outcome_node_id: string
  target_length: number
  created_at: string
  updated_at: string
  finished_at: string | null
  outcome_at: string | null
}

interface ConsultRunSectionRow {
  run_id: string
  seq: number
  title: string
  goal: string
  content: string
  status: string
  error: string
  target_chars: number
  purpose_keys: string
  module_id: string
  options_json: string
  selected_option_id: string
  beats_json: string
  notes: string
  edited: number
  updated_at: string
}

function runFromRow(row: ConsultRunRow, includeContent = false): ConsultRun {
  const rawStatus = row.status as ConsultRunStatus
  const status: ConsultRunStatus = ['queued', 'running', 'failed'].includes(rawStatus)
    ? rawStatus
    : 'ready'
  const path = parseJson<ConsultRun['path']>(row.path, [])
  const mode: ConsultRun['mode'] = row.mode === 'purpose' ? 'purpose' : 'sentence'
  return {
    id: row.id,
    templateId: row.template_id,
    templateName: row.template_name,
    mode,
    purposeTemplateId: row.purpose_template_id || '',
    purposePath: row.purpose_path
      ? parseJson<ConsultRun['purposePath']>(row.purpose_path, null)
      : null,
    context: parseJson<ConsultContext>(row.context, {}),
    path,
    steps: parseJson<ConsultRun['steps']>(row.steps, []),
    output: row.output,
    status,
    error: row.error,
    outcome: (row.outcome || '') as ConsultOutcome,
    outcomeNodeId: row.outcome_node_id,
    targetLength: row.target_length || 0,
    sections: readRunSections(row.id, includeContent),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    finishedAt: row.finished_at,
    outcomeAt: row.outcome_at
  }
}

function sectionFromRow(row: ConsultRunSectionRow, includeContent = false): ConsultRunSection {
  const rawStatus = row.status as ConsultRunSectionStatus
  const status: ConsultRunSectionStatus = ['pending', 'running', 'failed'].includes(rawStatus)
    ? rawStatus
    : 'ready'
  return {
    seq: row.seq,
    moduleId: row.module_id || '',
    title: row.title,
    goal: row.goal,
    content: includeContent ? row.content : '',
    status,
    error: row.error,
    targetChars: row.target_chars,
    purposeKeys: parseJson<string[]>(row.purpose_keys, []),
    options: includeContent ? parseJson<ConsultModuleOption[]>(row.options_json, []) : [],
    selectedOptionId: includeContent ? row.selected_option_id || '' : '',
    beats: includeContent ? parseJson<ConsultBeat[]>(row.beats_json, []) : [],
    notes: includeContent ? row.notes || '' : '',
    edited: Boolean(row.edited),
    updatedAt: row.updated_at
  }
}

function readRunSections(runId: string, includeContent = false): ConsultRunSection[] {
  const rows = db
    .prepare('SELECT * FROM consult_run_sections WHERE run_id = ? ORDER BY seq ASC')
    .all(runId) as unknown as ConsultRunSectionRow[]
  return rows.map((row) => sectionFromRow(row, includeContent))
}

function readRun(id: string, includeContent = true): ConsultRun | null {
  const row = db.prepare('SELECT * FROM consult_runs WHERE id = ?').get(id) as
    | ConsultRunRow
    | undefined
  return row ? runFromRow(row, includeContent) : null
}

function readRuns(limit = 40): ConsultRun[] {
  const rows = db
    .prepare('SELECT * FROM consult_runs ORDER BY created_at DESC LIMIT ?')
    .all(Math.min(100, Math.max(1, limit))) as unknown as ConsultRunRow[]
  return rows.map((row) => runFromRow(row, false))
}

const activeConsultJobs = new Map<string, Promise<void>>()

function markStaleConsultJobs(): void {
  const staleAt = now()
  const message = '服务器在生成过程中重新启动，这次生成没有完成。可以点击重试继续。'
  db.prepare(
    "UPDATE consult_runs SET status = 'failed', error = ?, updated_at = ?, finished_at = ? WHERE status IN ('queued', 'running')"
  ).run(message, staleAt, staleAt)
  db.prepare(
    "UPDATE consult_run_sections SET status = 'failed', error = ?, updated_at = ? WHERE status = 'running'"
  ).run(message, staleAt)
}

markStaleConsultJobs()

function chapterSummary(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim()
  if (clean.length <= 320) return clean
  return `${clean.slice(0, 220)}……${clean.slice(-80)}`
}

function setRunRunning(runId: string): void {
  db.prepare("UPDATE consult_runs SET status = 'running', error = '', updated_at = ? WHERE id = ?").run(
    now(),
    runId
  )
}

function setRunFailed(runId: string, message: string): void {
  const failedAt = now()
  db.prepare(
    "UPDATE consult_runs SET status = 'failed', error = ?, updated_at = ?, finished_at = ? WHERE id = ?"
  ).run(message.slice(0, 1200), failedAt, failedAt, runId)
}

function setRunReady(runId: string, output: string): void {
  const finishedAt = now()
  db.prepare(
    "UPDATE consult_runs SET status = 'ready', error = '', output = ?, updated_at = ?, finished_at = ? WHERE id = ?"
  ).run(output, finishedAt, finishedAt, runId)
}

function rebuildRunOutput(runId: string): string {
  const output = buildConsultDocument(readyDocumentSections(readRunSections(runId, true)))
  db.prepare('UPDATE consult_runs SET output = ?, updated_at = ? WHERE id = ?').run(
    output,
    now(),
    runId
  )
  return output
}

function purposeInputFromRow(row: ConsultRunRow): Parameters<typeof planPurposeModuleDraft>[0] {
  const plan = parseJson<ConsultPurposePlan | null>(row.purpose_path, null)
  if (!plan?.items?.length) throw new Error('这次生成还没有目的路径，请重新生成')
  const purposeTemplate = findPurposeTemplate(readPurposePayload(), row.purpose_template_id)
  return {
    template: readTemplates().find((item) => item.id === row.template_id) ?? defaultConsultTemplate,
    purposeTemplate,
    plan,
    context: parseJson<ConsultContext>(row.context, {}),
    targetLength: row.target_length || DEFAULT_TARGET_LENGTH
  }
}

interface PurposeFeedbackRow {
  purpose_key: string
  selected: number
  won: number
  lost: number
  liked: number
}

// 把历史结果按目的整理成几行给 AI 看。样本很少时不写成结论，
// 只让它在三种打法排序时参考，避免用几十次反馈压过眼前这个学生的特殊情况。
function purposeFeedbackText(templateId: string, keys: string[]): string {
  if (!templateId || !keys.length) return ''
  const wanted = new Set(keys)
  const rows = db
    .prepare(
      `SELECT purpose_key, selected, won, lost, liked
       FROM consult_purpose_feedback WHERE template_id = ?`
    )
    .all(templateId) as unknown as PurposeFeedbackRow[]
  return rows
    .filter((row) => wanted.has(row.purpose_key))
    .map(
      (row) =>
        `${row.purpose_key}：选择 ${row.selected} 次，成交 ${row.won}，未成交 ${row.lost}，好评 ${row.liked}`
    )
    .join('\n')
}

function readSectionRow(runId: string, seq: number): ConsultRunSectionRow | null {
  return (db
    .prepare('SELECT * FROM consult_run_sections WHERE run_id = ? AND seq = ?')
    .get(runId, seq) ?? null) as ConsultRunSectionRow | null
}

const BEAT_KINDS = new Set<ConsultBeatKind>(['line', 'ask', 'student', 'direction', 'branch'])

function sanitizeBeats(value: unknown): ConsultBeat[] {
  if (!Array.isArray(value)) throw new Error('节拍格式不对')
  const beats: ConsultBeat[] = []
  for (const item of value.slice(0, 60)) {
    const record = asRecord(item)
    const text = clampString(record.text, 4000)
    if (!text) continue
    const kind = clampString(record.kind, 20) as ConsultBeatKind
    if (!BEAT_KINDS.has(kind)) throw new Error('节拍类型不对')
    beats.push({
      id: clampString(record.id, 100) || newId('beat'),
      kind,
      text,
      when:
        kind === 'branch'
          ? clampString(record.when, 200) || '如果她的反应不一样'
          : undefined
    })
  }
  return beats
}

async function runSentenceConsultJob(row: ConsultRunRow): Promise<void> {
  const runId = row.id
  const forest = readForest()
  const path = parseJson<ConsultRun['path']>(row.path, [])
  if (!path.length) throw new Error('这次生成没有决策路径，无法继续')
  const tree = treeForPath(forest, path)
  const template = readTemplates().find((item) => item.id === row.template_id)
  if (!template) throw new Error('找不到这次使用的咨询稿风格')
  const context = parseJson<ConsultContext>(row.context, {})
  const steps = parseJson<ConsultRun['steps']>(row.steps, [])
  const decision: ComposeConsultInput['decision'] = {
    path,
    steps,
    leafId: path.at(-1)?.id ?? ''
  }
  const input: ComposeConsultInput = {
    tree,
    template,
    decision,
    context,
    targetLength: row.target_length || DEFAULT_TARGET_LENGTH
  }

  let plan: ConsultChapterPlan[] = []
  let completedBySeq = new Map<number, ConsultChapterResult>()
  const existingSections = readRunSections(runId, true)
  if (existingSections.length) {
    plan = existingSections.map((section) => ({
      title: section.title,
      goal: section.goal,
      targetChars: section.targetChars
    }))
    for (const section of existingSections) {
      if (section.status === 'ready' && section.content.trim()) {
        completedBySeq.set(section.seq, {
          title: section.title,
          goal: section.goal,
          targetChars: section.targetChars,
          content: section.content,
          summary: chapterSummary(section.content)
        })
      }
    }
    db.prepare(
      "UPDATE consult_run_sections SET status = 'pending', content = '', error = '', updated_at = ? WHERE run_id = ? AND status != 'ready'"
    ).run(now(), runId)
  } else {
    setRunRunning(runId)
    plan = await planConsultOutline(input)
    const insertSection = db.prepare(
      `INSERT INTO consult_run_sections
       (run_id, seq, title, goal, content, status, error, target_chars, updated_at)
       VALUES (?, ?, ?, ?, '', 'pending', '', ?, ?)`
    )
    for (const [index, chapter] of plan.entries()) {
      insertSection.run(runId, index + 1, chapter.title, chapter.goal, chapter.targetChars, now())
    }
  }

  log.info('consult.plan', { runId, mode: 'sentence', sections: plan.length })
  setRunRunning(runId)
  let currentSeq = 0
  try {
    for (const [index, chapter] of plan.entries()) {
      const seq = index + 1
      if (completedBySeq.has(seq)) continue
      currentSeq = seq
      const sectionStartedMs = Date.now()
      log.info('consult.section.start', { runId, seq })
      db.prepare(
        "UPDATE consult_run_sections SET status = 'running', error = '', updated_at = ? WHERE run_id = ? AND seq = ?"
      ).run(now(), runId, seq)
      const completed = [...completedBySeq.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, item]) => item)
      const result = await composeConsultChapter(input, plan, chapter, index, completed)
      completedBySeq.set(seq, result)
      log.info('consult.section.ready', {
        runId,
        seq,
        ms: Date.now() - sectionStartedMs,
        chars: result.content.length
      })
      db.prepare(
        "UPDATE consult_run_sections SET status = 'ready', content = ?, error = '', updated_at = ? WHERE run_id = ? AND seq = ?"
      ).run(result.content, now(), runId, seq)
      const partialOutput = buildConsultDocument(
        [...completedBySeq.entries()].sort(([a], [b]) => a - b).map(([, item]) => item)
      )
      db.prepare("UPDATE consult_runs SET output = ?, updated_at = ? WHERE id = ?").run(
        partialOutput,
        now(),
        runId
      )
    }
    const output = buildConsultDocument(
      [...completedBySeq.entries()].sort(([a], [b]) => a - b).map(([, item]) => item)
    )
    if (!output.trim()) throw new Error('AI 没有生成任何有效正文')
    setRunReady(runId, output)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 生成失败'
    log.error('consult.section.failed', {
      runId,
      seq: currentSeq,
      error: message,
      err: error
    })
    if (currentSeq) {
      db.prepare(
        "UPDATE consult_run_sections SET status = 'failed', error = ?, updated_at = ? WHERE run_id = ? AND seq = ?"
      ).run(message.slice(0, 1200), now(), runId, currentSeq)
    }
    throw error
  }
}

async function runPurposeConsultJob(row: ConsultRunRow): Promise<void> {
  const runId = row.id
  const context = parseJson<ConsultContext>(row.context, {})
  const template =
    readTemplates().find((item) => item.id === row.template_id) ?? defaultConsultTemplate
  const payload = readPurposePayload()
  const purposeTemplate = findPurposeTemplate(payload, row.purpose_template_id)
  let plan = parseJson<ConsultPurposePlan | null>(row.purpose_path, null)
  if (!plan?.items?.length) {
    plan = await buildPurposePlan(payload, purposeTemplate.id, context)
    db.prepare('UPDATE consult_runs SET purpose_path = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(plan),
      now(),
      runId
    )
  }
  const input = {
    template,
    purposeTemplate,
    plan,
    context,
    targetLength: row.target_length || DEFAULT_TARGET_LENGTH
  }

  const existingSections = readRunSections(runId, true)
  if (existingSections.length && existingSections.every((section) => !section.moduleId)) {
    await runLegacyPurposeConsultJob(row, input, existingSections)
    return
  }
  await runModularPurposeConsultJob(row, input, existingSections)
}

function readyDocumentSections(sections: ConsultRunSection[]): Array<{
  title: string
  goal: string
  targetChars: number
  content: string
  summary: string
}> {
  return sections
    .filter((section) => section.status === 'ready' && section.content.trim())
    .map((section) => ({
      title: section.title,
      goal: section.goal,
      targetChars: section.targetChars,
      content: section.content,
      summary: ''
    }))
}

function moduleForSection(
  section: ConsultRunSection,
  modules: ConsultModulePlan[],
  index: number
): ConsultModulePlan {
  const matched = modules.find((module) => module.id === section.moduleId)
  if (matched) return matched
  return (
    modules[index] ?? {
      id: section.moduleId || `module.manual.${section.seq}`,
      label: section.title,
      stageId: '',
      stageLabel: '',
      purposeKeys: section.purposeKeys,
      purposeLabels: section.purposeKeys
    }
  )
}

async function runModularPurposeConsultJob(
  row: ConsultRunRow,
  input: Parameters<typeof planPurposeModuleDraft>[0],
  existingSections: ConsultRunSection[]
): Promise<void> {
  const runId = row.id
  const modules = buildModulesFromPlan(input.plan)
  if (!modules.length) throw new Error('目的路径没有可用的对话模块')

  if (!existingSections.length) {
    setRunRunning(runId)
    const perModule = Math.max(
      800,
      Math.round((row.target_length || DEFAULT_TARGET_LENGTH) / modules.length)
    )
    const insertSection = db.prepare(
      `INSERT INTO consult_run_sections
       (run_id, seq, title, goal, content, status, error, target_chars, purpose_keys,
        module_id, options_json, selected_option_id, beats_json, notes, edited, updated_at)
       VALUES (?, ?, ?, ?, '', 'pending', '', ?, ?, ?, '[]', '', '[]', '', 0, ?)`
    )
    for (const [index, module] of modules.entries()) {
      insertSection.run(
        runId,
        index + 1,
        module.label,
        `覆盖目的：${module.purposeLabels.join('、')}`.slice(0, 800),
        perModule,
        JSON.stringify(module.purposeKeys),
        module.id,
        now()
      )
    }
  }

  log.info('consult.plan', {
    runId,
    mode: 'purpose-modular',
    sections: modules.length
  })
  setRunRunning(runId)
  let currentSeq = 0
  try {
    let sections = readRunSections(runId, true)
    for (const [index, section] of sections.entries()) {
      if (section.status === 'ready') continue
      currentSeq = section.seq
      const sectionStartedMs = Date.now()
      log.info('consult.section.start', { runId, seq: section.seq })
      db.prepare(
        "UPDATE consult_run_sections SET status = 'running', error = '', updated_at = ? WHERE run_id = ? AND seq = ?"
      ).run(now(), runId, section.seq)
      const module = moduleForSection(section, modules, index)
      const previous = sections
        .filter((item) => item.seq < section.seq && item.status === 'ready')
        .at(-1)
      const result = await planPurposeModuleDraft(
        input,
        module,
        previous?.content.slice(-1200) ?? '',
        purposeFeedbackText(input.purposeTemplate.id, module.purposeKeys)
      )
      const content = beatsToText(result.beats)
      log.info('consult.section.ready', {
        runId,
        seq: section.seq,
        ms: Date.now() - sectionStartedMs,
        chars: content.length
      })
      db.prepare(
        `UPDATE consult_run_sections
         SET status = 'ready', error = '', content = ?, options_json = ?, selected_option_id = ?,
             beats_json = ?, updated_at = ?
         WHERE run_id = ? AND seq = ?`
      ).run(
        content,
        JSON.stringify(result.options),
        result.recommendedOptionId,
        JSON.stringify(result.beats),
        now(),
        runId,
        section.seq
      )
      sections = readRunSections(runId, true)
      const partialOutput = buildConsultDocument(readyDocumentSections(sections))
      db.prepare("UPDATE consult_runs SET output = ?, updated_at = ? WHERE id = ?").run(
        partialOutput,
        now(),
        runId
      )
    }
    const output = buildConsultDocument(readyDocumentSections(readRunSections(runId, true)))
    if (!output.trim()) throw new Error('AI 没有生成任何有效正文')
    setRunReady(runId, output)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 生成失败'
    log.error('consult.section.failed', {
      runId,
      seq: currentSeq,
      error: message,
      err: error
    })
    if (currentSeq) {
      db.prepare(
        "UPDATE consult_run_sections SET status = 'failed', error = ?, updated_at = ? WHERE run_id = ? AND seq = ?"
      ).run(message.slice(0, 1200), now(), runId, currentSeq)
    }
    throw error
  }
}

async function runLegacyPurposeConsultJob(
  row: ConsultRunRow,
  input: Parameters<typeof planPurposeChapters>[0],
  existingSections: ConsultRunSection[]
): Promise<void> {
  const runId = row.id
  const completedBySeq = new Map<number, PurposeChapterResult>()
  const chapters: PurposeChapterPlan[] = existingSections.map((section) => ({
    title: section.title,
    goal: section.goal,
    targetChars: section.targetChars,
    purposeKeys: section.purposeKeys
  }))
  for (const section of existingSections) {
    if (section.status === 'ready' && section.content.trim()) {
      completedBySeq.set(section.seq, {
        title: section.title,
        goal: section.goal,
        targetChars: section.targetChars,
        purposeKeys: section.purposeKeys,
        content: section.content,
        summary: chapterSummary(section.content)
      })
    }
  }
  db.prepare(
    "UPDATE consult_run_sections SET status = 'pending', content = '', error = '', updated_at = ? WHERE run_id = ? AND status != 'ready'"
  ).run(now(), runId)

  log.info('consult.plan', {
    runId,
    mode: 'purpose-legacy',
    sections: chapters.length
  })
  setRunRunning(runId)
  let currentSeq = 0
  try {
    for (const [index, chapter] of chapters.entries()) {
      const seq = index + 1
      if (completedBySeq.has(seq)) continue
      currentSeq = seq
      const sectionStartedMs = Date.now()
      log.info('consult.section.start', { runId, seq })
      db.prepare(
        "UPDATE consult_run_sections SET status = 'running', error = '', updated_at = ? WHERE run_id = ? AND seq = ?"
      ).run(now(), runId, seq)
      const completed = [...completedBySeq.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, item]) => item)
      const result = await composePurposeChapter(input, chapters, chapter, index, completed)
      completedBySeq.set(seq, result)
      log.info('consult.section.ready', {
        runId,
        seq,
        ms: Date.now() - sectionStartedMs,
        chars: result.content.length
      })
      db.prepare(
        "UPDATE consult_run_sections SET status = 'ready', content = ?, error = '', updated_at = ? WHERE run_id = ? AND seq = ?"
      ).run(result.content, now(), runId, seq)
      const partialOutput = buildConsultDocument(
        [...completedBySeq.entries()].sort(([a], [b]) => a - b).map(([, item]) => item)
      )
      db.prepare("UPDATE consult_runs SET output = ?, updated_at = ? WHERE id = ?").run(
        partialOutput,
        now(),
        runId
      )
    }
    const output = buildConsultDocument(
      [...completedBySeq.entries()].sort(([a], [b]) => a - b).map(([, item]) => item)
    )
    if (!output.trim()) throw new Error('AI 没有生成任何有效正文')
    setRunReady(runId, output)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 生成失败'
    log.error('consult.section.failed', {
      runId,
      seq: currentSeq,
      error: message,
      err: error
    })
    if (currentSeq) {
      db.prepare(
        "UPDATE consult_run_sections SET status = 'failed', error = ?, updated_at = ? WHERE run_id = ? AND seq = ?"
      ).run(message.slice(0, 1200), now(), runId, currentSeq)
    }
    throw error
  }
}

async function runConsultJob(runId: string): Promise<void> {
  const row = db.prepare('SELECT * FROM consult_runs WHERE id = ?').get(runId) as
    | ConsultRunRow
    | undefined
  if (!row) return
  if (row.mode === 'purpose') return runPurposeConsultJob(row)
  return runSentenceConsultJob(row)
}

function startConsultJob(runId: string): void {
  if (activeConsultJobs.has(runId)) {
    log.debug('consult.skip_running', { runId })
    return
  }
  const startedMs = Date.now()
  log.info('consult.start', { runId })
  const job = runConsultJob(runId)
    .catch((error) => {
      log.error('consult.failed', {
        runId,
        ms: Date.now() - startedMs,
        err: error
      })
      setRunFailed(runId, error instanceof Error ? error.message : 'AI 生成失败')
    })
    .finally(() => {
      log.info('consult.end', { runId, ms: Date.now() - startedMs })
      activeConsultJobs.delete(runId)
    })
  activeConsultJobs.set(runId, job)
}

function sectionSeqParam(value: string): number {
  const seq = Number(value)
  if (!Number.isInteger(seq) || seq < 1) throw new Error('模块序号不对')
  return seq
}

function markRunReadyIfComplete(runId: string): void {
  const sections = readRunSections(runId, true)
  if (!sections.length || sections.some((section) => section.status !== 'ready')) return
  db.prepare(
    "UPDATE consult_runs SET status = 'ready', error = '', finished_at = COALESCE(finished_at, ?), updated_at = ? WHERE id = ?"
  ).run(now(), now(), runId)
}

// 保存一个模块的节拍、备注或选中的打法。保存节拍时，正文由节拍重新拼出来，
// 这样“可照着说”的稿子和最终全文永远一致。

runsRouter.get('/runs', (req, res) => {
  res.json({ runs: readRuns(60) })
})

runsRouter.post('/runs', (req, res) => {
  if (!isAiConfigured()) {
    res.status(503).json({ error: '未配置 DEEPSEEK_API_KEY，暂时无法生成咨询稿' })
    return
  }
  const body = asRecord(req.body)
  const context = sanitizeContext(body.context)
  const targetLength = sanitizeTargetLength(body.targetLength)
  const templates = readTemplates()
  const requestedTemplateId = clampString(body.templateId, 100)
  const selectedTemplateId = requestedTemplateId || readActiveTemplateId(templates)
  const mode: ConsultRun['mode'] = body.mode === 'purpose' ? 'purpose' : 'sentence'

  if (mode === 'purpose') {
    let purposeTemplate
    try {
      purposeTemplate = findPurposeTemplate(
        readPurposePayload(),
        clampString(body.purposeTemplateId, 100)
      )
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : '没有可用的咨询树模板'
      })
      return
    }
    const template =
      templates.find((item) => item.id === selectedTemplateId) ?? defaultConsultTemplate
    const id = newId('consult_run')
    const createdAt = now()
    db.prepare(
      `INSERT INTO consult_runs
       (id, template_id, template_name, mode, purpose_template_id, purpose_path, context,
        path, steps, output, status, error, outcome, outcome_node_id, target_length,
        created_at, updated_at)
       VALUES (?, ?, ?, 'purpose', ?, '', ?, '[]', '[]', '', 'queued', '', '', '', ?, ?, ?)`
    ).run(
      id,
      template.id,
      template.name,
      purposeTemplate.id,
      JSON.stringify(context),
      targetLength,
      createdAt,
      createdAt
    )
    startConsultJob(id)
    res.status(202).json({ run: readRun(id), purposeTemplate: purposeTemplate.id })
    return
  }

  const forest = readForest()
  let decision: ReturnType<typeof chooseConsultForestPath>
  try {
    decision = chooseConsultForestPath(forest, context, readScoring())
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '还没有可用咨询路径' })
    return
  }
  const tree = forest.trees.find((item) => item.id === decision.treeId) ?? activeTree(forest)
  const boundTemplateId = [...decision.path]
    .reverse()
    .map((item) => findNode(tree.root, item.id)?.metadata?.templateId)
    .find((id): id is string => Boolean(id))
  const templateId =
    boundTemplateId && templates.some((item) => item.id === boundTemplateId)
      ? boundTemplateId
      : selectedTemplateId
  const template = templates.find((item) => item.id === templateId)
  if (!template) {
    res.status(404).json({ error: '没有找到成文模板' })
    return
  }

  for (const item of decision.path) {
    updateConsultNodesById(forest.trees, item.id, (node) => {
      node.selectedCount = (node.selectedCount ?? 0) + 1
    })
  }
  const answerSnapshot = [
    context.profile,
    context.mentions,
    context.conversation,
    context.tags?.join('、')
  ]
    .find((value): value is string => typeof value === 'string' && Boolean(value.trim()))
  if (answerSnapshot) {
    for (const item of decision.path) {
      updateConsultNodesById(forest.trees, item.id, (node) => {
        addAnswerHistory(node, answerSnapshot, context.tags ?? [], 'generation', context.name ?? '')
      })
    }
  }
  forest.activeTreeId = tree.id
  for (const item of forest.trees) item.updatedAt = now()
  writeForest(forest)

  const id = newId('consult_run')
  const createdAt = now()
  db.prepare(
    `INSERT INTO consult_runs
     (id, template_id, template_name, context, path, steps, output, status, error, outcome,
      outcome_node_id, target_length, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '', 'queued', '', '', '', ?, ?, ?)`
  ).run(
    id,
    template.id,
    template.name,
    JSON.stringify(context),
    JSON.stringify(decision.path),
    JSON.stringify(decision.steps),
    targetLength,
    createdAt,
    createdAt
  )
  startConsultJob(id)
  res.status(202).json({ run: readRun(id), tree, trees: forest.trees, forest })
})

runsRouter.get('/runs/:id', (req, res) => {
  const run = readRun(req.params.id)
  if (!run) {
    res.status(404).json({ error: '没有找到这次生成记录' })
    return
  }
  res.json({ run })
})

// 导出已经写好的咨询稿。只导出 status=ready 的模块，内容和页面里的全文一致。
// 支持 docx / html / txt；Word 不依赖第三方库，直接由 consult-export 拼出 OOXML。
runsRouter.get('/runs/:id/export/:format', (req, res) => {
  noStore(res)
  const format = req.params.format
  if (format !== 'docx' && format !== 'html' && format !== 'txt') {
    res.status(400).json({ error: '只支持导出 docx、html 或 txt' })
    return
  }
  const run = readRun(req.params.id)
  if (!run) {
    res.status(404).json({ error: '没有找到这次生成记录' })
    return
  }
  const model = buildConsultExportModel(run)
  if (!model) {
    res.status(400).json({ error: '咨询稿还没生成完，暂时不能导出' })
    return
  }

  const filename = consultExportFilename(run, format)
  const fallback = `consult-${run.id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12) || 'run'}.${format}`
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
  res.setHeader('Content-Disposition', `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`)

  if (format === 'html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(renderConsultHtml(model))
    return
  }
  if (format === 'txt') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.send(renderConsultText(model))
    return
  }
  const buffer = renderConsultDocx(model)
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
  res.setHeader('Content-Length', String(buffer.length))
  res.end(buffer)
})

runsRouter.patch('/runs/:id/sections/:seq', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM consult_runs WHERE id = ?').get(req.params.id) as
      | ConsultRunRow
      | undefined
    if (!row) {
      res.status(404).json({ error: '没有找到这次生成记录' })
      return
    }
    const seq = sectionSeqParam(req.params.seq)
    const section = readSectionRow(req.params.id, seq)
    if (!section) {
      res.status(404).json({ error: '没有找到这个模块' })
      return
    }
    const body = asRecord(req.body)
    const options = parseJson<ConsultModuleOption[]>(section.options_json, [])
    let beats = parseJson<ConsultBeat[]>(section.beats_json, [])
    let content = section.content
    if ('beats' in body) {
      beats = sanitizeBeats(body.beats)
      content = beatsToText(beats)
    } else if ('content' in body) {
      content = clampString(body.content, 200_000)
    }
    let selectedOptionId = section.selected_option_id
    if ('selectedOptionId' in body) {
      selectedOptionId = clampString(body.selectedOptionId, 40)
      if (selectedOptionId && !options.some((option) => option.id === selectedOptionId)) {
        res.status(400).json({ error: '这个打法不属于当前模块' })
        return
      }
    }
    const title = 'title' in body ? clampString(body.title, 200) || section.title : section.title
    const goal = 'goal' in body ? clampString(body.goal, 800) : section.goal
    const notes = 'notes' in body ? clampString(body.notes, 8000) : section.notes
    const purposeKeys =
      'purposeKeys' in body
        ? Array.isArray(body.purposeKeys)
          ? body.purposeKeys
              .map((item) => clampString(item, 120))
              .filter(Boolean)
              .slice(0, 80)
          : []
        : parseJson<string[]>(section.purpose_keys, [])
    db.prepare(
      `UPDATE consult_run_sections
       SET title = ?, goal = ?, content = ?, status = 'ready', error = '',
           purpose_keys = ?, selected_option_id = ?, beats_json = ?, notes = ?,
           edited = 1, updated_at = ?
       WHERE run_id = ? AND seq = ?`
    ).run(
      title,
      goal,
      content,
      JSON.stringify(purposeKeys),
      selectedOptionId,
      JSON.stringify(beats),
      notes,
      now(),
      req.params.id,
      seq
    )
    rebuildRunOutput(req.params.id)
    markRunReadyIfComplete(req.params.id)
    res.json({ run: readRun(req.params.id) })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '保存模块失败' })
  }
})

// 换一种打法：保留三种选择，只按选中的那一种重新写节拍。
runsRouter.post('/runs/:id/sections/:seq/beats', async (req, res) => {
  if (!isAiConfigured()) {
    res.status(503).json({ error: '未配置 DEEPSEEK_API_KEY，暂时无法重写模块' })
    return
  }
  try {
    const row = db.prepare('SELECT * FROM consult_runs WHERE id = ?').get(req.params.id) as
      | ConsultRunRow
      | undefined
    if (!row) {
      res.status(404).json({ error: '没有找到这次生成记录' })
      return
    }
    const seq = sectionSeqParam(req.params.seq)
    const section = readSectionRow(req.params.id, seq)
    if (!section) {
      res.status(404).json({ error: '没有找到这个模块' })
      return
    }
    const optionId = clampString(asRecord(req.body).optionId, 40)
    const options = parseJson<ConsultModuleOption[]>(section.options_json, [])
    const option = options.find((item) => item.id === optionId)
    if (!option) {
      res.status(400).json({ error: '先选择一个打法，再重写本模块' })
      return
    }
    const input = purposeInputFromRow(row)
    const modules = buildModulesFromPlan(input.plan)
    const module = moduleForSection(sectionFromRow(section, true), modules, seq - 1)
    const previous = readRunSections(req.params.id, true)
      .filter((item) => item.seq < seq && item.status === 'ready' && item.content.trim())
      .at(-1)
    const beats = await composePurposeModuleBeats(
      input,
      module,
      option,
      previous?.content.slice(-1200) ?? '',
      purposeFeedbackText(input.purposeTemplate.id, module.purposeKeys)
    )
    const content = beatsToText(beats)
    db.prepare(
      `UPDATE consult_run_sections
       SET status = 'ready', error = '', content = ?, selected_option_id = ?, beats_json = ?,
           edited = 1, updated_at = ?
       WHERE run_id = ? AND seq = ?`
    ).run(content, option.id, JSON.stringify(beats), now(), req.params.id, seq)
    rebuildRunOutput(req.params.id)
    markRunReadyIfComplete(req.params.id)
    res.json({ run: readRun(req.params.id) })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '重写模块失败' })
  }
})

// 整个模块重新给三种打法。适合咨询师觉得三种都不对，或者学生情况变了的时候。
runsRouter.post('/runs/:id/sections/:seq/regenerate', async (req, res) => {
  if (!isAiConfigured()) {
    res.status(503).json({ error: '未配置 DEEPSEEK_API_KEY，暂时无法重写模块' })
    return
  }
  try {
    const row = db.prepare('SELECT * FROM consult_runs WHERE id = ?').get(req.params.id) as
      | ConsultRunRow
      | undefined
    if (!row) {
      res.status(404).json({ error: '没有找到这次生成记录' })
      return
    }
    const seq = sectionSeqParam(req.params.seq)
    const section = readSectionRow(req.params.id, seq)
    if (!section) {
      res.status(404).json({ error: '没有找到这个模块' })
      return
    }
    const input = purposeInputFromRow(row)
    const modules = buildModulesFromPlan(input.plan)
    const module = moduleForSection(sectionFromRow(section, true), modules, seq - 1)
    const previous = readRunSections(req.params.id, true)
      .filter((item) => item.seq < seq && item.status === 'ready' && item.content.trim())
      .at(-1)
    const result = await planPurposeModuleDraft(
      input,
      module,
      previous?.content.slice(-1200) ?? '',
      purposeFeedbackText(input.purposeTemplate.id, module.purposeKeys)
    )
    const content = beatsToText(result.beats)
    db.prepare(
      `UPDATE consult_run_sections
       SET status = 'ready', error = '', content = ?, options_json = ?, selected_option_id = ?,
           beats_json = ?, edited = 0, updated_at = ?
       WHERE run_id = ? AND seq = ?`
    ).run(
      content,
      JSON.stringify(result.options),
      result.recommendedOptionId,
      JSON.stringify(result.beats),
      now(),
      req.params.id,
      seq
    )
    rebuildRunOutput(req.params.id)
    markRunReadyIfComplete(req.params.id)
    res.json({ run: readRun(req.params.id) })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '重写模块失败' })
  }
})

runsRouter.post('/runs/:id/sections', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM consult_runs WHERE id = ?').get(req.params.id) as
      | ConsultRunRow
      | undefined
    if (!row) {
      res.status(404).json({ error: '没有找到这次生成记录' })
      return
    }
    const body = asRecord(req.body)
    const sections = readRunSections(req.params.id, true)
    const maxSeq = sections.at(-1)?.seq ?? 0
    const requested = Number(body.afterSeq)
    const afterSeq =
      Number.isInteger(requested) && requested >= 0 && requested <= maxSeq ? requested : maxSeq
    if (afterSeq < maxSeq) {
      db.prepare(
        'UPDATE consult_run_sections SET seq = -seq WHERE run_id = ? AND seq > ?'
      ).run(req.params.id, afterSeq)
      db.prepare(
        'UPDATE consult_run_sections SET seq = -seq + 1 WHERE run_id = ? AND seq < 0'
      ).run(req.params.id)
    }
    const seq = afterSeq + 1
    const title = clampString(body.title, 200) || '新模块'
    const goal = clampString(body.goal, 800)
    db.prepare(
      `INSERT INTO consult_run_sections
       (run_id, seq, title, goal, content, status, error, target_chars, purpose_keys,
        module_id, options_json, selected_option_id, beats_json, notes, edited, updated_at)
       VALUES (?, ?, ?, ?, '', 'ready', '', 0, '[]', ?, '[]', '', '[]', '', 0, ?)`
    ).run(req.params.id, seq, title, goal, newId('module'), now())
    rebuildRunOutput(req.params.id)
    markRunReadyIfComplete(req.params.id)
    res.status(201).json({ run: readRun(req.params.id) })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '新增模块失败' })
  }
})

runsRouter.delete('/runs/:id/sections/:seq', (req, res) => {
  try {
    const seq = sectionSeqParam(req.params.seq)
    const run = db.prepare('SELECT id FROM consult_runs WHERE id = ?').get(req.params.id)
    if (!run) {
      res.status(404).json({ error: '没有找到这次生成记录' })
      return
    }
    const section = readSectionRow(req.params.id, seq)
    if (!section) {
      res.status(404).json({ error: '没有找到这个模块' })
      return
    }
    db.prepare('DELETE FROM consult_run_sections WHERE run_id = ? AND seq = ?').run(
      req.params.id,
      seq
    )
    db.prepare(
      'UPDATE consult_run_sections SET seq = -seq WHERE run_id = ? AND seq > ?'
    ).run(req.params.id, seq)
    db.prepare(
      'UPDATE consult_run_sections SET seq = -seq - 1 WHERE run_id = ? AND seq < 0'
    ).run(req.params.id)
    rebuildRunOutput(req.params.id)
    markRunReadyIfComplete(req.params.id)
    res.json({ run: readRun(req.params.id) })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '删除模块失败' })
  }
})

runsRouter.post('/runs/:id/retry', (req, res) => {
  if (!isAiConfigured()) {
    res.status(503).json({ error: '未配置 DEEPSEEK_API_KEY，暂时无法生成咨询稿' })
    return
  }
  const row = db.prepare('SELECT * FROM consult_runs WHERE id = ?').get(req.params.id) as
    | ConsultRunRow
    | undefined
  if (!row) {
    res.status(404).json({ error: '没有找到这次生成记录' })
    return
  }
  if (row.status !== 'failed') {
    res.status(409).json({ error: '只有失败的生成记录可以重试' })
    return
  }
  const retryAt = now()
  db.prepare("UPDATE consult_runs SET status = 'queued', error = '', updated_at = ? WHERE id = ?").run(
    retryAt,
    req.params.id
  )
  db.prepare(
    "UPDATE consult_run_sections SET status = 'pending', error = '', updated_at = ? WHERE run_id = ? AND status = 'failed'"
  ).run(retryAt, req.params.id)
  startConsultJob(req.params.id)
  res.status(202).json({ run: readRun(req.params.id) })
})

runsRouter.patch('/runs/:id/outcome', (req, res) => {
  const row = db.prepare('SELECT * FROM consult_runs WHERE id = ?').get(req.params.id) as
    | ConsultRunRow
    | undefined
  if (!row) {
    res.status(404).json({ error: '没有找到这次生成记录' })
    return
  }
  if (row.outcome) {
    res.status(409).json({ error: '这次结果已经记录过反馈' })
    return
  }
  const outcome = clampString(req.body?.outcome, 20) as ConsultOutcome
  if (!OUTCOMES.has(outcome)) {
    res.status(400).json({ error: '反馈类型不对' })
    return
  }
  const run = runFromRow(row)
  if (run.mode === 'purpose') {
    // 目的树改动的是“这个目的在这次学生状态里有没有效果”，不回写逐句森林。
    const templateId = run.purposeTemplateId || run.purposePath?.templateId || ''
    const feedbackAt = now()
    const upsert = db.prepare(
      `INSERT INTO consult_purpose_feedback
       (template_id, purpose_key, selected, won, lost, liked, updated_at)
       VALUES (?, ?, 1, ?, ?, ?, ?)
       ON CONFLICT(template_id, purpose_key) DO UPDATE SET
         selected = selected + 1,
         won = won + excluded.won,
         lost = lost + excluded.lost,
         liked = liked + excluded.liked,
         updated_at = excluded.updated_at`
    )
    const won = outcome === 'won' ? 1 : 0
    const lost = outcome === 'lost' || outcome === 'abandoned' ? 1 : 0
    const liked = outcome === 'liked' ? 1 : 0
    for (const item of run.purposePath?.items ?? []) {
      upsert.run(templateId, item.purposeKey, won, lost, liked, feedbackAt)
    }
    db.prepare(
      'UPDATE consult_runs SET outcome = ?, outcome_node_id = ?, outcome_at = ? WHERE id = ?'
    ).run(outcome, '', feedbackAt, req.params.id)
    res.json({ ok: true, run: readRun(req.params.id), outcome, outcomeNodeId: '' })
    return
  }
  const pathIds = new Set(run.path.map((item) => item.id))
  const requestedNodeId = clampString(req.body?.nodeId, 100)
  const targetNodeId = pathIds.has(requestedNodeId) ? requestedNodeId : run.path.at(-1)?.id ?? ''
  const forest = readForest()

  if (outcome === 'won' || outcome === 'lost') {
    for (const item of run.path) {
      updateConsultNodesById(forest.trees, item.id, (node) => {
        if (outcome === 'won') node.reward = Math.round((node.reward + 1) * 1000) / 1000
        else node.penalty = Math.round((node.penalty + 1) * 1000) / 1000
      })
    }
  } else if (outcome === 'liked') {
    const last = run.path.at(-1)
    if (last) {
      updateConsultNodesById(forest.trees, last.id, (node) => {
        node.reward = Math.round((node.reward + 0.5) * 1000) / 1000
      })
    }
  } else if (outcome === 'abandoned') {
    if (targetNodeId) {
      updateConsultNodesById(forest.trees, targetNodeId, (node) => {
        node.penalty = Math.round((node.penalty + 0.5) * 1000) / 1000
      })
    }
  }

  for (const tree of forest.trees) tree.updatedAt = now()
  writeForest(forest)
  db.prepare(
    'UPDATE consult_runs SET outcome = ?, outcome_node_id = ?, outcome_at = ? WHERE id = ?'
  ).run(outcome, targetNodeId, now(), req.params.id)
  res.json({
    ok: true,
    tree: activeTree(forest),
    trees: forest.trees,
    forest,
    outcome,
    outcomeNodeId: targetNodeId
  })
})
