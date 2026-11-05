import type { ConsultPurposePlan } from './consult-purpose'

export type ConsultNodeType = 'root' | 'branch' | 'leaf'
export type ConsultTemplateGoal = '成交' | '答疑' | '引导' | '回访'
export type ConsultAnswerSource = 'generation' | 'import'

export const CONSULT_MAX_DEPTH = 2000
export const CONSULT_MAX_NODES = 10_000
export const CONSULT_MAX_CHILDREN = 200
export const CONSULT_MAX_PATH_NODES = 2000

export interface ConsultAnswerHistory {
  id: string
  text: string
  studentName?: string
  tags: string[]
  source: ConsultAnswerSource
  createdAt: string
}

export interface ConsultNodeMetadata {
  sourceDocId?: string
  tags?: string[]
  templateId?: string
  answerHistory?: ConsultAnswerHistory[]
  // 空树占位节点，不代表任何真实咨询话术。
  placeholder?: boolean
}

export interface ConsultNode {
  id: string
  text: string
  type: ConsultNodeType
  children: ConsultNode[]
  weight: number
  reward: number
  penalty: number
  selectedCount?: number
  metadata?: ConsultNodeMetadata
}

export interface ConsultTree {
  id: string
  name: string
  root: ConsultNode
  updatedAt: string
}

export interface ConsultForest {
  id: string
  trees: ConsultTree[]
  activeTreeId: string
  updatedAt: string
}

export interface ConsultTemplateSection {
  key: string
  name: string
  promptHint: string
  tone?: string
  maxLength?: number
}

export interface ConsultTemplate {
  id: string
  name: string
  sections: ConsultTemplateSection[]
  globalTone: string
  goal: ConsultTemplateGoal
  builtIn?: boolean
  createdAt: string
  updatedAt: string
}

export interface ConsultScoringConfig {
  alpha: number
  beta: number
  gamma: number
  epsilon: number
}

export interface ConsultContext {
  name?: string
  mentions?: string
  tags?: string[]
  profile?: string
  conversation?: string
}

export interface ConsultScoreBreakdown {
  weight: number
  reward: number
  penalty: number
  contextMatch: number
  total: number
}

export interface ConsultDecisionCandidate extends ConsultScoreBreakdown {
  id: string
  text: string
  selected: boolean
}

export interface ConsultDecisionStep {
  nodeId: string
  nodeText: string
  candidates: ConsultDecisionCandidate[]
  explored: boolean
}

export interface ConsultPathItem extends ConsultScoreBreakdown {
  id: string
  text: string
  type: ConsultNodeType
}

export interface ConsultDecisionPath {
  path: ConsultPathItem[]
  steps: ConsultDecisionStep[]
  leafId: string
  treeId?: string
  treeName?: string
}

export type ConsultRunStatus = 'queued' | 'running' | 'ready' | 'failed'
export type ConsultRunSectionStatus = 'pending' | 'running' | 'ready' | 'failed'
export type ConsultOutcome = '' | 'won' | 'lost' | 'liked' | 'abandoned'
export type ConsultRunMode = 'sentence' | 'purpose'

export interface ConsultRunSection {
  seq: number
  title: string
  goal: string
  content: string
  status: ConsultRunSectionStatus
  error: string
  targetChars: number
  purposeKeys: string[]
  updatedAt: string
}

export interface ConsultRun {
  id: string
  templateId: string
  templateName: string
  mode: ConsultRunMode
  purposeTemplateId: string
  purposePath: ConsultPurposePlan | null
  context: ConsultContext
  path: ConsultPathItem[]
  steps: ConsultDecisionStep[]
  output: string
  status: ConsultRunStatus
  error: string
  outcome: ConsultOutcome
  outcomeNodeId: string
  targetLength: number
  sections: ConsultRunSection[]
  createdAt: string
  updatedAt: string
  finishedAt: string | null
  outcomeAt: string | null
}

let fallbackSequence = 0

export function newConsultNodeId(): string {
  fallbackSequence += 1
  const random = Math.random().toString(36).slice(2, 8)
  return `node_${Date.now().toString(36)}${fallbackSequence.toString(36)}${random}`
}

const DEFAULT_NOW = '2026-01-01T00:00:00.000Z'

export function createEmptyConsultTree(name = '未命名咨询树', treeId = ''): ConsultTree {
  return {
    id: treeId || `consult_tree_${newConsultNodeId()}`,
    name,
    updatedAt: DEFAULT_NOW,
    root: {
      id: newConsultNodeId(),
      text: '',
      type: 'root',
      children: [],
      weight: 1,
      reward: 0,
      penalty: 0,
      selectedCount: 0,
      metadata: { tags: [], answerHistory: [], placeholder: true }
    }
  }
}

