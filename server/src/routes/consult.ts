import { Router } from 'express'
import {
  CONSULT_MAX_CHILDREN,
  CONSULT_MAX_DEPTH,
  CONSULT_MAX_NODES,
  CONSULT_MAX_PATH_NODES,
  builtInConsultTemplates,
  chooseConsultForestPath,
  consultNodeCount,
  createEmptyConsultTree,
  defaultConsultScoring,
  defaultConsultTemplate,
  newConsultNodeId,
  syncSharedConsultNodes,
  updateConsultNodesById,
  type ConsultAnswerHistory,
  type ConsultContext,
  type ConsultForest,
  type ConsultNode,
  type ConsultNodeType,
  type ConsultOutcome,
  type ConsultRun,
  type ConsultRunSection,
  type ConsultRunSectionStatus,
  type ConsultRunStatus,
  type ConsultScoringConfig,
  type ConsultTemplate,
  type ConsultTemplateGoal,
  type ConsultTree
} from '../../../shared/src/consult'
import {
  buildConsultPathIndexes,
  consultPathId,
  rankConsultPathIndexes
} from '../../../shared/src/consult-index'
import { config } from '../env'
import { db, getSetting, newId, now, setSetting } from '../db'
import { isAiConfigured } from '../ai/generate'
import {
  buildConsultDocument,
  composeConsultChapter,
  planConsultOutline,
  type ComposeConsultInput,
  type ConsultChapterPlan,
  type ConsultChapterResult
} from '../ai/consult'
import { clampString, parseJson } from '../util'

const FOREST_KEY = 'consult_forest'
const FOREST_VERSION_KEY = 'consult_forest_version'
const LEGACY_TREE_KEY = 'consult_tree'
const TEMPLATES_KEY = 'consult_templates'
const ACTIVE_TEMPLATE_KEY = 'consult_active_template'
const SCORING_KEY = 'consult_scoring'

const NODE_TYPES = new Set<ConsultNodeType>(['root', 'branch', 'leaf'])
const TEMPLATE_GOALS = new Set<ConsultTemplateGoal>(['成交', '答疑', '引导', '回访'])
const BUILT_IN_TEMPLATE_IDS = new Set(builtInConsultTemplates.map((template) => template.id))
const OUTCOMES = new Set<ConsultOutcome>(['won', 'lost', 'liked', 'abandoned'])
const DEFAULT_FOREST_VERSION = '5'
const DEFAULT_TARGET_LENGTH = 30_000
const MIN_TARGET_LENGTH = 20_000
const MAX_TARGET_LENGTH = 40_000

interface ConsultRunRow {
  id: string
  template_id: string
  template_name: string
  context: string
  path: string
  steps: string
  output: string
  status: string
  error: string
  outcome: string
  outcome_node_id: string
  target_length: number
  created_at: string
  updated_at: string
  finished_at: string | null
  outcome_at: string | null
}

interface ConsultRunSectionRow {
  run_id: string
  seq: number
  title: string
  goal: string
  content: string
  status: string
  error: string
  target_chars: number
  updated_at: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number * 1000) / 1000))
}

