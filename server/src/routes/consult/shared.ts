import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CONSULT_MAX_CHILDREN,
  CONSULT_MAX_DEPTH,
  CONSULT_MAX_NODES,
  builtInConsultTemplates,
  consultNodeCount,
  createEmptyConsultTree,
  defaultConsultScoring,
  defaultConsultTemplate,
  newConsultNodeId,
  syncSharedConsultNodes,
  type ConsultAnswerHistory,
  type ConsultContext,
  type ConsultForest,
  type ConsultNode,
  type ConsultNodeType,
  type ConsultOutcome,
  type ConsultScoringConfig,
  type ConsultTemplate,
  type ConsultTemplateGoal,
  type ConsultTree
} from '../../../../shared/src/consult'
import type { ConsultPurposePayload } from '../../../../shared/src/consult-purpose'
import { getSetting, newId, now, setSetting } from '../../db'
import { clampString } from '../../util'

export const FOREST_KEY = 'consult_forest'
export const FOREST_VERSION_KEY = 'consult_forest_version'
export const FOREST_SEED_KEY = 'consult_forest_seed_applied'
export const LEGACY_TREE_KEY = 'consult_tree'
export const TEMPLATES_KEY = 'consult_templates'
export const ACTIVE_TEMPLATE_KEY = 'consult_active_template'
export const SCORING_KEY = 'consult_scoring'

export const NODE_TYPES = new Set<ConsultNodeType>(['root', 'branch', 'leaf'])
export const TEMPLATE_GOALS = new Set<ConsultTemplateGoal>(['成交', '答疑', '引导', '回访'])
export const BUILT_IN_TEMPLATE_IDS = new Set(builtInConsultTemplates.map((template) => template.id))
export const OUTCOMES = new Set<ConsultOutcome>(['won', 'lost', 'liked', 'abandoned'])
export const DEFAULT_FOREST_VERSION = '5'
export const DEFAULT_TARGET_LENGTH = 30_000
export const MIN_TARGET_LENGTH = 20_000
export const MAX_TARGET_LENGTH = 40_000

// 咨询树由 prototype/consult-purpose-tree/generate.mjs 从逐字稿生成。
// 这里只读文件，页面本身不写数据库。
export const PURPOSE_DATA_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../shared/src/consult-purpose-data.json'
)
export let purposePayloadCache: ConsultPurposePayload | null = null
export let purposePayloadMtime = 0

export function readPurposePayload(): ConsultPurposePayload {
  const stat = fs.statSync(PURPOSE_DATA_FILE)
  if (!purposePayloadCache || stat.mtimeMs !== purposePayloadMtime) {
    purposePayloadCache = JSON.parse(
      fs.readFileSync(PURPOSE_DATA_FILE, 'utf8')
    ) as ConsultPurposePayload
    purposePayloadMtime = stat.mtimeMs
  }
  return purposePayloadCache
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number * 1000) / 1000))
}

export function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const tags: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const tag = item.trim().slice(0, 40)
    if (tag && !tags.includes(tag)) tags.push(tag)
    if (tags.length >= 20) break
  }
  return tags
}

export function sanitizeAnswerHistory(value: unknown): ConsultAnswerHistory[] {
  if (!Array.isArray(value)) return []
  const answers: ConsultAnswerHistory[] = []
  for (const item of value) {
    const record = asRecord(item)
    const text = clampString(record.text, 1600)
    if (!text) continue
    const source = record.source === 'import' ? 'import' : 'generation'
    answers.push({
      id: clampString(record.id, 100) || newId('consult_answer'),
      text,
      studentName: clampString(record.studentName, 80) || undefined,
      tags: cleanTags(record.tags),
      source,
      createdAt: clampString(record.createdAt, 40) || now()
    })
    if (answers.length >= 20) break
  }
  return answers
}

export function sanitizeContext(value: unknown): ConsultContext {
  const input = asRecord(value)
  return {
    name: clampString(input.name, 80),
    mentions: clampString(input.mentions, 2000),
    tags: cleanTags(input.tags),
    profile: clampString(input.profile, 20_000),
    conversation: clampString(input.conversation, 12_000)
  }
}

