import {
  defaultConsultTemplate,
  type ConsultContext,
  type ConsultRunSection
} from '../../../../../shared/src/consult'
import type { ConsultPurposePlan } from '../../../../../shared/src/consult-purpose'
import { buildModulesFromPlan } from '../../../consult-modules'
import { db, now } from '../../../db'
import { buildConsultDocument } from '../../../ai/consult'
import { buildPurposePlan, findPurposeTemplate } from '../../../ai/purpose'
import {
  composePurposeChapter,
  planPurposeChapters,
  type PurposeChapterPlan,
  type PurposeChapterResult
} from '../../../ai/purpose-consult'
import { beatsToText, planPurposeModuleDraft } from '../../../ai/purpose-module'
import { log } from '../../../log'
import { parseJson } from '../../../util'
import { DEFAULT_TARGET_LENGTH, readPurposePayload, readTemplates } from '../shared'
import {
  chapterSummary,
  moduleForSection,
  purposeFeedbackText,
  readRunSections,
  readyDocumentSections,
  setRunReady,
  setRunRunning,
  type ConsultRunRow
} from './shared'

export async function runPurposeConsultJob(row: ConsultRunRow): Promise<void> {
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