function cleanTags(value: unknown): string[] {
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

function sanitizeAnswerHistory(value: unknown): ConsultAnswerHistory[] {
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

function sanitizeContext(value: unknown): ConsultContext {
  const input = asRecord(value)
  return {
    name: clampString(input.name, 80),
    mentions: clampString(input.mentions, 2000),
    tags: cleanTags(input.tags),
    profile: clampString(input.profile, 20_000),
    conversation: clampString(input.conversation, 12_000)
  }
}

function sanitizeNode(input: unknown, depth: number, ids: Set<string>): ConsultNode {
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

function sanitizeTree(value: unknown): ConsultTree {
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

function sanitizeForest(value: unknown): ConsultForest {
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

function sanitizeScoring(value: unknown): ConsultScoringConfig {
  const input = asRecord(value)
  return {
    alpha: finiteNumber(input.alpha, defaultConsultScoring.alpha, 0, 20),
    beta: finiteNumber(input.beta, defaultConsultScoring.beta, 0, 20),
    gamma: finiteNumber(input.gamma, defaultConsultScoring.gamma, 0, 20),
    epsilon: finiteNumber(input.epsilon, defaultConsultScoring.epsilon, 0, 1)
  }
}

function sanitizeTargetLength(value: unknown): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return DEFAULT_TARGET_LENGTH
  return Math.round(
    Math.min(MAX_TARGET_LENGTH, Math.max(MIN_TARGET_LENGTH, number)) / 1000
  ) * 1000
}

function sanitizeTemplate(value: unknown, builtIn = false): ConsultTemplate {
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

function isLegacyDefaultTree(tree: ConsultTree): boolean {
  if (tree.root.id !== 'consult-root') return false
  const stack = [tree.root]
  while (stack.length) {
    const node = stack.pop()!
    if (!node.id.startsWith('consult-')) return false
    for (const child of node.children) stack.push(child)
  }
  return true
}

function readForest(): ConsultForest {
  const raw = getSetting(FOREST_KEY)
  if (raw) {
    try {
      const forest = sanitizeForest(JSON.parse(raw))
      if (getSetting(FOREST_VERSION_KEY) !== DEFAULT_FOREST_VERSION) {
        writeForest(forest)
        setSetting(FOREST_VERSION_KEY, DEFAULT_FOREST_VERSION)
      }
      return forest
    } catch {
      // 无法读取时保留下面从旧咨询树迁移的机会。
    }
  }

  const legacyRaw = getSetting(LEGACY_TREE_KEY)
  let trees: ConsultTree[] = []
  if (legacyRaw) {
    try {
      const legacyTree = sanitizeTree(JSON.parse(legacyRaw))
      // 早期系统自拟的整棵示例树不是用户导入的内容，必须清掉。
      if (!isLegacyDefaultTree(legacyTree)) trees = [legacyTree]
    } catch {
      // 损坏的旧数据不阻塞新森林创建。
    }
  }
  if (!trees.length) trees = [createEmptyConsultTree('未命名咨询树')]
  const forest: ConsultForest = {
    id: 'consult-forest',
    trees,
    activeTreeId: trees[0].id,
    updatedAt: now()
  }
  writeForest(forest)
  setSetting(FOREST_VERSION_KEY, DEFAULT_FOREST_VERSION)
  return forest
}

function writeForest(forest: ConsultForest): void {
  syncSharedConsultNodes(forest.trees)
  forest.updatedAt = now()
  setSetting(FOREST_KEY, JSON.stringify(forest))
}

function activeTree(forest: ConsultForest): ConsultTree {
  return forest.trees.find((tree) => tree.id === forest.activeTreeId) ?? forest.trees[0]
}

function readTree(): ConsultTree {
  return activeTree(readForest())
}

function treeForPath(forest: ConsultForest, path: ConsultRun['path']): ConsultTree {
  const ids = new Set(path.map((item) => item.id))
  const match = forest.trees.find((tree) => {
    const stack = [tree.root]
    const present = new Set<string>()
    while (stack.length) {
      const node = stack.pop()!
      present.add(node.id)
      for (const child of node.children) stack.push(child)
    }
    return [...ids].every((id) => present.has(id))
  })
  if (!match) throw new Error('找不到这次生成对应的咨询树')
  return match
}

function writeTree(tree: ConsultTree): ConsultForest {
  const forest = readForest()
  const index = forest.trees.findIndex((item) => item.id === tree.id)
  if (index >= 0) forest.trees[index] = tree
  else forest.trees.push(tree)
  forest.activeTreeId = tree.id
  writeForest(forest)
  return forest
}

function readCustomTemplates(): ConsultTemplate[] {
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

function writeCustomTemplates(templates: ConsultTemplate[]): void {
  setSetting(TEMPLATES_KEY, JSON.stringify(templates))
}

function readTemplates(): ConsultTemplate[] {
  return [...builtInConsultTemplates, ...readCustomTemplates()]
}

function readActiveTemplateId(templates: ConsultTemplate[]): string {
  const stored = getSetting(ACTIVE_TEMPLATE_KEY) ?? defaultConsultTemplate.id
  if (templates.some((template) => template.id === stored)) return stored
  setSetting(ACTIVE_TEMPLATE_KEY, defaultConsultTemplate.id)
  return defaultConsultTemplate.id
}

function readScoring(): ConsultScoringConfig {
  const raw = getSetting(SCORING_KEY)
  if (!raw) return defaultConsultScoring
  try {
    return sanitizeScoring(JSON.parse(raw))
  } catch {
    return defaultConsultScoring
  }
}

function writeScoring(scoring: ConsultScoringConfig): void {
  setSetting(SCORING_KEY, JSON.stringify(scoring))
}

function runFromRow(row: ConsultRunRow, includeSections = true): ConsultRun {
  const rawStatus = row.status as ConsultRunStatus
  const status: ConsultRunStatus = ['queued', 'running', 'failed'].includes(rawStatus)
    ? rawStatus
    : 'ready'
  const path = parseJson<ConsultRun['path']>(row.path, [])
  return {
    id: row.id,
    templateId: row.template_id,
    templateName: row.template_name,
    context: parseJson<ConsultContext>(row.context, {}),
    path,
    pathIndexId: consultPathId(path.map((item) => item.id)),
    steps: parseJson<ConsultRun['steps']>(row.steps, []),
    output: row.output,
    status,
    error: row.error,
    outcome: (row.outcome || '') as ConsultOutcome,
    outcomeNodeId: row.outcome_node_id,
    targetLength: row.target_length || 0,
    sections: includeSections ? readRunSections(row.id) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    finishedAt: row.finished_at,
    outcomeAt: row.outcome_at
  }
}

function sectionFromRow(row: ConsultRunSectionRow): ConsultRunSection {
  const rawStatus = row.status as ConsultRunSectionStatus
  const status: ConsultRunSectionStatus = ['pending', 'running', 'failed'].includes(rawStatus)
    ? rawStatus
    : 'ready'
  return {
    seq: row.seq,
    title: row.title,
    goal: row.goal,
    content: '',
    status,
    error: row.error,
    targetChars: row.target_chars,
    updatedAt: row.updated_at
  }
}

function readRunSections(runId: string): ConsultRunSection[] {
  const rows = db
    .prepare('SELECT * FROM consult_run_sections WHERE run_id = ? ORDER BY seq ASC')
    .all(runId) as unknown as ConsultRunSectionRow[]
  return rows.map(sectionFromRow)
}

function readRun(id: string): ConsultRun | null {
  const row = db.prepare('SELECT * FROM consult_runs WHERE id = ?').get(id) as
    | ConsultRunRow
    | undefined
  return row ? runFromRow(row) : null
}

function readRuns(limit = 40): ConsultRun[] {
  const rows = db
    .prepare('SELECT * FROM consult_runs ORDER BY created_at DESC LIMIT ?')
    .all(Math.min(100, Math.max(1, limit))) as unknown as ConsultRunRow[]
  return rows.map((row) => runFromRow(row))
}

function readRunsForIndexes(): ConsultRun[] {
  const rows = db
    .prepare("SELECT * FROM consult_runs WHERE status = 'ready' ORDER BY created_at DESC")
    .all() as unknown as ConsultRunRow[]
  return rows.map((row) => runFromRow(row, false))
}

function findNode(root: ConsultNode, id: string): ConsultNode | null {
  const stack = [root]
  while (stack.length) {
    const node = stack.pop()!
    if (node.id === id) return node
    for (const child of node.children) stack.push(child)
  }
  return null
}

function normalizeNodeTypes(node: ConsultNode, depth = 0): void {
  const stack: { node: ConsultNode; depth: number }[] = [{ node, depth }]
  while (stack.length) {
    const current = stack.pop()!
    if (current.depth > 0) current.node.type = current.node.children.length ? 'branch' : 'leaf'
    for (const child of current.node.children) {
      stack.push({ node: child, depth: current.depth + 1 })
    }
  }
}

function addAnswerHistory(
  node: ConsultNode,
  text: string,
  tags: string[],
  source: 'generation' | 'import',
  studentName = ''
): boolean {
  const clean = text.trim().slice(0, 1600)
  if (!clean) return false
  if (!node.metadata) node.metadata = {}
  const history = node.metadata.answerHistory ?? []
  if (history.some((item) => item.text === clean)) return false
  node.metadata.answerHistory = [
    ...history,
    {
      id: newId('consult_answer'),
      text: clean,
      studentName: studentName.trim().slice(0, 80) || undefined,
      tags: cleanTags(tags),
      source,
      createdAt: now()
    }
  ].slice(-20)
  return true
}

function importPaths(tree: ConsultTree, text: string): { imported: number; answers: number } {
  const blocks = text
    .split(/\r?\n\s*\r?\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((block) => block.length)
  const paths: string[][] = []
  for (const block of blocks) {
    const hasArrow = block.some((line) => /(?:->|→|>)/.test(line))
    const hasRole = block.some((line) =>
      /^(?:咨询师|顾问|老师|学生|来访者|对方|同学|客户)\s*[：:]/.test(line)
    )
    if (hasArrow) {
      for (const line of block) {
        paths.push(
          line
            .split(/\s*(?:->|→|>)\s*/)
            .map((part) => part.trim().slice(0, 2000))
            .filter(Boolean)
            .slice(0, CONSULT_MAX_PATH_NODES * 2)
        )
      }
    } else if (hasRole) {
      paths.push(block.map((line) => line.slice(0, 2000)).slice(0, CONSULT_MAX_PATH_NODES * 2))
    } else {
      for (const line of block) paths.push([line.slice(0, 2000)])
    }
  }
  let imported = 0
  let answers = 0
  for (const parts of paths) {
    if (parts.length === 0) continue
    let current = tree.root
    let invalid = false
    let consultantLines = 0
    for (const part of parts) {
      const studentMatch = /^(?:学生|来访者|对方|同学|客户)\s*[：:]\s*/.exec(part)
      if (studentMatch) {
        const answer = part.slice(studentMatch[0].length).trim()
        if (addAnswerHistory(current, answer, [], 'import')) answers += 1
        continue
      }
      const consultantMatch = /^(?:咨询师|顾问|老师)\s*[：:]\s*/.exec(part)
      const speech = (consultantMatch ? part.slice(consultantMatch[0].length) : part).trim()
      if (!speech) continue
      if (current.id === tree.root.id && !current.text.trim() && !current.children.length) {
        current.text = speech
        if (current.metadata) current.metadata.placeholder = undefined
        consultantLines += 1
        continue
      }
      if (current.id === tree.root.id && speech === tree.root.text) {
        current = tree.root
        continue
      }
      let child = current.children.find((item) => item.text === speech)
      if (!child) {
        if (current.children.length >= CONSULT_MAX_CHILDREN) {
          invalid = true
          break
        }
        child = {
          id: newConsultNodeId(),
          text: speech,
          type: 'branch',
          children: [],
          weight: 1,
          reward: 1,
          penalty: 0,
          selectedCount: 0,
          metadata: { tags: [], answerHistory: [] }
        }
        current.children.push(child)
      }
      child.reward = Math.round((child.reward + 1) * 1000) / 1000
      current = child
      consultantLines += 1
    }
    if (!invalid && consultantLines > 0) imported += 1
  }
  normalizeNodeTypes(tree.root)
  tree.updatedAt = now()
  return { imported, answers }
}

function contextForDecision(body: unknown): ConsultContext {
  return sanitizeContext(asRecord(body).context)
}

const activeConsultJobs = new Map<string, Promise<void>>()

function markStaleConsultJobs(): void {
  const staleAt = now()
  const message = '服务器在生成过程中重新启动，这次生成没有完成。可以点击重试继续。'
  db.prepare(
    "UPDATE consult_runs SET status = 'failed', error = ?, updated_at = ?, finished_at = ? WHERE status IN ('queued', 'running')"
  ).run(message, staleAt, staleAt)
  db.prepare(
    "UPDATE consult_run_sections SET status = 'failed', error = ?, updated_at = ? WHERE status = 'running'"
  ).run(message, staleAt)
}

markStaleConsultJobs()

function chapterSummary(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim()
  if (clean.length <= 320) return clean
  return `${clean.slice(0, 220)}……${clean.slice(-80)}`
}

function setRunRunning(runId: string): void {
  db.prepare("UPDATE consult_runs SET status = 'running', error = '', updated_at = ? WHERE id = ?").run(
    now(),
    runId
  )
}

function setRunFailed(runId: string, message: string): void {
  const failedAt = now()
  db.prepare(
    "UPDATE consult_runs SET status = 'failed', error = ?, updated_at = ?, finished_at = ? WHERE id = ?"
  ).run(message.slice(0, 1200), failedAt, failedAt, runId)
}

function setRunReady(runId: string, output: string): void {
  const finishedAt = now()
  db.prepare(
    "UPDATE consult_runs SET status = 'ready', error = '', output = ?, updated_at = ?, finished_at = ? WHERE id = ?"
  ).run(output, finishedAt, finishedAt, runId)
}

async function runConsultJob(runId: string): Promise<void> {
  const row = db.prepare('SELECT * FROM consult_runs WHERE id = ?').get(runId) as
    | ConsultRunRow
    | undefined
  if (!row) return
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
  const relatedIndex = buildConsultPathIndexes(
    forest.trees.map((item) => item.root),
    readRunsForIndexes()
  )
  input.relatedPaths = rankConsultPathIndexes(relatedIndex.paths, context, 5).map((path) => ({
    id: path.id,
    pathText: path.pathText,
    matchedTags: path.matchedTags,
    decidedCount: path.decidedCount,
    conversionLowerBound: path.conversionLowerBound
  }))

  let plan: ConsultChapterPlan[] = []
  let completedBySeq = new Map<number, ConsultChapterResult>()
  const existingSections = readRunSections(runId)
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

  setRunRunning(runId)
  let currentSeq = 0
  try {
    for (const [index, chapter] of plan.entries()) {
      const seq = index + 1
      if (completedBySeq.has(seq)) continue
      currentSeq = seq
      db.prepare(
        "UPDATE consult_run_sections SET status = 'running', error = '', updated_at = ? WHERE run_id = ? AND seq = ?"
      ).run(now(), runId, seq)
      const completed = [...completedBySeq.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, item]) => item)
      const result = await composeConsultChapter(input, plan, chapter, index, completed)
      completedBySeq.set(seq, result)
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
    if (currentSeq) {
      db.prepare(
        "UPDATE consult_run_sections SET status = 'failed', error = ?, updated_at = ? WHERE run_id = ? AND seq = ?"
      ).run(message.slice(0, 1200), now(), runId, currentSeq)
    }
    throw error
  }
}

function startConsultJob(runId: string): void {
  if (activeConsultJobs.has(runId)) return
  const job = runConsultJob(runId)
    .catch((error) => {
      setRunFailed(runId, error instanceof Error ? error.message : 'AI 生成失败')
    })
    .finally(() => {
      activeConsultJobs.delete(runId)
    })
  activeConsultJobs.set(runId, job)
}

export const consultRouter = Router()

consultRouter.get('/', (req, res) => {
  const forest = readForest()
  const tree = activeTree(forest)
  const templates = readTemplates()
  const runCount = (db.prepare('SELECT COUNT(*) AS count FROM consult_runs').get() as { count: number })
    .count
  res.json({
    forest,
    tree,
    trees: forest.trees,
    templates,
    activeTemplateId: readActiveTemplateId(templates),
    scoring: readScoring(),
    ai: { configured: isAiConfigured(), model: config.deepseekModel },
    stats: {
      nodes: forest.trees.reduce((sum, item) => sum + consultNodeCount(item.root), 0),
      runs: runCount
    }
  })
})

consultRouter.put('/tree', (req, res) => {
  try {
    const tree = sanitizeTree(req.body?.tree)
    const forest = writeTree(tree)
    res.json({ tree: activeTree(forest), trees: forest.trees, forest })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '咨询树格式不对' })
  }
})

consultRouter.post('/trees', (req, res) => {
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

consultRouter.put('/trees/:id', (req, res) => {
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

consultRouter.put('/trees/:id/active', (req, res) => {
  const forest = readForest()
  if (!forest.trees.some((item) => item.id === req.params.id)) {
    res.status(404).json({ error: '没有找到这棵咨询树' })
    return
  }
  forest.activeTreeId = req.params.id
  writeForest(forest)
  res.json({ tree: activeTree(forest), trees: forest.trees, forest })
})

consultRouter.delete('/trees/:id', (req, res) => {
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

consultRouter.put('/scoring', (req, res) => {
  const scoring = sanitizeScoring(req.body)
  writeScoring(scoring)
  res.json({ scoring })
})

consultRouter.post('/preview', (req, res) => {
  const context = contextForDecision(req.body)
  try {
    const decision = chooseConsultForestPath(readForest(), context, readScoring())
    res.json({ decision })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '还没有可用咨询路径' })
  }
})

consultRouter.post('/import', (req, res) => {
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

consultRouter.post('/decay', (req, res) => {
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

consultRouter.post('/templates', (req, res) => {
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

consultRouter.put('/templates/active', (req, res) => {
  const id = clampString(req.body?.id, 100)
  if (!readTemplates().some((template) => template.id === id)) {
    res.status(404).json({ error: '没有找到这个模板' })
    return
  }
  setSetting(ACTIVE_TEMPLATE_KEY, id)
  res.json({ activeTemplateId: id })
})

consultRouter.put('/templates/:id', (req, res) => {
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

consultRouter.delete('/templates/:id', (req, res) => {
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

function pathIndexPayload(): {
  generatedAt: string
  treeUpdatedAt: string
  runsScanned: number
  pathCount: number
  vocabulary: string[]
  paths: ReturnType<typeof buildConsultPathIndexes>['paths']
} {
  const forest = readForest()
  const runs = readRunsForIndexes()
  const { paths, vocabulary } = buildConsultPathIndexes(
    forest.trees.map((tree) => tree.root),
    runs
  )
  return {
    generatedAt: now(),
    treeUpdatedAt: forest.updatedAt,
    runsScanned: runs.length,
    pathCount: paths.length,
    vocabulary,
    paths
  }
}

consultRouter.get('/indexes', (_req, res) => {
  res.json(pathIndexPayload())
})

consultRouter.post('/indexes/query', (req, res) => {
  const context = contextForDecision(req.body)
  const limit = Math.round(finiteNumber(asRecord(req.body).limit, 20, 1, 50))
  const payload = pathIndexPayload()
  res.json({
    generatedAt: payload.generatedAt,
    runsScanned: payload.runsScanned,
    matched: rankConsultPathIndexes(payload.paths, context, limit)
  })
})

consultRouter.get('/runs', (req, res) => {
  res.json({ runs: readRuns(60) })
})

consultRouter.post('/runs', (req, res) => {
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
})

consultRouter.get('/runs/:id', (req, res) => {
  const run = readRun(req.params.id)
  if (!run) {
    res.status(404).json({ error: '没有找到这次生成记录' })
    return
  }
  res.json({ run })
})

consultRouter.post('/runs/:id/retry', (req, res) => {
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
})

consultRouter.patch('/runs/:id/outcome', (req, res) => {
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
})