export function sanitizeNode(input: unknown, depth: number, ids: Set<string>): ConsultNode {
  const buildNode = (value: unknown, nodeDepth: number): ConsultNode => {
    if (nodeDepth > CONSULT_MAX_DEPTH) {
      throw new Error(`咨询树最多支持 ${CONSULT_MAX_DEPTH} 层`)
    }
    const record = asRecord(value)
    let id = clampString(record.id, 100) || newConsultNodeId()
    if (ids.has(id)) id = newConsultNodeId()
    ids.add(id)
    const text = clampString(record.text, 2000)
    const metadataInput = asRecord(record.metadata)
    const placeholder = Boolean(metadataInput.placeholder)
    if (!text && !(nodeDepth === 0 && placeholder)) throw new Error('节点文字不能为空')
    const rawType = clampString(record.type, 20) as ConsultNodeType
    const type: ConsultNodeType =
      nodeDepth === 0 ? 'root' : NODE_TYPES.has(rawType) ? rawType : 'branch'

    return {
      id,
      text,
      type: type === 'root' && nodeDepth > 0 ? 'branch' : type,
      weight: finiteNumber(record.weight, 1, 0, 1000),
      reward: finiteNumber(record.reward, 0, 0, 100_000),
      penalty: finiteNumber(record.penalty, 0, 0, 100_000),
      selectedCount: Math.round(finiteNumber(record.selectedCount, 0, 0, 100_000_000)),
      metadata: {
        sourceDocId: clampString(metadataInput.sourceDocId, 100) || undefined,
        tags: cleanTags(metadataInput.tags),
        templateId: clampString(metadataInput.templateId, 100) || undefined,
        answerHistory: sanitizeAnswerHistory(metadataInput.answerHistory),
        placeholder: placeholder || undefined
      },
      children: []
    }
  }

  const root = buildNode(input, depth)
  const stack: { value: unknown; node: ConsultNode; depth: number }[] = [
    { value: input, node: root, depth }
  ]
  while (stack.length) {
    const current = stack.pop()!
    const record = asRecord(current.value)
    const childrenInput = Array.isArray(record.children) ? record.children : []
    if (childrenInput.length > CONSULT_MAX_CHILDREN) {
      throw new Error(`单个节点最多 ${CONSULT_MAX_CHILDREN} 个子节点`)
    }
    for (const childValue of childrenInput) {
      const child = buildNode(childValue, current.depth + 1)
      current.node.children.push(child)
      stack.push({ value: childValue, node: child, depth: current.depth + 1 })
    }
  }
  return root
}

export function sanitizeTree(value: unknown): ConsultTree {
  const input = asRecord(value)
  const root = sanitizeNode(input.root, 0, new Set())
  if (consultNodeCount(root) > CONSULT_MAX_NODES) {
    throw new Error(`咨询树最多 ${CONSULT_MAX_NODES} 个节点`)
  }
  return {
    id: clampString(input.id, 100) || newId('consult_tree'),
    name: clampString(input.name, 60) || '未命名咨询树',
    root,
    updatedAt: now()
  }
}

export function sanitizeForest(value: unknown): ConsultForest {
  const input = asRecord(value)
  const treeInputs = Array.isArray(input.trees) ? input.trees.slice(0, 200) : []
  const trees: ConsultTree[] = []
  const treeIds = new Set<string>()
  for (const treeInput of treeInputs) {
    let tree = sanitizeTree(treeInput)
    if (treeIds.has(tree.id)) tree = { ...tree, id: newId('consult_tree') }
    treeIds.add(tree.id)
    trees.push(tree)
  }
  if (!trees.length) trees.push(createEmptyConsultTree('未命名咨询树'))
  syncSharedConsultNodes(trees)
  const requestedActiveId = clampString(input.activeTreeId, 100)
  const activeTreeId = trees.some((tree) => tree.id === requestedActiveId)
    ? requestedActiveId
    : trees[0].id
  return {
    id: clampString(input.id, 100) || 'consult-forest',
    trees,
    activeTreeId,
    updatedAt: now()
  }
}

