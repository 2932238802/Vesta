import type { ConsultContext } from '../../../shared/src/consult'
import type {
  ConsultPurposeExample,
  ConsultPurposeNode,
  ConsultPurposePayload,
  ConsultPurposePlan,
  ConsultPurposePlanItem,
  ConsultPurposeTemplate
} from '../../../shared/src/consult-purpose'
import { askDeepSeek, parseJsonObject } from './deepseek'

interface FlatPurpose {
  node: ConsultPurposeNode
  stageId: string
  stageLabel: string
  order: number
  optionalAncestors: string[]
}

const STOP_WORDS = new Set([
  '如果',
  '她说',
  '要问',
  '时候',
  '这个',
  '那个',
  '可以',
  '已经',
  '觉得',
  '打算',
  '想要',
  '怎么',
  '什么',
  '就是',
  '还是',
  '或者',
  '因为',
  '所以',
  '但是',
  '然后'
])

function bigrams(text: string): Set<string> {
  const result = new Set<string>()
  for (const run of text.match(/[一-龥]{2,}/g) ?? []) {
    for (let index = 0; index < run.length - 1; index += 1) {
      const token = run.slice(index, index + 2)
      if (!STOP_WORDS.has(token)) result.add(token)
    }
  }
  return result
}

function contextText(context: ConsultContext): string {
  return [context.name, context.tags?.join(' '), context.mentions, context.profile, context.conversation]
    .filter(Boolean)
    .join('\n')
}

export function findPurposeTemplate(
  payload: ConsultPurposePayload,
  templateId: string
): ConsultPurposeTemplate {
  const template =
    payload.templates.find((item) => item.id === templateId) ??
    payload.templates.find((item) => item.id === payload.meta.activeTemplateId) ??
    payload.templates[0]
  if (!template) throw new Error('咨询树还没有可用模板')
  return template
}

// 按树的顺序摊平目的节点。分组节点只用来承载子目的，不单独进入写作路径。
export function flattenPurposeTree(tree: ConsultPurposeNode): FlatPurpose[] {
  const list: FlatPurpose[] = []
  let order = 0
  const walk = (
    node: ConsultPurposeNode,
    stage: { id: string; label: string },
    optionalAncestors: string[]
  ) => {
    for (const child of node.children ?? []) {
      if (child.kind === 'stage') {
        walk(child, { id: child.id, label: child.label }, [])
        continue
      }
      if (child.kind !== 'purpose') {
        walk(child, stage, optionalAncestors)
        continue
      }
      if (!child.group) {
        list.push({
          node: child,
          stageId: stage.id,
          stageLabel: stage.label,
          order,
          optionalAncestors
        })
        order += 1
      }
      const key = child.purposeKey ?? child.id
      walk(child, stage, child.optional ? [...optionalAncestors, key] : optionalAncestors)
    }
  }
  walk(tree, { id: 'stage.root', label: '通用' }, [])
  return list
}

function planItem(flat: FlatPurpose, reason: string): ConsultPurposePlanItem {
  return {
    stageId: flat.stageId,
    stageLabel: flat.stageLabel,
    purposeKey: flat.node.purposeKey ?? flat.node.id,
    label: flat.node.label,
    summary: flat.node.summary,
    branchCondition: flat.node.branchCondition ?? '',
    optional: Boolean(flat.node.optional),
    reason
  }
}

function optionalOutline(flat: FlatPurpose[]): string {
  return flat
    .filter((item) => item.node.optional)
    .map(
      (item) =>
        `${item.node.purposeKey ?? item.node.id}｜${item.node.label}｜${
          item.node.branchCondition || '没有写明条件'
        }｜${item.node.summary}`
    )
    .join('\n')
}

interface OptionalChoice {
  purposeKey?: unknown
  reason?: unknown
}

async function chooseOptionalWithAi(
  flat: FlatPurpose[],
  context: ConsultContext
): Promise<Map<string, string> | null> {
  const outline = optionalOutline(flat)
  if (!outline.trim()) return new Map()
  const systemPrompt = `你是资深职业咨询师。请判断这份咨询稿需要进入哪些“可选支线”。

规则：
1. 只能从给出的可选支线里选择，不能新增。
2. 只有在学生状态里有明确依据时才选择；没有依据就不选，不要为了讲全而全选。
3. 每个选择都要给出依据，依据必须引用学生已经说过的情况，不能编造。
4. 只输出 JSON：{"include":[{"purposeKey":"...","reason":"..."}]}`

  const userPrompt = `【学生状态】
${contextText(context) || '没有补充信息。'}

【可选支线】
${outline}

请输出需要进入的可选支线 JSON。`

  try {
    const output = await askDeepSeek(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { json: true, temperature: 0.2, maxTokens: 1600 }
    )
    const parsed = parseJsonObject(output) as { include?: OptionalChoice[] }
    const allowed = new Set(
      flat.filter((item) => item.node.optional).map((item) => item.node.purposeKey ?? item.node.id)
    )
    const selected = new Map<string, string>()
    for (const choice of Array.isArray(parsed.include) ? parsed.include : []) {
      const key = typeof choice.purposeKey === 'string' ? choice.purposeKey.trim() : ''
      if (!key || !allowed.has(key) || selected.has(key)) continue
      const reason = typeof choice.reason === 'string' ? choice.reason.trim().slice(0, 240) : ''
      selected.set(key, reason)
    }
    return selected
  } catch {
    return null
  }
}

