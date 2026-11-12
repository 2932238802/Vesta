import { Router } from 'express'
import {
  chooseConsultForestPath,
  consultNodeCount,
  createEmptyConsultTree,
  defaultConsultTemplate,
  updateConsultNodesById,
  type ConsultNode
} from '../../../../shared/src/consult'
import type { ConsultPurposePayload } from '../../../../shared/src/consult-purpose'
import { config } from '../../env'
import { db, getSetting, newId, now, setSetting } from '../../db'
import { isAiConfigured } from '../../ai/generate'
import { clampString } from '../../util'
import {
  ACTIVE_TEMPLATE_KEY,
  BUILT_IN_TEMPLATE_IDS,
  asRecord,
  contextForDecision,
  finiteNumber,
  readActiveTemplateId,
  readCustomTemplates,
  readPurposePayload,
  readScoring,
  readTemplates,
  sanitizeScoring,
  sanitizeTemplate,
  sanitizeTree,
  writeCustomTemplates,
  writeScoring
} from './shared'
import { activeTree, addAnswerHistory, findNode, importPaths, readForest, writeForest, writeTree } from './forest'

export const treesRouter = Router()

treesRouter.get('/', (req, res) => {
  const forest = readForest()
  const tree = activeTree(forest)
  const templates = readTemplates()
  const runCount = (db.prepare('SELECT COUNT(*) AS count FROM consult_runs').get() as { count: number })
    .count
  let purposeTemplates: Array<{
    id: string
    name: string
    season: string
    description: string
    stats: ConsultPurposePayload['templates'][number]['stats']
  }> = []
  let activePurposeTemplateId = ''
  try {
    const payload = readPurposePayload()
    activePurposeTemplateId = payload.meta.activeTemplateId
    purposeTemplates = payload.templates.map((item) => ({
      id: item.id,
      name: item.name,
      season: item.season,
      description: item.description,
      stats: item.stats
    }))
  } catch {
    // 目的树数据还没生成时，工作台仍可以展示旧的逐句树内容。
  }
  res.json({
    forest,
    tree,
    trees: forest.trees,
    templates,
    activeTemplateId: readActiveTemplateId(templates),
    purposeTemplates,
    activePurposeTemplateId,
    scoring: readScoring(),
    ai: { configured: isAiConfigured(), model: config.deepseekModel },
    stats: {
      nodes: forest.trees.reduce((sum, item) => sum + consultNodeCount(item.root), 0),
      runs: runCount
    }
  })
})

treesRouter.put('/tree', (req, res) => {
  try {
    const tree = sanitizeTree(req.body?.tree)
    const forest = writeTree(tree)
    res.json({ tree: activeTree(forest), trees: forest.trees, forest })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '咨询树格式不对' })
  }
})

treesRouter.post('/trees', (req, res) => {
  const name = clampString(req.body?.name, 60) || `咨询树 ${readForest().trees.length + 1}`
  const forest = readForest()
  if (forest.trees.length >= 200) {
    res.status(400).json({ error: '最多支持 200 棵咨询树' })
    return
  }
  const tree = createEmptyConsultTree(name)
  forest.trees.push(tree)
  forest.activeTreeId = tree.id
  writeForest(forest)
  res.json({ tree, trees: forest.trees, forest })
})

treesRouter.put('/trees/:id', (req, res) => {
  const forest = readForest()
  const tree = forest.trees.find((item) => item.id === req.params.id)
  if (!tree) {
    res.status(404).json({ error: '没有找到这棵咨询树' })
    return
  }
  const name = clampString(req.body?.name, 60)
  if (!name) {
    res.status(400).json({ error: '咨询树名称不能为空' })
    return
  }
  tree.name = name
  tree.updatedAt = now()
  writeForest(forest)
  res.json({ tree, trees: forest.trees, forest })
})

treesRouter.put('/trees/:id/active', (req, res) => {
  const forest = readForest()
  if (!forest.trees.some((item) => item.id === req.params.id)) {
    res.status(404).json({ error: '没有找到这棵咨询树' })
    return
  }
  forest.activeTreeId = req.params.id
  writeForest(forest)
  res.json({ tree: activeTree(forest), trees: forest.trees, forest })
})

treesRouter.delete('/trees/:id', (req, res) => {
  const forest = readForest()
  if (forest.trees.length <= 1) {
    res.status(400).json({ error: '至少保留一棵咨询树' })
    return
  }
  const index = forest.trees.findIndex((item) => item.id === req.params.id)
  if (index < 0) {
    res.status(404).json({ error: '没有找到这棵咨询树' })
    return
  }
  forest.trees.splice(index, 1)
  if (forest.activeTreeId === req.params.id) forest.activeTreeId = forest.trees[0].id
  writeForest(forest)
  res.json({ tree: activeTree(forest), trees: forest.trees, forest })
})

