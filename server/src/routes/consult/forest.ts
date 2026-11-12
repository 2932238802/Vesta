import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CONSULT_MAX_CHILDREN,
  CONSULT_MAX_PATH_NODES,
  createEmptyConsultTree,
  newConsultNodeId,
  syncSharedConsultNodes,
  type ConsultForest,
  type ConsultNode,
  type ConsultRun,
  type ConsultTree
} from '../../../../shared/src/consult'
import { getSetting, newId, now, setSetting } from '../../db'
import {
  DEFAULT_FOREST_VERSION,
  FOREST_KEY,
  FOREST_SEED_KEY,
  FOREST_VERSION_KEY,
  LEGACY_TREE_KEY,
  cleanTags,
  sanitizeForest,
  sanitizeTree
} from './shared'

// 新装或远端库第一次读取咨询路径时，把两份成交稿生成的种子树并入森林。
// 只补缺失的树，不覆盖同 id 的现有树；执行一次后记录标记，之后不再自动写入。
export const FOREST_SEED_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../shared/src/consult-forest-seed.json'
)

export function treeHasContent(tree: ConsultTree): boolean {
  return Boolean(tree.root.text.trim()) || tree.root.children.length > 0
}

export function readSeedForest(): ConsultForest | null {
  try {
    return sanitizeForest(JSON.parse(fs.readFileSync(FOREST_SEED_FILE, 'utf8')))
  } catch {
    return null
  }
}

export function mergeSeedForest(forest: ConsultForest, seed: ConsultForest): ConsultForest {
  const existingIds = new Set(forest.trees.map((tree) => tree.id))
  const existingNames = new Set(forest.trees.map((tree) => tree.name))
  // 同 id 或同名的树都视为已有，避免远端之前单独导入过一份时出现重复树。
  const added = seed.trees.filter(
    (tree) => !existingIds.has(tree.id) && !existingNames.has(tree.name)
  )
  if (!added.length) return forest
  // 空白的占位树没有内容，合并时清掉，避免种子树旁边多一棵“未命名咨询树”。
  const kept = forest.trees.filter(treeHasContent)
  const trees = [...kept, ...added]
  const activeTreeId = trees.some((tree) => tree.id === forest.activeTreeId)
    ? forest.activeTreeId
    : added.some((tree) => tree.id === seed.activeTreeId)
      ? seed.activeTreeId
      : added[0].id
  return { ...forest, trees, activeTreeId }
}

export function isLegacyDefaultTree(tree: ConsultTree): boolean {
  if (tree.root.id !== 'consult-root') return false
  const stack = [tree.root]
  while (stack.length) {
    const node = stack.pop()!
    if (!node.id.startsWith('consult-')) return false
    for (const child of node.children) stack.push(child)
  }
  return true
}

export function readForest(): ConsultForest {
  const seedApplied = getSetting(FOREST_SEED_KEY) === '1'
  const raw = getSetting(FOREST_KEY)
  if (raw) {
    try {
      let forest = sanitizeForest(JSON.parse(raw))
      if (!seedApplied) {
        const seed = readSeedForest()
        if (seed) {
          forest = mergeSeedForest(forest, seed)
          writeForest(forest)
          setSetting(FOREST_SEED_KEY, '1')
        }
      }
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
  let result = forest
  if (!seedApplied) {
    const seed = readSeedForest()
    if (seed) {
      result = mergeSeedForest(forest, seed)
      setSetting(FOREST_SEED_KEY, '1')
    }
  }
  writeForest(result)
  setSetting(FOREST_VERSION_KEY, DEFAULT_FOREST_VERSION)
  return result
}

export function writeForest(forest: ConsultForest): void {
  syncSharedConsultNodes(forest.trees)
  forest.updatedAt = now()
  setSetting(FOREST_KEY, JSON.stringify(forest))
}

export function activeTree(forest: ConsultForest): ConsultTree {
  return forest.trees.find((tree) => tree.id === forest.activeTreeId) ?? forest.trees[0]
}

export function readTree(): ConsultTree {
  return activeTree(readForest())
}

export function treeForPath(forest: ConsultForest, path: ConsultRun['path']): ConsultTree {
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

export function writeTree(tree: ConsultTree): ConsultForest {
  const forest = readForest()
  const index = forest.trees.findIndex((item) => item.id === tree.id)
  if (index >= 0) forest.trees[index] = tree
  else forest.trees.push(tree)
  forest.activeTreeId = tree.id
  writeForest(forest)
  return forest
}

export function findNode(root: ConsultNode, id: string): ConsultNode | null {
  const stack = [root]
  while (stack.length) {
    const node = stack.pop()!
    if (node.id === id) return node
    for (const child of node.children) stack.push(child)
  }
  return null
}

export function normalizeNodeTypes(node: ConsultNode, depth = 0): void {
  const stack: { node: ConsultNode; depth: number }[] = [{ node, depth }]
  while (stack.length) {
    const current = stack.pop()!
    if (current.depth > 0) current.node.type = current.node.children.length ? 'branch' : 'leaf'
    for (const child of current.node.children) {
      stack.push({ node: child, depth: current.depth + 1 })
    }
  }
}

export function addAnswerHistory(
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

export function importPaths(tree: ConsultTree, text: string): { imported: number; answers: number } {
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
