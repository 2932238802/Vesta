import {
  defaultConsultTemplate,
  type ConsultBeat,
  type ConsultBeatKind,
  type ConsultContext,
  type ConsultModuleOption,
  type ConsultOutcome,
  type ConsultRun,
  type ConsultRunSection,
  type ConsultRunSectionStatus,
  type ConsultRunStatus
} from '../../../../../shared/src/consult'
import type { ConsultPurposePlan } from '../../../../../shared/src/consult-purpose'
import type { ConsultModulePlan } from '../../../consult-modules'
import { db, newId, now } from '../../../db'
import { buildConsultDocument } from '../../../ai/consult'
import { findPurposeTemplate } from '../../../ai/purpose'
import type { planPurposeModuleDraft } from '../../../ai/purpose-module'
import { clampString, parseJson } from '../../../util'
import {
  DEFAULT_TARGET_LENGTH,
  asRecord,
  readPurposePayload,
  readTemplates
} from '../shared'

export interface ConsultRunRow {
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

export interface ConsultRunSectionRow {
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

export function runFromRow(row: ConsultRunRow, includeContent = false): ConsultRun {
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

export function sectionFromRow(
  row: ConsultRunSectionRow,
  includeContent = false
): ConsultRunSection {
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

export function readRunSections(runId: string, includeContent = false): ConsultRunSection[] {
  const rows = db
    .prepare('SELECT * FROM consult_run_sections WHERE run_id = ? ORDER BY seq ASC')
    .all(runId) as unknown as ConsultRunSectionRow[]
  return rows.map((row) => sectionFromRow(row, includeContent))
}

export function readRun(id: string, includeContent = true): ConsultRun | null {
  const row = db.prepare('SELECT * FROM consult_runs WHERE id = ?').get(id) as
    | ConsultRunRow
    | undefined
  return row ? runFromRow(row, includeContent) : null
}

export function readRuns(limit = 40): ConsultRun[] {
  const rows = db
    .prepare('SELECT * FROM consult_runs ORDER BY created_at DESC LIMIT ?')
    .all(Math.min(100, Math.max(1, limit))) as unknown as ConsultRunRow[]
  return rows.map((row) => runFromRow(row, false))
}

export function markStaleConsultJobs(): void {
  const staleAt = now()
  const message = '服务器在生成过程中重新启动，这次生成没有完成。可以点击重试继续。'
  db.prepare(
    "UPDATE consult_runs SET status = 'failed', error = ?, updated_at = ?, finished_at = ? WHERE status IN ('queued', 'running')"
  ).run(message, staleAt, staleAt)
  db.prepare(
    "UPDATE consult_run_sections SET status = 'failed', error = ?, updated_at = ? WHERE status = 'running'"
  ).run(message, staleAt)
}

export function chapterSummary(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim()
  if (clean.length <= 320) return clean
  return `${clean.slice(0, 220)}……${clean.slice(-80)}`
}

export function setRunRunning(runId: string): void {
  db.prepare("UPDATE consult_runs SET status = 'running', error = '', updated_at = ? WHERE id = ?").run(
    now(),
    runId
  )
}

export function setRunFailed(runId: string, message: string): void {
  const failedAt = now()
  db.prepare(
    "UPDATE consult_runs SET status = 'failed', error = ?, updated_at = ?, finished_at = ? WHERE id = ?"
  ).run(message.slice(0, 1200), failedAt, failedAt, runId)
}

export function setRunReady(runId: string, output: string): void {
  const finishedAt = now()
  db.prepare(
    "UPDATE consult_runs SET status = 'ready', error = '', output = ?, updated_at = ?, finished_at = ? WHERE id = ?"
  ).run(output, finishedAt, finishedAt, runId)
}

export function rebuildRunOutput(runId: string): string {
  const output = buildConsultDocument(readyDocumentSections(readRunSections(runId, true)))
  db.prepare('UPDATE consult_runs SET output = ?, updated_at = ? WHERE id = ?').run(
    output,
    now(),
    runId
  )
  return output
}

export function purposeInputFromRow(row: ConsultRunRow): Parameters<typeof planPurposeModuleDraft>[0] {
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
export function purposeFeedbackText(templateId: string, keys: string[]): string {
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

export function readSectionRow(runId: string, seq: number): ConsultRunSectionRow | null {
  return (db
    .prepare('SELECT * FROM consult_run_sections WHERE run_id = ? AND seq = ?')
    .get(runId, seq) ?? null) as ConsultRunSectionRow | null
}

const BEAT_KINDS = new Set<ConsultBeatKind>(['line', 'ask', 'student', 'direction', 'branch'])

export function sanitizeBeats(value: unknown): ConsultBeat[] {
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

export function readyDocumentSections(sections: ConsultRunSection[]): Array<{
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

export function moduleForSection(
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

export function sectionSeqParam(value: string): number {
  const seq = Number(value)
  if (!Number.isInteger(seq) || seq < 1) throw new Error('模块序号不对')
  return seq
}

export function markRunReadyIfComplete(runId: string): void {
  const sections = readRunSections(runId, true)
  if (!sections.length || sections.some((section) => section.status !== 'ready')) return
  db.prepare(
    "UPDATE consult_runs SET status = 'ready', error = '', finished_at = COALESCE(finished_at, ?), updated_at = ? WHERE id = ?"
  ).run(now(), now(), runId)
}
