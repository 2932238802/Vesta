import type {
  ConsultPurposeBeat,
  ConsultPurposeExample,
  ConsultPurposeNode
} from '@shared/consult-purpose'
import { exampleToBeats } from '@shared/consult-purpose'

export const MAP_NODE_WIDTH = 216
export const MAP_NODE_HEIGHT = 90
export const MAP_X_GAP = 290
export const MAP_Y_GAP = 104
export const MAP_PADDING = 40

export interface MapNode {
  node: ConsultPurposeNode
  depth: number
  x: number
  y: number
}

export interface MapEdge {
  id: string
  parentId: string
  childId: string
  d: string
}

export function hasChildren(node: ConsultPurposeNode): boolean {
  return (node.children?.length ?? 0) > 0
}

export function exampleCount(node: ConsultPurposeNode): number {
  return node.examples?.length ?? 0
}

export function butterflyCount(node: ConsultPurposeNode): number {
  return node.butterflies?.length ?? 0
}

export function countPurposes(node: ConsultPurposeNode): number {
  let total = node.kind === 'purpose' ? 1 : 0
  for (const child of node.children ?? []) total += countPurposes(child)
  return total
}

// 参考节拍只从原文示例确定性拆出，所以按节点缓存，避免列表滚动时重复计算。
const beatCache = new Map<
  string,
  { beats: ConsultPurposeBeat[]; example: ConsultPurposeExample | null }
>()

export function clearPurposeBeatCache() {
  beatCache.clear()
}

export function beatInfoFor(node: ConsultPurposeNode) {
  const cached = beatCache.get(node.id)
  if (cached) return cached
  const examples = node.examples ?? []
  const example =
    examples.find((item) => item.source === 'july') ??
    examples.find((item) => item.turns.length >= 4 && item.turns.length <= 32) ??
    examples[0] ??
    null
  const info = { example, beats: example ? exampleToBeats(example) : [] }
  beatCache.set(node.id, info)
  return info
}

export function beatsFor(node: ConsultPurposeNode): ConsultPurposeBeat[] {
  return beatInfoFor(node).beats
}

export function beatKindLabel(kind: ConsultPurposeBeat['kind']): string {
  if (kind === 'ask') return '提问'
  if (kind === 'student') return '学生'
  if (kind === 'direction') return '动作'
  return '咨询师'
}

export function stageIndex(stages: ConsultPurposeNode[], stage: ConsultPurposeNode): number {
  return stages.findIndex((item) => item.id === stage.id)
}

export function kindLabel(node: ConsultPurposeNode): string {
  if (node.kind === 'butterfly') return '情绪蝴蝶'
  if (node.kind === 'stage') return '阶段'
  if (node.kind === 'root') return '目的骨架'
  return '目的动作'
}

export function badges(node: ConsultPurposeNode): { key: string; label: string; tone: string }[] {
  const list: { key: string; label: string; tone: string }[] = []
  if (node.optional) list.push({ key: 'optional', label: '可选支线', tone: 'optional' })
  if (node.group) list.push({ key: 'group', label: '分组', tone: 'group' })
  if (node.gap) list.push({ key: 'gap', label: '待补充', tone: 'gap' })
  if (node.incomplete) list.push({ key: 'incomplete', label: '原稿中断', tone: 'incomplete' })
  return list
}

export function rowClass(node: ConsultPurposeNode): Record<string, boolean> {
  return {
    optional: Boolean(node.optional),
    gap: Boolean(node.gap),
    incomplete: Boolean(node.incomplete),
    group: Boolean(node.group),
    butterfly: node.kind === 'butterfly',
    stage: node.kind === 'stage',
    root: node.kind === 'root'
  }
}

export function rangeLabel(example: ConsultPurposeExample): string {
  const suffix = example.source === 'july' ? '段' : '轮'
  const span = example.to === example.from ? `${example.from}` : `${example.from}–${example.to}`
  return `第 ${span} ${suffix}`
}

export function nodeText(node: ConsultPurposeNode): string {
  const parts: (string | undefined)[] = [
    node.label,
    node.summary,
    node.purposeKey,
    node.branchCondition,
    ...(node.tags ?? []),
    ...(node.notes ?? [])
  ]
  for (const example of node.examples ?? []) {
    for (const turn of example.turns) parts.push(turn.text)
  }
  for (const butterfly of node.butterflies ?? []) {
    parts.push(butterfly.label, butterfly.summary, ...(butterfly.tags ?? []))
    for (const example of butterfly.examples ?? []) {
      for (const turn of example.turns) parts.push(turn.text)
    }
  }
  return parts.filter(Boolean).join(' ').toLowerCase()
}

export function buildVisibleSet(
  stages: ConsultPurposeNode[],
  query: string
): Set<string> | null {
  const needle = query.trim().toLowerCase()
  if (!needle) return null
  const visible = new Set<string>()

  const addSubtree = (node: ConsultPurposeNode) => {
    visible.add(node.id)
    for (const butterfly of node.butterflies ?? []) visible.add(butterfly.id)
    for (const child of node.children ?? []) addSubtree(child)
  }

  const visit = (node: ConsultPurposeNode): boolean => {
    if (node.kind === 'stage' && nodeText(node).includes(needle)) {
      addSubtree(node)
      return true
    }
    let hit = nodeText(node).includes(needle)
    if (hit) {
      visible.add(node.id)
      for (const butterfly of node.butterflies ?? []) visible.add(butterfly.id)
    }
    for (const butterfly of node.butterflies ?? []) {
      if (nodeText(butterfly).includes(needle)) {
        visible.add(butterfly.id)
        visible.add(node.id)
        hit = true
      }
    }
    let childHit = false
    for (const child of node.children ?? []) {
      if (visit(child)) childHit = true
    }
    if (childHit) visible.add(node.id)
    return hit || childHit
  }

  for (const stage of stages) visit(stage)
  return visible
}

