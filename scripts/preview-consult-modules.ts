import fs from 'node:fs'
import path from 'node:path'
import { buildModulesFromPlan } from '../server/src/consult-modules'
import { findPurposeTemplate, flattenPurposeTree } from '../server/src/ai/purpose'
import type {
  ConsultPurposePayload,
  ConsultPurposePlan,
  ConsultPurposePlanItem
} from '../shared/src/consult-purpose'

// 不依赖 AI 的模块切分预览：把选中的可选支线传进来，看一通电话会被切成哪些对话模块。
// 用法：npx tsx scripts/preview-consult-modules.ts

const payload = JSON.parse(
  fs.readFileSync(path.resolve('shared/src/consult-purpose-data.json'), 'utf8')
) as ConsultPurposePayload
const template = findPurposeTemplate(payload, payload.meta.activeTemplateId)
const flat = flattenPurposeTree(template.tree)

function makePlan(selectedOptional: string[], label: string): ConsultPurposePlan {
  const selected = new Set(selectedOptional)
  const items: ConsultPurposePlanItem[] = []
  for (const entry of flat) {
    const key = entry.node.purposeKey ?? entry.node.id
    const blocked = entry.optionalAncestors.some((ancestor) => !selected.has(ancestor))
    if (blocked) continue
    if (entry.node.optional && !selected.has(key)) continue
    items.push({
      stageId: entry.stageId,
      stageLabel: entry.stageLabel,
      purposeKey: key,
      label: entry.node.label,
      summary: entry.node.summary,
      branchCondition: entry.node.branchCondition ?? '',
      optional: Boolean(entry.node.optional),
      reason: selected.has(key) ? `预览中手动选中：${label}` : ''
    })
  }
  return {
    templateId: template.id,
    templateName: template.name,
    season: template.season,
    generatedAt: new Date().toISOString(),
    items
  }
}

const scenarios: Array<{ label: string; selected: string[] }> = [
  {
    label: '大一 · 7 月 · 基本线',
    selected: []
  },
  {
    label: '大二 · 家庭预算 + 考研 + 就业焦虑',
    selected: [
      'diag.money',
      'diag.major',
      'window.cases',
      'window.job.outcome',
      'window.job.reality',
      'window.job.resume',
      'filter.track.four-paths',
      'filter.track.her-plan',
      'filter.competition.why',
      'filter.competition.types',
      'filter.competition.choose',
      'offer.self-study',
      'offer.close.price',
      'offer.close.parents',
      'offer.close.hesitation',
      'offer.close.enroll',
      'offer.close.followup'
    ]
  }
]

for (const scenario of scenarios) {
  const plan = makePlan(scenario.selected, scenario.label)
  const modules = buildModulesFromPlan(plan)
  console.log(`\n=== ${scenario.label} ===`)
  console.log(`目的 ${plan.items.length} 个 → 模块 ${modules.length} 个\n`)
  for (const [index, module] of modules.entries()) {
    console.log(`${String(index + 1).padStart(2, '0')}. ${module.label}  [${module.stageLabel}]`)
    console.log(`    ${module.purposeKeys.join(', ')}`)
  }
}
