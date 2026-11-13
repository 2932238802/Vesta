import { Router } from 'express'
import { consultNodeCount } from '../../../../shared/src/consult'
import type { ConsultPurposePayload } from '../../../../shared/src/consult-purpose'
import { config } from '../../env'
import { db } from '../../db'
import { isAiConfigured } from '../../ai/generate'
import { readActiveTemplateId, readPurposePayload, readScoring, readTemplates } from './shared'
import { activeTree, readForest } from './forest'

export const treesRouter = Router()

// 只保留工作台读取接口。树的新建 / 重命名 / 切换 / 删除、评分、预览、导入、
// 衰减与咨询模板写接口在 web/src 中已无消费方，按 v1.75 死接口清理移除。
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