treesRouter.put('/scoring', (req, res) => {
  const scoring = sanitizeScoring(req.body)
  writeScoring(scoring)
  res.json({ scoring })
})

treesRouter.post('/preview', (req, res) => {
  const context = contextForDecision(req.body)
  try {
    const decision = chooseConsultForestPath(readForest(), context, readScoring())
    res.json({ decision })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '还没有可用咨询路径' })
  }
})

treesRouter.post('/import', (req, res) => {
  const text = clampString(req.body?.text, 120_000)
  if (!text.trim()) {
    res.status(400).json({ error: '请先粘贴优秀咨询稿路径' })
    return
  }
  const forest = readForest()
  const targetId = clampString(req.body?.treeId, 100)
  const newTreeName = clampString(req.body?.newTreeName, 60)
  let tree = newTreeName
    ? undefined
    : targetId
      ? forest.trees.find((item) => item.id === targetId)
      : activeTree(forest)
  if (!tree) {
    const name = newTreeName || `导入咨询树 ${forest.trees.length + 1}`
    tree = createEmptyConsultTree(name)
    forest.trees.push(tree)
  }
  const result = importPaths(tree, text)
  if (result.imported === 0) {
    res.status(400).json({ error: '没有识别到可用路径' })
    return
  }
  forest.activeTreeId = tree.id
  writeForest(forest)
  res.json({ tree: activeTree(forest), trees: forest.trees, forest, imported: result.imported, answers: result.answers })
})

treesRouter.post('/decay', (req, res) => {
  const factor = finiteNumber(req.body?.factor, 0.9, 0.5, 0.99)
  const forest = readForest()
  const visit = (node: ConsultNode) => {
    node.reward = Math.round(node.reward * factor * 1000) / 1000
    node.penalty = Math.round(node.penalty * factor * 1000) / 1000
    for (const child of node.children) visit(child)
  }
  for (const tree of forest.trees) {
    visit(tree.root)
    tree.updatedAt = now()
  }
  writeForest(forest)
  res.json({ tree: activeTree(forest), trees: forest.trees, forest, factor })
})

treesRouter.post('/templates', (req, res) => {
  const name = clampString(req.body?.name, 60)
  if (!name) {
    res.status(400).json({ error: '请填写模板名称' })
    return
  }
  const sourceId = clampString(req.body?.sourceId, 100) || defaultConsultTemplate.id
  const source = readTemplates().find((template) => template.id === sourceId) ?? defaultConsultTemplate
  try {
    const template = sanitizeTemplate(
      {
        ...source,
        id: newId('consult_tpl'),
        name,
        builtIn: false,
        createdAt: now(),
        updatedAt: now()
      },
      false
    )
    const custom = readCustomTemplates()
    custom.push(template)
    writeCustomTemplates(custom)
    res.json({ template })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '模板格式不对' })
  }
})

treesRouter.put('/templates/active', (req, res) => {
  const id = clampString(req.body?.id, 100)
  if (!readTemplates().some((template) => template.id === id)) {
    res.status(404).json({ error: '没有找到这个模板' })
    return
  }
  setSetting(ACTIVE_TEMPLATE_KEY, id)
  res.json({ activeTemplateId: id })
})

treesRouter.put('/templates/:id', (req, res) => {
  if (BUILT_IN_TEMPLATE_IDS.has(req.params.id)) {
    res.status(403).json({ error: '系统默认框架不能修改，请复制一份再改' })
    return
  }
  const custom = readCustomTemplates()
  const index = custom.findIndex((template) => template.id === req.params.id)
  if (index < 0) {
    res.status(404).json({ error: '没有找到这个模板' })
    return
  }
  try {
    const template = sanitizeTemplate(
      { ...asRecord(req.body?.template), id: req.params.id, createdAt: custom[index].createdAt },
      false
    )
    custom[index] = template
    writeCustomTemplates(custom)
    res.json({ template })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '模板格式不对' })
  }
})

treesRouter.delete('/templates/:id', (req, res) => {
  if (BUILT_IN_TEMPLATE_IDS.has(req.params.id)) {
    res.status(403).json({ error: '系统默认框架不能删除' })
    return
  }
  const custom = readCustomTemplates()
  const next = custom.filter((template) => template.id !== req.params.id)
  if (next.length === custom.length) {
    res.status(404).json({ error: '没有找到这个模板' })
    return
  }
  writeCustomTemplates(next)
  if (getSetting(ACTIVE_TEMPLATE_KEY) === req.params.id) {
    setSetting(ACTIVE_TEMPLATE_KEY, defaultConsultTemplate.id)
  }
  res.json({ ok: true })
})