export function buildMapLayout(input: {
  tree: ConsultPurposeNode | null
  visible: Set<string> | null
  forceOpen: boolean
  onlyMainline: boolean
  collapsed: Set<string>
}): { nodes: MapNode[]; edges: MapEdge[]; size: { width: number; height: number } } {
  const { tree, visible, forceOpen, onlyMainline, collapsed } = input
  if (!tree) {
    return { nodes: [] as MapNode[], edges: [] as MapEdge[], size: { width: 0, height: 0 } }
  }
  const base: { node: ConsultPurposeNode; depth: number; parentId: string | null }[] = []
  const stack: { node: ConsultPurposeNode; depth: number; parentId: string | null }[] = [
    { node: tree, depth: 0, parentId: null }
  ]

  while (stack.length) {
    const item = stack.pop()!
    if (onlyMainline && item.node.optional) continue
    if (visible && !visible.has(item.node.id)) continue
    base.push(item)
    if (!forceOpen && collapsed.has(item.node.id)) continue
    const children = item.node.children ?? []
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: children[index], depth: item.depth + 1, parentId: item.node.id })
    }
  }

  const childrenById = new Map<string, string[]>()
  for (const item of base) {
    if (!item.parentId) continue
    const list = childrenById.get(item.parentId) ?? []
    list.push(item.node.id)
    childrenById.set(item.parentId, list)
  }

  const yById = new Map<string, number>()
  let leafCursor = 0
  // 先按从上到下的顺序给叶子节点排位，再自底向上算父节点的中点。
  for (const item of base) {
    const children = childrenById.get(item.node.id) ?? []
    if (!children.length) {
      yById.set(item.node.id, leafCursor * MAP_Y_GAP)
      leafCursor += 1
    }
  }
  for (let index = base.length - 1; index >= 0; index -= 1) {
    const item = base[index]
    const children = childrenById.get(item.node.id) ?? []
    if (!children.length) continue
    const first = yById.get(children[0]) ?? 0
    const last = yById.get(children[children.length - 1]) ?? first
    yById.set(item.node.id, (first + last) / 2)
  }

  const xById = new Map<string, number>()
  const nodes: MapNode[] = base.map((item) => {
    const x = MAP_PADDING + item.depth * MAP_X_GAP
    const y = MAP_PADDING + (yById.get(item.node.id) ?? 0)
    xById.set(item.node.id, x)
    return { node: item.node, depth: item.depth, x, y }
  })

  const edges: MapEdge[] = []
  for (const item of base) {
    if (!item.parentId) continue
    const parentX = (xById.get(item.parentId) ?? 0) + MAP_NODE_WIDTH
    const parentY = MAP_PADDING + (yById.get(item.parentId) ?? 0)
    const childX = xById.get(item.node.id) ?? 0
    const childY = MAP_PADDING + (yById.get(item.node.id) ?? 0)
    const middle = (parentX + childX) / 2
    edges.push({
      id: `${item.parentId}-${item.node.id}`,
      parentId: item.parentId,
      childId: item.node.id,
      d: `M ${parentX} ${parentY} C ${middle} ${parentY}, ${middle} ${childY}, ${childX} ${childY}`
    })
  }

  const depth = base.reduce((max, item) => Math.max(max, item.depth), 0)
  return {
    nodes,
    edges,
    size: {
      width: MAP_PADDING * 2 + depth * MAP_X_GAP + MAP_NODE_WIDTH,
      height: MAP_PADDING * 2 + Math.max(1, leafCursor - 1) * MAP_Y_GAP + MAP_NODE_HEIGHT
    }
  }
}

export function mapKicker(node: ConsultPurposeNode, stages: ConsultPurposeNode[]): string {
  if (node.kind === 'root') return '目的骨架'
  if (node.kind === 'stage') return `阶段 ${stageIndex(stages, node) + 1} / ${stages.length}`
  if (node.group) return '分组'
  return '目的动作'
}

export function mapTitle(node: ConsultPurposeNode): string {
  const base = `${node.label}\n${node.summary}`
  if (node.kind !== 'purpose') return base
  const beats = beatsFor(node).slice(0, 4)
  if (!beats.length) return base
  return `${base}\n\n下一步：\n${beats
    .map((beat) => `${beatKindLabel(beat.kind)}：${beat.text}`)
    .join('\n')}`
}

export function mapMeta(
  node: ConsultPurposeNode,
  stages: ConsultPurposeNode[],
  showButterflies: boolean
): string {
  if (node.kind === 'root') return `${stages.length} 个阶段`
  if (node.kind === 'stage') return `${countPurposes(node)} 个目的`
  const parts: string[] = []
  const beats = beatsFor(node).length
  if (beats) parts.push(`${beats} 拍`)
  parts.push(`${exampleCount(node)} 组`)
  if (showButterflies && butterflyCount(node)) parts.push(`🦋 ${butterflyCount(node)}`)
  if (hasChildren(node)) parts.push(`${node.children?.length ?? 0} 个下一步`)
  return parts.join(' · ')
}

export function defaultCollapsedStages(tree: ConsultPurposeNode | null): Set<string> {
  // 默认把第一阶段展开：一进来就能看到目的和节拍，而不是只有 6 张阶段卡。
  return new Set((tree?.children ?? []).slice(1).map((stage) => stage.id))
}

export function collectWithChildren(tree: ConsultPurposeNode | null): string[] {
  const ids: string[] = []
  const visit = (node: ConsultPurposeNode) => {
    if (hasChildren(node)) ids.push(node.id)
    for (const child of node.children ?? []) visit(child)
  }
  if (tree) visit(tree)
  return ids
}