// 旧代码仍可能引用此导出；它现在只代表一棵空树，不再包含任何预置话术。
export const defaultConsultTree: ConsultTree = createEmptyConsultTree('未导入咨询稿', 'consult-empty')

export const defaultConsultTemplate: ConsultTemplate = {
  id: 'consult-template-default',
  name: '默认咨询成文模板',
  globalTone: '克制、具体、像一位有经验的咨询师；不制造焦虑，不替对方做决定。',
  goal: '引导',
  builtIn: true,
  createdAt: DEFAULT_NOW,
  updatedAt: DEFAULT_NOW,
  sections: [
    {
      key: 'opening',
      name: '开场确认',
      promptHint: '用自己的话复述对方当前最想解决的问题，让他确认你理解的是同一件事。不要重复原句。',
      tone: '温和、直接',
      maxLength: 180
    },
    {
      key: 'diagnosis',
      name: '现状判断',
      promptHint: '结合决策路径中的关键节点，指出当前真正的卡点：是目标不清、信息不足、能力差距，还是执行节奏有问题。不要把路径简单复述成清单。',
      tone: '清楚、不评判',
      maxLength: 420
    },
    {
      key: 'path',
      name: '路径建议',
      promptHint: '把路径节点组织成一条有先后关系的建议。说明为什么先做这一步，以及暂时不做什么。',
      tone: '具体、可执行',
      maxLength: 520
    },
    {
      key: 'actions',
      name: '下一步',
      promptHint: '给出 2—3 个能在两周内开始的动作。每个动作要有产出物或可核对的结果，不要写空泛的鼓励。',
      tone: '简洁、明确',
      maxLength: 420
    },
    {
      key: 'closing',
      name: '收尾',
      promptHint: '用一句话收住，并留一个可以继续对话的问题。不要许愿，不要承诺结果。',
      tone: '平静、开放',
      maxLength: 160
    }
  ]
}

export const builtInConsultTemplates: ConsultTemplate[] = [
  defaultConsultTemplate
]

export const defaultConsultScoring: ConsultScoringConfig = {
  alpha: 1,
  beta: 0.5,
  gamma: 2,
  epsilon: 0.05
}

export function consultContextMatch(node: ConsultNode, context: ConsultContext): number {
  const tags = node.metadata?.tags ?? []
  const answerHistory = node.metadata?.answerHistory ?? []
  const contextTags = new Set((context.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))
  const haystack = [context.mentions, context.profile, context.conversation]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .join(' ')
    .toLowerCase()

  if (!tags.length && !answerHistory.length && !haystack) return 0
  let tagHits = 0
  let textHits = 0
  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase()
    if (!normalized) continue
    if (contextTags.has(normalized)) tagHits += 1
    if (haystack.includes(normalized)) textHits += 1
  }
  const tagScore = tags.length ? tagHits / tags.length : 0
  const textScore = tags.length ? textHits / tags.length : 0
  let historyScore = 0
  for (const answer of answerHistory) {
    const answerTags = answer.tags.length ? answer.tags : tags
    if (!answerTags.length) continue
    const hits = answerTags.filter((tag) => {
      const normalized = tag.trim().toLowerCase()
      return contextTags.has(normalized) || haystack.includes(normalized)
    }).length
    historyScore = Math.max(historyScore, hits / answerTags.length)
  }
  if (!answerHistory.length) {
    return Math.min(1, (tagScore * 0.4 + textScore * 0.25) / 0.65)
  }
  return Math.min(1, tagScore * 0.4 + textScore * 0.25 + historyScore * 0.35)
}

export function consultScoreNode(
  node: ConsultNode,
  context: ConsultContext,
  config: ConsultScoringConfig
): ConsultScoreBreakdown {
  const contextMatch = consultContextMatch(node, context)
  const total =
    node.weight + config.alpha * node.reward - config.beta * node.penalty + config.gamma * contextMatch
  return {
    weight: node.weight,
    reward: node.reward,
    penalty: node.penalty,
    contextMatch,
    total: Math.round(total * 1000) / 1000
  }
}