export function sanitizeScoring(value: unknown): ConsultScoringConfig {
  const input = asRecord(value)
  return {
    alpha: finiteNumber(input.alpha, defaultConsultScoring.alpha, 0, 20),
    beta: finiteNumber(input.beta, defaultConsultScoring.beta, 0, 20),
    gamma: finiteNumber(input.gamma, defaultConsultScoring.gamma, 0, 20),
    epsilon: finiteNumber(input.epsilon, defaultConsultScoring.epsilon, 0, 1)
  }
}

export function sanitizeTargetLength(value: unknown): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return DEFAULT_TARGET_LENGTH
  return Math.round(
    Math.min(MAX_TARGET_LENGTH, Math.max(MIN_TARGET_LENGTH, number)) / 1000
  ) * 1000
}

export function sanitizeTemplate(value: unknown, builtIn = false): ConsultTemplate {
  const input = asRecord(value)
  const name = clampString(input.name, 60)
  if (!name) throw new Error('模板名称不能为空')
  const sectionsInput = Array.isArray(input.sections) ? input.sections : []
  if (sectionsInput.length === 0) throw new Error('模板至少需要一个段落')
  if (sectionsInput.length > 12) throw new Error('模板最多支持 12 个段落')
  const keys = new Set<string>()
  const sections = sectionsInput.map((item, index) => {
    const section = asRecord(item)
    const sectionName = clampString(section.name, 80)
    if (!sectionName) throw new Error(`第 ${index + 1} 段缺少名称`)
    let key = clampString(section.key, 60) || `section_${index + 1}`
    if (keys.has(key)) key = `${key}_${index + 1}`
    keys.add(key)
    return {
      key,
      name: sectionName,
      promptHint: clampString(section.promptHint, 1200),
      tone: clampString(section.tone, 120),
      maxLength: Math.round(finiteNumber(section.maxLength, 0, 0, 5000)) || undefined
    }
  })
  const goal = clampString(input.goal, 20) as ConsultTemplateGoal
  return {
    id: clampString(input.id, 100) || newId('consult_tpl'),
    name,
    sections,
    globalTone: clampString(input.globalTone, 1200) || defaultConsultTemplate.globalTone,
    goal: TEMPLATE_GOALS.has(goal) ? goal : '引导',
    builtIn,
    createdAt: clampString(input.createdAt, 40) || now(),
    updatedAt: now()
  }
}

export function readCustomTemplates(): ConsultTemplate[] {
  const raw = getSetting(TEMPLATES_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => sanitizeTemplate(item, false))
      .filter((template) => !BUILT_IN_TEMPLATE_IDS.has(template.id))
  } catch {
    return []
  }
}

export function writeCustomTemplates(templates: ConsultTemplate[]): void {
  setSetting(TEMPLATES_KEY, JSON.stringify(templates))
}

export function readTemplates(): ConsultTemplate[] {
  return [...builtInConsultTemplates, ...readCustomTemplates()]
}

export function readActiveTemplateId(templates: ConsultTemplate[]): string {
  const stored = getSetting(ACTIVE_TEMPLATE_KEY) ?? defaultConsultTemplate.id
  if (templates.some((template) => template.id === stored)) return stored
  setSetting(ACTIVE_TEMPLATE_KEY, defaultConsultTemplate.id)
  return defaultConsultTemplate.id
}

export function readScoring(): ConsultScoringConfig {
  const raw = getSetting(SCORING_KEY)
  if (!raw) return defaultConsultScoring
  try {
    return sanitizeScoring(JSON.parse(raw))
  } catch {
    return defaultConsultScoring
  }
}

export function writeScoring(scoring: ConsultScoringConfig): void {
  setSetting(SCORING_KEY, JSON.stringify(scoring))
}

export function contextForDecision(body: unknown): ConsultContext {
  return sanitizeContext(asRecord(body).context)
}
