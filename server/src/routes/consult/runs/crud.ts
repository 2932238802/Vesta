import type { Request, Response } from 'express'
import {
  chooseConsultForestPath,
  defaultConsultTemplate,
  updateConsultNodesById,
  type ConsultOutcome,
  type ConsultRun
} from '../../../../../shared/src/consult'
import { db, newId, now } from '../../../db'
import { isAiConfigured } from '../../../ai/generate'
import { findPurposeTemplate } from '../../../ai/purpose'
import { clampString } from '../../../util'
import {
  OUTCOMES,
  asRecord,
  readActiveTemplateId,
  readPurposePayload,
  readScoring,
  readTemplates,
  sanitizeContext,
  sanitizeTargetLength
} from '../shared'
import {
  activeTree,
  addAnswerHistory,
  findNode,
  readForest,
  writeForest
} from '../forest'
import { startConsultJob } from './jobs'
import { readRun, readRuns, runFromRow, type ConsultRunRow } from './shared'

export function listRuns(_req: Request, res: Response): void {
  res.json({ runs: readRuns(60) })
}

export function createRun(req: Request, res: Response): void {
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
}

export function getRun(req: Request, res: Response): void {
  const run = readRun(req.params.id)
  if (!run) {
    res.status(404).json({ error: '没有找到这次生成记录' })
    return
  }
  res.json({ run })
}

export function retryRun(req: Request, res: Response): void {
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
}

export function updateRunOutcome(req: Request, res: Response): void {
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
}