export function chooseConsultPath(
  root: ConsultNode,
  context: ConsultContext,
  config: ConsultScoringConfig,
  random: () => number = Math.random
): ConsultDecisionPath {
  const path: ConsultPathItem[] = []
  const steps: ConsultDecisionStep[] = []
  const rootScore = consultScoreNode(root, context, config)
  path.push({ id: root.id, text: root.text, type: root.type, ...rootScore })

  let current = root
  const visited = new Set<string>([root.id])
  while (current.children.length > 0 && path.length < CONSULT_MAX_PATH_NODES) {
    const candidates = current.children.map((child) => ({
      id: child.id,
      text: child.text,
      ...consultScoreNode(child, context, config),
      selected: false
    }))
    let explored = false
    let selected = candidates[0]
    if (config.epsilon > 0 && random() < config.epsilon) {
      selected = candidates[Math.floor(random() * candidates.length)] ?? candidates[0]
      explored = true
    } else {
      for (const candidate of candidates) {
        if (candidate.total > selected.total) selected = candidate
      }
    }
    for (const candidate of candidates) candidate.selected = candidate.id === selected.id
    steps.push({ nodeId: current.id, nodeText: current.text, candidates, explored })
    const next = current.children.find((child) => child.id === selected.id)
    if (!next || visited.has(next.id)) break
    visited.add(next.id)
    path.push({ id: next.id, text: next.text, type: next.type, ...consultScoreNode(next, context, config) })
    current = next
  }

  return { path, steps, leafId: current.id }
}

function hasConsultContent(root: ConsultNode): boolean {
  return Boolean(root.text.trim()) || root.children.length > 0
}

export function chooseConsultForestPath(
  forest: ConsultForest,
  context: ConsultContext,
  config: ConsultScoringConfig
): ConsultDecisionPath {
  const usable = forest.trees.filter((tree) => hasConsultContent(tree.root))
  if (!usable.length) throw new Error('还没有导入可用的咨询路径')

  let selected:
    | { tree: ConsultTree; decision: ConsultDecisionPath; score: number }
    | null = null
  for (const tree of usable) {
    // 先用无探索模式比较整条路径，避免随机探索影响“从哪棵树开始”的判断。
    const decision = chooseConsultPath(tree.root, context, { ...config, epsilon: 0 }, () => 1)
    const score = decision.path.reduce((sum, item) => sum + item.total, 0)
    if (!selected || score > selected.score) selected = { tree, decision, score }
  }

  const tree = selected!.tree
  return {
    ...selected!.decision,
    treeId: tree.id,
    treeName: tree.name
  }
}

export function syncSharedConsultNodes(trees: ConsultTree[]): void {
  const shared = new Map<string, { node: ConsultNode; treeId: string }>()
  for (const tree of trees) {
    const stack = [tree.root]
    while (stack.length) {
      const node = stack.pop()!
      const key = node.text.trim()
      if (key && !node.metadata?.placeholder) {
        const first = shared.get(key)
        if (first && first.treeId !== tree.id && first.node.id !== node.id) {
          node.id = first.node.id
          node.weight = first.node.weight
          node.reward = first.node.reward
          node.penalty = first.node.penalty
          node.selectedCount = first.node.selectedCount
          node.metadata = {
            ...first.node.metadata,
            ...node.metadata,
            answerHistory: mergeAnswerHistory(
              first.node.metadata?.answerHistory,
              node.metadata?.answerHistory
            )
          }
        } else if (!first) {
          shared.set(key, { node, treeId: tree.id })
        }
      }
      for (const child of node.children) stack.push(child)
    }
  }
}

function mergeAnswerHistory(
  left: ConsultAnswerHistory[] | undefined,
  right: ConsultAnswerHistory[] | undefined
): ConsultAnswerHistory[] | undefined {
  const merged: ConsultAnswerHistory[] = []
  const seen = new Set<string>()
  for (const answer of [...(left ?? []), ...(right ?? [])]) {
    const key = `${answer.text}\u0000${answer.studentName ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(answer)
  }
  return merged.length ? merged.slice(-20) : undefined
}

export function updateConsultNodesById(
  trees: ConsultTree[],
  nodeId: string,
  update: (node: ConsultNode) => void
): number {
  let count = 0
  for (const tree of trees) {
    const stack = [tree.root]
    while (stack.length) {
      const node = stack.pop()!
      if (node.id === nodeId) {
        update(node)
        count += 1
      }
      for (const child of node.children) stack.push(child)
    }
  }
  return count
}

export function consultNodeCount(root: ConsultNode): number {
  let count = 0
  const stack = [root]
  while (stack.length) {
    const node = stack.pop()!
    count += 1
    for (const child of node.children) stack.push(child)
  }
  return count
}

export function createConsultNode(text = '新节点', type: ConsultNodeType = 'leaf'): ConsultNode {
  return {
    id: newConsultNodeId(),
    text,
    type,
    children: [],
    weight: 1,
    reward: 0,
    penalty: 0,
    selectedCount: 0,
    metadata: { tags: [], answerHistory: [] }
  }
}

