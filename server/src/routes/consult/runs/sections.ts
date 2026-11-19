import type { Request, Response } from 'express'
import type {
  ConsultBeat,
  ConsultModuleOption
} from '../../../../../shared/src/consult'
import { buildModulesFromPlan } from '../../../consult-modules'
import { db, newId, now } from '../../../db'
import { isAiConfigured } from '../../../ai/generate'
import { beatsToText, composePurposeModuleBeats, planPurposeModuleDraft } from '../../../ai/purpose-module'
import { clampString, parseJson } from '../../../util'
import { asRecord } from '../shared'
import {
  markRunReadyIfComplete,
  moduleForSection,
  purposeFeedbackText,
  purposeInputFromRow,
  readRun,
  readRunSections,
  readSectionRow,
  rebuildRunOutput,
  sanitizeBeats,
  sectionFromRow,
  sectionSeqParam,
  type ConsultRunRow
} from './shared'

export function patchSection(req: Request, res: Response): void {
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
}

// 换一种打法：保留三种选择，只按选中的那一种重新写节拍。
export async function rewriteBeats(req: Request, res: Response): Promise<void> {
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
}

// 整个模块重新给三种打法。适合咨询师觉得三种都不对，或者学生情况变了的时候。
export async function regenerateSection(req: Request, res: Response): Promise<void> {
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
}

export function addSection(req: Request, res: Response): void {
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
}

export function deleteSection(req: Request, res: Response): void {
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
}
