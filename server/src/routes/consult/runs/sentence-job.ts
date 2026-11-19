import type { ConsultContext, ConsultRun } from '../../../../../shared/src/consult'
import {
  buildConsultDocument,
  composeConsultChapter,
  planConsultOutline,
  type ComposeConsultInput,
  type ConsultChapterPlan,
  type ConsultChapterResult
} from '../../../ai/consult'
import { db, now } from '../../../db'
import { log } from '../../../log'
import { parseJson } from '../../../util'
import { DEFAULT_TARGET_LENGTH, readTemplates } from '../shared'
import { readForest, treeForPath } from '../forest'
import {
  chapterSummary,
  readRunSections,
  setRunReady,
  setRunRunning,
  type ConsultRunRow
} from './shared'

export async function runSentenceConsultJob(row: ConsultRunRow): Promise<void> {
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