// AI 不可用时，用分支条件里的关键词做一次保守兜底。
// 只有写明分支条件的目的才参与兜底；条件没写的可选支线无法判断，宁可不选。
function conditionSegments(condition: string): string[] {
  return condition
    .split(/[/、，,。；;：:\s]+/)
    .map((segment) =>
      segment
        .replace(/^(?:如果)?(?:她|他|学生)?(?:说|问|觉得|担心|表示|提到)?[：:，,]?/, '')
        .trim()
    )
    .filter((segment) => segment.length >= 2 && !STOP_WORDS.has(segment))
}

function chooseOptionalByKeywords(
  flat: FlatPurpose[],
  context: ConsultContext
): Map<string, string> {
  const text = contextText(context)
  const student = bigrams(text)
  const selected = new Map<string, string>()
  if (!student.size) return selected
  for (const item of flat) {
    if (!item.node.optional) continue
    const condition = (item.node.branchCondition ?? '').trim()
    if (!condition) continue
    for (const segment of conditionSegments(condition)) {
      const segmentBigrams = bigrams(segment)
      let hits = 0
      for (const token of segmentBigrams) if (student.has(token)) hits += 1
      const matched =
        segment.length <= 8
          ? text.includes(segment)
          : hits >= Math.max(2, Math.ceil(segmentBigrams.size * 0.5))
      if (matched) {
        selected.set(
          item.node.purposeKey ?? item.node.id,
          `分支条件命中学生情况里的“${segment}”`
        )
        break
      }
    }
  }
  return selected
}

export async function buildPurposePlan(
  payload: ConsultPurposePayload,
  templateId: string,
  context: ConsultContext
): Promise<ConsultPurposePlan> {
  const template = findPurposeTemplate(payload, templateId)
  const flat = flattenPurposeTree(template.tree)
  const aiChoice = await chooseOptionalWithAi(flat, context)
  const selected = aiChoice ?? chooseOptionalByKeywords(flat, context)

  const items: ConsultPurposePlanItem[] = []
  for (const item of flat) {
    const key = item.node.purposeKey ?? item.node.id
    if (item.optionalAncestors.some((ancestor) => !selected.has(ancestor))) continue
    if (item.node.optional) {
      const reason = selected.get(key)
      if (!selected.has(key)) continue
      items.push(planItem(item, reason ?? ''))
      continue
    }
    items.push(planItem(item, ''))
  }

  return {
    templateId: template.id,
    templateName: template.name,
    season: template.season,
    generatedAt: new Date().toISOString(),
    items
  }
}

function exampleScore(example: ConsultPurposeExample, student: Set<string>): number {
  const own = bigrams(`${example.note} ${example.sourceLabel}`)
  let hits = 0
  for (const token of own) if (student.has(token)) hits += 1
  return hits
}

// 同一目的常常有多篇稿子的说法。优先保留来源不同的示例，避免整段参考都来自同一个人。
export function pickExamples(
  node: ConsultPurposeNode,
  context: ConsultContext,
  limit = 3
): ConsultPurposeExample[] {
  if (!node.examples.length || limit <= 0) return []
  const student = bigrams(contextText(context))
  const ranked = node.examples
    .map((example, index) => ({ example, index, score: exampleScore(example, student) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)

  const picked: ConsultPurposeExample[] = []
  const sources = new Set<string>()
  for (const item of ranked) {
    if (sources.has(item.example.source)) continue
    sources.add(item.example.source)
    picked.push(item.example)
    if (picked.length >= limit) return picked
  }
  for (const item of ranked) {
    if (picked.includes(item.example)) continue
    picked.push(item.example)
    if (picked.length >= limit) break
  }
  return picked
}

export function purposeItemByKey(plan: ConsultPurposePlan, key: string): ConsultPurposePlanItem | null {
  return plan.items.find((item) => item.purposeKey === key) ?? null
}
