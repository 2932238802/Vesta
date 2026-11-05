<template>
  <div class="purpose-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">咨询</p>
        <div class="title-row">
          <h1 class="page-title">咨询树</h1>
        </div>
      </div>
      <div class="head-actions">
        <button class="btn ghost small" type="button" :disabled="loading || !payload" @click="expandAll">
          全部展开
        </button>
        <button class="btn ghost small" type="button" :disabled="loading || !payload" @click="collapseAll">
          全部收起
        </button>
        <label v-if="payload" class="template-picker">
          <span>模板</span>
          <select :value="activeTemplate?.id" @change="onTemplateChange">
            <option v-for="item in payload.templates" :key="item.id" :value="item.id">
              {{ item.name }} · {{ item.season }} · {{ item.stats.purposes }} 个目的
            </option>
          </select>
        </label>
      </div>
    </header>

    <div v-if="loading" class="card empty">正在读取咨询树</div>
    <div v-else-if="loadError" class="card empty">
      {{ loadError }}
      <div class="empty-action">
        <button class="btn ghost small" type="button" @click="load">重新读取</button>
      </div>
    </div>

    <template v-else-if="payload">
      <section class="card filter-bar">
        <div class="stats-row">
          <span class="stat"><b>{{ stats.stages }}</b> 个阶段</span>
          <span class="stat"><b>{{ stats.purposes }}</b> 个目的</span>
          <span class="stat"><b>{{ stats.optional }}</b> 个可选支线</span>
          <span class="stat"><b>{{ stats.butterflies }}</b> 个蝴蝶</span>
          <span class="stat"><b>{{ stats.exampleGroups }}</b> 组示例</span>
          <span v-if="stats.gaps" class="stat gap"><b>{{ stats.gaps }}</b> 个待补充</span>
        </div>
        <div class="filter-row">
          <input
            v-model="query"
            class="input search"
            type="search"
            maxlength="200"
            placeholder="搜目的、原文、标签…"
            autocomplete="off"
          />
          <label class="check">
            <input v-model="showButterflies" type="checkbox" />
            显示蝴蝶
          </label>
          <label class="check">
            <input v-model="onlyMainline" type="checkbox" />
            只看主线
          </label>
        </div>
      </section>

      <div class="purpose-layout">
        <section ref="mapCard" class="card map-card">
          <div
            ref="mapCanvas"
            class="mindmap-canvas"
            :class="{ dragging: panning }"
            @mousedown="startPan"
            @mousedown.right.prevent
            @mouseup.right.prevent
            @auxclick.prevent
            @contextmenu.prevent
            @wheel.prevent="handleWheel"
            @click="handleCanvasClick"
          >
            <div class="map-overlay" @mousedown.stop @contextmenu.prevent>
              <div class="map-actions">
                <button class="btn ghost map-control" type="button" @click="zoomMap(0.85)">缩小</button>
                <span class="map-zoom">{{ Math.round(zoom * 100) }}%</span>
                <button class="btn ghost map-control" type="button" @click="zoomMap(1.18)">放大</button>
                <button class="btn ghost map-control" type="button" @click="fitMap">适应</button>
                <button class="btn ghost map-control" type="button" @click="toggleFullscreen">
                  {{ isFullscreen ? '退出全屏' : '全屏' }}
                </button>
              </div>
            </div>

            <div
              class="mindmap-stage"
              :style="{
                width: `${mapSize.width}px`,
                height: `${mapSize.height}px`,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
              }"
            >
              <svg class="mindmap-links" :width="mapSize.width" :height="mapSize.height">
                <path
                  v-for="edge in mapEdges"
                  :key="edge.id"
                  :d="edge.d"
                  fill="none"
                  :class="{
                    'on-path': edgeOnPath(edge),
                    dimmed: selectedPathIds.size > 1 && !edgeOnPath(edge)
                  }"
                />
              </svg>
              <button
                v-for="item in mapNodes"
                :key="item.node.id"
                class="mindmap-node"
                :class="[
                  item.node.kind,
                  rowClass(item.node),
                  {
                    selected: selectedId === item.node.id,
                    'on-path': isOnPath(item.node.id),
                    dimmed: selectedPathIds.size > 1 && !isOnPath(item.node.id)
                  }
                ]"
                type="button"
                :style="{
                  left: `${item.x}px`,
                  top: `${item.y - MAP_NODE_HEIGHT / 2}px`
                }"
                :title="`${item.node.label}\n${item.node.summary}`"
                @mousedown.stop
                @mousedown.right.prevent
                @mouseup.right.prevent
                @auxclick.prevent
                @contextmenu.prevent
                @click.stop="select(item.node.id)"
              >
                <span class="map-node-main">
                  <span class="map-node-kicker">
                    {{ mapKicker(item.node) }}
                  </span>
                  <span class="map-node-label">{{ item.node.label }}</span>
                  <span class="map-node-meta">{{ mapMeta(item.node) }}</span>
                  <span
                    v-if="showButterflies && item.node.kind === 'purpose' && butterflyCount(item.node)"
                    class="map-butterflies"
                  >
                    <span
                      v-for="butterfly in (item.node.butterflies ?? []).slice(0, 2)"
                      :key="butterfly.id"
                      class="map-butterfly"
                    >
                      🦋 {{ butterfly.label }}
                    </span>
                    <span v-if="butterflyCount(item.node) > 2" class="map-butterfly more">
                      +{{ butterflyCount(item.node) - 2 }}
                    </span>
                  </span>
                </span>
                <span
                  v-if="hasChildren(item.node)"
                  class="map-fold"
                  role="button"
                  :aria-label="isMapCollapsed(item.node.id) ? '展开' : '收起'"
                  @click.stop="toggleMapCollapse(item.node.id)"
                >
                  {{ isMapCollapsed(item.node.id) ? '＋' : '−' }}
                </span>
              </button>
            </div>
            <div v-if="!mapNodes.length" class="map-empty">没有可显示的节点。</div>
          </div>
        </section>

        <aside v-show="selectedNode" ref="detailEl" class="card detail-card">
          <button
            class="detail-close"
            type="button"
            title="关闭详情"
            aria-label="关闭详情"
            @click="selectedId = ''"
          >×</button>
          <template v-if="selectedNode">
            <p v-if="breadcrumb.length" class="breadcrumb">
              <template v-for="(item, index) in breadcrumb" :key="item.id">
                <span v-if="index" class="crumb-sep">→</span>
                <button class="crumb-link" type="button" @click="select(item.id)">{{ item.label }}</button>
              </template>
            </p>

            <header class="detail-head">
              <div>
                <p class="detail-kind">{{ kindLabel(selectedNode) }}</p>
                <h2>{{ selectedNode.label }}</h2>
              </div>
              <code v-if="selectedNode.purposeKey" class="key-code">{{ selectedNode.purposeKey }}</code>
            </header>

            <div class="detail-badges">
              <span v-for="badge in badges(selectedNode)" :key="badge.key" class="badge" :class="badge.tone">
                {{ badge.label }}
              </span>
            </div>

            <p class="detail-summary">{{ selectedNode.summary }}</p>

            <div class="detail-metrics">
              <span><b>{{ exampleCount(selectedNode) }}</b> 组示例</span>
              <span><b>{{ butterflyCount(selectedNode) }}</b> 个情绪垫</span>
              <span v-if="hasChildren(selectedNode)"><b>{{ selectedNode.children?.length ?? 0 }}</b> 个下一步</span>
            </div>

            <div v-if="selectedNode.branchCondition" class="callout branch">
              <b>什么时候走这里：</b>{{ selectedNode.branchCondition }}
            </div>

            <section v-if="selectedNode.notes?.length" class="detail-section">
              <h3>导演提示</h3>
              <ul class="note-list">
                <li v-for="(note, index) in selectedNode.notes" :key="index">{{ note }}</li>
              </ul>
            </section>

            <section class="detail-section">
              <h3>原文示例组 <span class="quiet">{{ exampleCount(selectedNode) }}</span></h3>
              <template v-if="selectedNode.examples.length">
                <details
                  v-for="(example, index) in selectedNode.examples"
                  :key="`${example.source}-${example.from}-${example.to}-${index}`"
                  class="example"
                  :open="index === 0 && example.turns.length <= 12"
                >
                  <summary>
                    <span class="source" :class="example.source === 'july' ? 'july' : 'sep'">{{ example.sourceLabel }}</span>
                    <span class="range">{{ rangeLabel(example) }}</span>
                    <span class="quiet tiny">{{ example.turns.length }} 条</span>
                    <span v-if="example.note" class="ex-note">{{ example.note }}</span>
                  </summary>
                  <div class="turns">
                    <div v-for="(turn, turnIndex) in example.turns" :key="turnIndex" class="turn" :class="turn.role">
                      <span class="turn-role">{{ turn.role === 'student' ? '学生' : '咨询师' }}</span>
                      <p>{{ turn.text }}</p>
                    </div>
                  </div>
                </details>
              </template>
              <div v-else-if="selectedNode.group" class="callout">
                <b>分组节点：</b>这里不直接挂原文，具体示例在下面的子目的里。
              </div>
              <div v-else-if="selectedNode.gap" class="callout gap">
                <b>待补充：</b>原稿只有标题，还没有可用的原文示例。这里会是一个明确的空缺，而不是系统自拟话术。
              </div>
              <div v-else class="quiet tiny">暂无示例。</div>
            </section>

            <section v-if="selectedNode.butterflies?.length" class="detail-section">
              <h3>挂在目的上的情绪垫</h3>
              <div class="chip-list">
                <button
                  v-for="butterfly in selectedNode.butterflies"
                  :key="butterfly.id"
                  class="butterfly"
                  type="button"
                  @click="select(butterfly.id)"
                >
                  🦋 {{ butterfly.label }}
                </button>
              </div>
            </section>

            <section v-if="selectedNode.children?.length" class="detail-section">
              <h3>下一步</h3>
              <div class="chip-list">
                <button
                  v-for="child in selectedNode.children"
                  :key="child.id"
                  class="link-chip"
                  type="button"
                  @click="select(child.id)"
                >
                  {{ child.label }}
                </button>
              </div>
            </section>
          </template>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import type {
  ConsultPurposeExample,
  ConsultPurposeNode,
  ConsultPurposePayload,
  ConsultPurposeStats,
  ConsultPurposeTemplate
} from '@shared/consult-purpose'

const MAP_NODE_WIDTH = 216
const MAP_NODE_HEIGHT = 90
const MAP_X_GAP = 290
const MAP_Y_GAP = 104
const MAP_PADDING = 40

interface MapNode {
  node: ConsultPurposeNode
  depth: number
  x: number
  y: number
}

interface MapEdge {
  id: string
  parentId: string
  childId: string
  d: string
}

const payload = ref<ConsultPurposePayload | null>(null)
const loading = ref(true)
const loadError = ref('')
const route = useRoute()
const router = useRouter()
const query = ref('')
const showButterflies = ref(true)
const onlyMainline = ref(false)
const selectedId = ref('')
const mapCollapsed = ref<Set<string>>(new Set())
const activeTemplateId = ref(
  typeof route.query.template === 'string' ? route.query.template : ''
)

const EMPTY_STATS: ConsultPurposeStats = {
  stages: 0,
  purposes: 0,
  optional: 0,
  gaps: 0,
  incomplete: 0,
  butterflies: 0,
  exampleGroups: 0,
  turns: 0,
  chars: 0
}

const activeTemplate = computed<ConsultPurposeTemplate | null>(() => {
  const list = payload.value?.templates ?? []
  return list.find((item) => item.id === activeTemplateId.value) ?? list[0] ?? null
})
const tree = computed(() => activeTemplate.value?.tree ?? null)
const stages = computed(() => tree.value?.children ?? [])
const stats = computed(() => activeTemplate.value?.stats ?? EMPTY_STATS)

const nodeById = computed(() => {
  const map = new Map<string, ConsultPurposeNode>()
  if (tree.value) {
    const stack: ConsultPurposeNode[] = [tree.value]
    while (stack.length) {
      const node = stack.pop()!
      map.set(node.id, node)
      for (const butterfly of node.butterflies ?? []) map.set(butterfly.id, butterfly)
      for (const child of node.children ?? []) stack.push(child)
    }
  }
  return map
})

const selectedNode = computed(() => (selectedId.value ? nodeById.value.get(selectedId.value) ?? null : null))

// 选中节点后，把从根/第一阶段流到它的链路在图上标出来。
const selectedPathIds = computed(() => new Set(selectedNode.value?.path ?? []))

function isOnPath(id: string): boolean {
  return selectedPathIds.value.has(id)
}

function edgeOnPath(edge: MapEdge): boolean {
  return selectedPathIds.value.has(edge.parentId) && selectedPathIds.value.has(edge.childId)
}

const breadcrumb = computed(() => {
  const node = selectedNode.value
  if (!node) return []
  return (node.path ?? [])
    .slice(1)
    .filter((id) => id !== node.id)
    .map((id) => nodeById.value.get(id))
    .filter((item): item is ConsultPurposeNode => Boolean(item))
})

function hasChildren(node: ConsultPurposeNode): boolean {
  return (node.children?.length ?? 0) > 0
}

function exampleCount(node: ConsultPurposeNode): number {
  return node.examples?.length ?? 0
}

function butterflyCount(node: ConsultPurposeNode): number {
  return node.butterflies?.length ?? 0
}

function countPurposes(node: ConsultPurposeNode): number {
  let total = node.kind === 'purpose' ? 1 : 0
  for (const child of node.children ?? []) total += countPurposes(child)
  return total
}

function stageIndex(stage: ConsultPurposeNode): number {
  return stages.value.findIndex((item) => item.id === stage.id)
}

function kindLabel(node: ConsultPurposeNode): string {
  if (node.kind === 'butterfly') return '情绪蝴蝶'
  if (node.kind === 'stage') return '阶段'
  if (node.kind === 'root') return '目的骨架'
  return '目的动作'
}

function badges(node: ConsultPurposeNode): { key: string; label: string; tone: string }[] {
  const list: { key: string; label: string; tone: string }[] = []
  if (node.optional) list.push({ key: 'optional', label: '可选支线', tone: 'optional' })
  if (node.group) list.push({ key: 'group', label: '分组', tone: 'group' })
  if (node.gap) list.push({ key: 'gap', label: '待补充', tone: 'gap' })
  if (node.incomplete) list.push({ key: 'incomplete', label: '原稿中断', tone: 'incomplete' })
  return list
}

function rowClass(node: ConsultPurposeNode): Record<string, boolean> {
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

function rangeLabel(example: ConsultPurposeExample): string {
  const suffix = example.source === 'july' ? '段' : '轮'
  const span = example.to === example.from ? `${example.from}` : `${example.from}–${example.to}`
  return `第 ${span} ${suffix}`
}

function nodeText(node: ConsultPurposeNode): string {
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

const visibleSet = computed<Set<string> | null>(() => {
  const needle = query.value.trim().toLowerCase()
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

  for (const stage of stages.value) visit(stage)
  return visible
})

const mapLayout = computed(() => {
  if (!tree.value) {
    return { nodes: [] as MapNode[], edges: [] as MapEdge[], size: { width: 0, height: 0 } }
  }
  const visible = visibleSet.value
  const forceOpen = Boolean(query.value.trim())
  const base: { node: ConsultPurposeNode; depth: number; parentId: string | null }[] = []
  const stack: { node: ConsultPurposeNode; depth: number; parentId: string | null }[] = [
    { node: tree.value, depth: 0, parentId: null }
  ]

  while (stack.length) {
    const item = stack.pop()!
    if (onlyMainline.value && item.node.optional) continue
    if (visible && !visible.has(item.node.id)) continue
    base.push(item)
    if (!forceOpen && mapCollapsed.value.has(item.node.id)) continue
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
})

const mapNodes = computed(() => mapLayout.value.nodes)
const mapEdges = computed(() => mapLayout.value.edges)
const mapSize = computed(() => mapLayout.value.size)


function mapKicker(node: ConsultPurposeNode): string {
  if (node.kind === 'root') return '目的骨架'
  if (node.kind === 'stage') return `阶段 ${stageIndex(node) + 1} / ${stages.value.length}`
  if (node.group) return '分组'
  return '目的动作'
}

function mapMeta(node: ConsultPurposeNode): string {
  if (node.kind === 'root') return `${stages.value.length} 个阶段`
  if (node.kind === 'stage') return `${countPurposes(node)} 个目的`
  const parts = [`${exampleCount(node)} 组`]
  if (showButterflies.value && butterflyCount(node)) parts.push(`🦋 ${butterflyCount(node)}`)
  if (hasChildren(node)) parts.push(`${node.children?.length ?? 0} 个下一步`)
  return parts.join(' · ')
}

function isMapCollapsed(id: string): boolean {
  return mapCollapsed.value.has(id)
}

function toggleMapCollapse(id: string) {
  const next = new Set(mapCollapsed.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  mapCollapsed.value = next
  nextTick(() => ensureNodeVisible(id))
}

// 只在节点被挤出可视区时做最小平移，不改变缩放，也不把节点强行拉到屏幕中间。
function ensureNodeVisible(id: string) {
  const canvas = mapCanvas.value
  if (!canvas) return
  const item = mapNodes.value.find((entry) => entry.node.id === id)
  if (!item) return
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (!width || !height) return

  const marginX = 48
  const marginY = 40
  const left = item.x * zoom.value + pan.value.x
  const top = (item.y - MAP_NODE_HEIGHT / 2) * zoom.value + pan.value.y
  const right = left + MAP_NODE_WIDTH * zoom.value
  const bottom = top + MAP_NODE_HEIGHT * zoom.value

  let dx = 0
  let dy = 0
  if (right > width - marginX) dx = width - marginX - right
  else if (left < marginX) dx = marginX - left
  if (bottom > height - marginY) dy = height - marginY - bottom
  else if (top < marginY) dy = marginY - top
  if (!dx && !dy) return
  pan.value = { x: pan.value.x + dx, y: pan.value.y + dy }
}

function collectWithChildren(): string[] {
  const ids: string[] = []
  const visit = (node: ConsultPurposeNode) => {
    if (hasChildren(node)) ids.push(node.id)
    for (const child of node.children ?? []) visit(child)
  }
  if (tree.value) visit(tree.value)
  return ids
}

function expandAll() {
  mapCollapsed.value = new Set()
  nextTick(fitMap)
}

function collapseAll() {
  mapCollapsed.value = new Set(collectWithChildren())
  nextTick(fitMap)
}

function select(id: string) {
  const node = nodeById.value.get(id)
  if (!node) return
  const path = node.path ?? []
  if (path.length) {
    const mapNext = new Set(mapCollapsed.value)
    for (const pathId of path) mapNext.delete(pathId)
    mapCollapsed.value = mapNext
  }
  selectedId.value = id
  nextTick(() => {
    ensureNodeVisible(id)
    if (window.innerWidth <= 1180) {
      detailEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

const detailEl = ref<HTMLElement | null>(null)
const mapCard = ref<HTMLElement | null>(null)
const mapCanvas = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const pan = ref({ x: 24, y: 24 })
const zoom = ref(1)
const panning = ref(false)
let panStart = { x: 0, y: 0, panX: 0, panY: 0 }
let panMoved = false

async function toggleFullscreen() {
  const card = mapCard.value
  if (!card) return
  try {
    if (document.fullscreenElement === card) await document.exitFullscreen()
    else await card.requestFullscreen()
  } catch {
    // 浏览器拒绝全屏时保持当前视图
  }
}

function onFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === mapCard.value
}

function fitMap() {
  const canvas = mapCanvas.value
  if (!canvas || !mapSize.value.width || !mapSize.value.height) return
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (!width || !height) return
  // 顶部给悬浮工具条留出空间，避免第一张卡片被压在下面。
  const insetX = 40
  const insetTop = 64
  const insetBottom = 40
  const target = Math.min(
    1.15,
    Math.max(
      0.06,
      Math.min(
        (width - insetX * 2) / mapSize.value.width,
        (height - insetTop - insetBottom) / mapSize.value.height
      )
    )
  )
  zoom.value = target
  pan.value = {
    x: (width - mapSize.value.width * target) / 2,
    y: insetTop + (height - insetTop - insetBottom - mapSize.value.height * target) / 2
  }
}

function zoomMap(factor: number) {
  const canvas = mapCanvas.value
  if (!canvas) return
  const nextZoom = Math.min(2.4, Math.max(0.06, zoom.value * factor))
  const centerX = canvas.clientWidth / 2
  const centerY = canvas.clientHeight / 2
  const worldX = (centerX - pan.value.x) / zoom.value
  const worldY = (centerY - pan.value.y) / zoom.value
  zoom.value = nextZoom
  pan.value = {
    x: centerX - worldX * nextZoom,
    y: centerY - worldY * nextZoom
  }
}

function handleWheel(event: WheelEvent) {
  const canvas = mapCanvas.value
  if (!canvas) return
  // 普通滚轮上下移动画布；按住 Ctrl / Command 才缩放（触控板捏合也会带 ctrlKey）。
  const deltaY = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
  if (!event.ctrlKey && !event.metaKey) {
    pan.value = {
      x: pan.value.x,
      y: pan.value.y - deltaY
    }
    return
  }
  const rect = canvas.getBoundingClientRect()
  const pointerX = event.clientX - rect.left
  const pointerY = event.clientY - rect.top
  const factor = deltaY < 0 ? 1.12 : 0.89
  const nextZoom = Math.min(2.4, Math.max(0.06, zoom.value * factor))
  const worldX = (pointerX - pan.value.x) / zoom.value
  const worldY = (pointerY - pan.value.y) / zoom.value
  zoom.value = nextZoom
  pan.value = {
    x: pointerX - worldX * nextZoom,
    y: pointerY - worldY * nextZoom
  }
}

function startPan(event: MouseEvent) {
  if (event.button !== 0) {
    event.preventDefault()
    event.stopPropagation()
    stopPan()
    return
  }
  panning.value = true
  panMoved = false
  panStart = {
    x: event.clientX,
    y: event.clientY,
    panX: pan.value.x,
    panY: pan.value.y
  }
  window.addEventListener('mousemove', onPan)
  window.addEventListener('mouseup', stopPan)
}

function onPan(event: MouseEvent) {
  if (!panning.value) return
  const dx = event.clientX - panStart.x
  const dy = event.clientY - panStart.y
  if (Math.abs(dx) + Math.abs(dy) > 4) panMoved = true
  pan.value = {
    x: panStart.panX + dx,
    y: panStart.panY + dy
  }
}

// 点空白处取消选中，同时去掉链路流动；拖动画布不算点击。
function handleCanvasClick(event: MouseEvent) {
  if (panMoved) {
    panMoved = false
    return
  }
  const target = event.target as HTMLElement | null
  if (target?.closest('.mindmap-node') || target?.closest('.map-overlay')) return
  selectedId.value = ''
}

function stopPan() {
  panning.value = false
  window.removeEventListener('mousemove', onPan)
  window.removeEventListener('mouseup', stopPan)
}

async function load() {
  loading.value = true
  loadError.value = ''
  const requested = typeof route.query.node === 'string' ? route.query.node : ''
  const requestedTemplate =
    typeof route.query.template === 'string' ? route.query.template : ''
  try {
    const result = await api.consultPurposes()
    payload.value = result
    const list = result.templates ?? []
    activeTemplateId.value =
      list.find((item) => item.id === requestedTemplate)?.id ??
      list.find((item) => item.id === result.meta.activeTemplateId)?.id ??
      list[0]?.id ??
      ''
    mapCollapsed.value = new Set((tree.value?.children ?? []).map((stage) => stage.id))
    selectedId.value = ''
    if (requested && nodeById.value.has(requested)) {
      nextTick(() => select(requested))
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '读取咨询树失败'
  } finally {
    loading.value = false
    if (!requested) nextTick(fitMap)
  }
}

function setTemplate(id: string) {
  if (id === activeTemplateId.value) return
  activeTemplateId.value = id
  selectedId.value = ''
  mapCollapsed.value = new Set((tree.value?.children ?? []).map((stage) => stage.id))
  router.replace({
    query: {
      ...route.query,
      template: id === payload.value?.meta.activeTemplateId ? undefined : id,
      node: undefined
    }
  })
  nextTick(fitMap)
}

function onTemplateChange(event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value
  if (value) setTemplate(value)
}

onMounted(() => {
  load()
  document.addEventListener('fullscreenchange', onFullscreenChange)
})
onBeforeUnmount(() => {
  stopPan()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

watch([query, onlyMainline], () => {
  nextTick(fitMap)
})
</script>

<style scoped>
.purpose-page {
  max-width: 1560px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 10px;
}

.page-title {
  margin-top: 1px;
  font-size: 24px;
  letter-spacing: -0.03em;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 13px;
  flex-wrap: wrap;
}


.head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.template-picker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-3);
  font-size: 11px;
  white-space: nowrap;
}

.template-picker select {
  height: 30px;
  padding: 0 26px 0 9px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-size: 12px;
  cursor: pointer;
}

.template-picker select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding: 6px 10px;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.stat {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  color: var(--ink-3);
  font-size: 10.5px;
}

.stat + .stat {
  padding-left: 10px;
  border-left: 1px solid var(--line);
}

.stat b {
  color: var(--ink);
  font-size: 12px;
  font-weight: 580;
  font-variant-numeric: tabular-nums;
}

.stat.gap {
  color: var(--amber);
}

.stat.gap b {
  color: var(--amber);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search {
  width: 230px;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 12px;
}

.filter-row .check {
  gap: 6px;
  font-size: 11.5px;
}

.filter-row .check input {
  width: 14px;
  height: 14px;
}

.purpose-layout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.list-card,
.map-card {
  min-width: 0;
}

.list-card {
  overflow: hidden;
  padding-bottom: 4px;
}

.stage-block + .stage-block {
  border-top: 1px solid var(--line);
}

.stage-head {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 15px 16px;
  border: 0;
  background: linear-gradient(180deg, rgba(47, 93, 70, 0.035), transparent);
  text-align: left;
  cursor: pointer;
}

.stage-head:hover {
  background: rgba(47, 93, 70, 0.06);
}

.stage-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.stage-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.stage-title {
  color: var(--ink);
  font-size: 14.5px;
  font-weight: 600;
}

.stage-summary {
  color: var(--ink-3);
  font-size: 11.5px;
  line-height: 1.5;
}

.stage-count {
  margin-left: auto;
  color: var(--ink-3);
  font-size: 11px;
  white-space: nowrap;
}

.stage-chev {
  flex: 0 0 auto;
  color: var(--ink-3);
  font-size: 12px;
}

.stage-body {
  padding: 0 0 10px;
}

.stage-empty {
  padding: 2px 18px 10px;
  color: var(--ink-3);
  font-size: 11.5px;
}

.purpose-row {
  margin: 6px 12px 0;
  padding: 11px 12px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.purpose-row:hover {
  border-color: var(--line-strong);
  background: #fffefa;
}

.purpose-row.optional {
  border-left-color: var(--amber);
  border-left-style: dashed;
  background: #fffdf6;
}

.purpose-row.gap {
  border-left-color: var(--line-strong);
  border-left-style: dotted;
  background: #fbfaf6;
}

.purpose-row.incomplete {
  border-left-color: var(--danger);
  border-left-style: dashed;
}

.purpose-row.group {
  border-left-color: #6b7f95;
}

.purpose-row.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.row-head {
  display: flex;
  align-items: flex-start;
  gap: 7px;
}

.fold-btn,
.fold-placeholder {
  flex: 0 0 auto;
  width: 18px;
  height: 22px;
}

.fold-btn {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink-3);
  font-size: 11px;
  cursor: pointer;
}

.fold-btn:hover {
  color: var(--accent);
}

.fold-placeholder {
  display: inline-block;
}

.row-main {
  min-width: 0;
  flex: 1 1 auto;
}

.row-title-line {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.row-title {
  color: var(--ink);
  font-size: 13.5px;
  font-weight: 560;
}

.row-summary {
  margin-top: 3px;
  color: var(--ink-2);
  font-size: 11.5px;
  line-height: 1.6;
}

.row-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 5px;
  color: var(--ink-3);
  font-size: 10.5px;
}

.badge {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--ink-3);
  font-size: 9.5px;
  font-weight: 500;
  white-space: nowrap;
}

.badge.optional {
  border-color: rgba(148, 98, 28, 0.28);
  background: rgba(148, 98, 28, 0.07);
  color: var(--amber);
}

.badge.group {
  border-color: rgba(107, 127, 149, 0.35);
  background: rgba(107, 127, 149, 0.08);
  color: #52667c;
}

.badge.gap {
  border-style: dashed;
}

.badge.incomplete {
  border-color: rgba(163, 58, 44, 0.3);
  background: rgba(163, 58, 44, 0.06);
  color: var(--danger);
}

.badge.count {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--accent);
}

.butterfly-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 7px;
  padding-top: 7px;
  border-top: 1px dashed var(--line);
}

.butterfly-label {
  color: var(--ink-3);
  font-size: 9.5px;
}

.butterfly {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border: 1px solid rgba(148, 98, 28, 0.24);
  border-radius: 999px;
  background: rgba(148, 98, 28, 0.08);
  color: var(--amber);
  font-size: 10px;
  line-height: 1.3;
  cursor: pointer;
}

.butterfly:hover {
  background: rgba(148, 98, 28, 0.14);
}

.detail-card {
  position: absolute;
  top: 56px;
  right: 12px;
  bottom: 12px;
  z-index: 12;
  width: 380px;
  overflow: auto;
  padding: 18px 19px 22px;
  background: rgba(255, 253, 248, 0.97);
  box-shadow: 0 14px 40px rgba(27, 26, 23, 0.16);
  backdrop-filter: blur(8px);
}

.detail-close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-3);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
}

.detail-close:hover {
  border-color: var(--line);
  background: var(--surface);
  color: var(--ink);
}

.detail-placeholder p + p {
  margin-top: 10px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  color: var(--ink-3);
  font-size: 10.5px;
}

.crumb-sep {
  color: var(--line-strong);
}

.crumb-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink-3);
  font-size: 10.5px;
  cursor: pointer;
}

.crumb-link:hover {
  color: var(--accent);
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding-right: 30px;
}

.detail-kind {
  color: var(--ink-3);
  font-size: 10px;
  letter-spacing: 0.08em;
}

.detail-head h2 {
  margin-top: 3px;
  font-size: 18px;
  line-height: 1.35;
}

.key-code {
  flex: 0 0 auto;
  max-width: 46%;
  padding: 3px 6px;
  border-radius: 5px;
  background: rgba(47, 93, 70, 0.06);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 9.5px;
  overflow-wrap: anywhere;
}

.detail-badges {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 7px;
}

.detail-summary {
  margin-top: 10px;
  color: var(--ink-2);
  font-size: 12.5px;
  line-height: 1.75;
}

.detail-metrics {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 11px;
  padding: 8px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  color: var(--ink-3);
  font-size: 10.5px;
}

.detail-metrics b {
  color: var(--ink);
  font-size: 12px;
  font-weight: 580;
}

.callout {
  margin-top: 12px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  background: rgba(47, 93, 70, 0.035);
  color: var(--ink-2);
  font-size: 11.5px;
  line-height: 1.65;
}

.callout.branch {
  border-left-color: #6b7f95;
  background: rgba(107, 127, 149, 0.06);
}

.callout.gap {
  border-left-color: var(--amber);
  border-style: dashed;
  background: rgba(148, 98, 28, 0.05);
}

.detail-section {
  margin-top: 17px;
}

.detail-section h3 {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 7px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
}

.detail-section h3 .quiet {
  font-weight: 400;
}

.note-list {
  display: grid;
  gap: 6px;
  padding-left: 16px;
  color: var(--ink-2);
  font-size: 11.5px;
  line-height: 1.65;
}

.example {
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #fffefa;
  overflow: hidden;
}

.example + .example {
  margin-top: 7px;
}

.example summary {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  padding: 8px 10px;
  cursor: pointer;
  list-style: none;
}

.example summary::-webkit-details-marker {
  display: none;
}

.source {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9.5px;
  font-weight: 500;
}

.source.july {
  background: rgba(47, 93, 70, 0.1);
  color: var(--accent);
}

.source.sep {
  background: rgba(148, 98, 28, 0.1);
  color: var(--amber);
}

.range {
  color: var(--ink-2);
  font-family: var(--mono);
  font-size: 9.5px;
}

.ex-note {
  flex-basis: 100%;
  color: var(--ink-3);
  font-size: 10px;
  line-height: 1.5;
}

.turns {
  display: grid;
  gap: 7px;
  padding: 0 10px 10px;
}

.turn {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 7px;
  padding: 7px 8px;
  border-radius: 7px;
  background: rgba(47, 93, 70, 0.045);
}

.turn.student {
  background: rgba(148, 98, 28, 0.07);
}

.turn-role {
  color: var(--accent);
  font-size: 9.5px;
  font-weight: 500;
}

.turn.student .turn-role {
  color: var(--amber);
}

.turn p {
  color: var(--ink);
  font-size: 11.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chip-list {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.link-chip {
  padding: 4px 8px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink-2);
  font-size: 10.5px;
  cursor: pointer;
}

.link-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.map-card {
  padding: 0;
  overflow: hidden;
}

.map-card:fullscreen {
  display: flex;
  width: 100vw;
  height: 100vh;
  border: 0;
  border-radius: 0;
  background: var(--paper);
}

.map-card:fullscreen .mindmap-canvas {
  height: 100vh;
}

.mindmap-canvas {
  position: relative;
  width: 100%;
  height: clamp(540px, calc(100vh - 200px), 900px);
  overflow: hidden;
  background:
    radial-gradient(circle, rgba(47, 93, 70, 0.12) 1px, transparent 1px) 0 0 / 22px 22px,
    #fbf9f2;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.mindmap-canvas.dragging {
  cursor: grabbing;
}

.map-overlay {
  position: absolute;
  z-index: 3;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 5px;
  border: 1px solid rgba(214, 208, 194, 0.9);
  border-radius: 9px;
  background: rgba(255, 253, 248, 0.94);
  box-shadow: 0 4px 12px rgba(27, 26, 23, 0.08);
}

.map-actions {
  display: flex;
  align-items: center;
  gap: 3px;
}

.map-control {
  height: 25px;
  padding: 0 7px;
  border-radius: 6px;
  font-size: 10.5px;
}

.map-zoom {
  min-width: 32px;
  color: var(--ink-2);
  font-family: var(--mono);
  font-size: 10px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.mindmap-stage {
  position: absolute;
  inset: 0 auto auto 0;
  transform-origin: 0 0;
}

.mindmap-links {
  position: absolute;
  inset: 0;
  color: #c9c2b2;
  pointer-events: none;
}

.mindmap-links path {
  stroke: currentColor;
  stroke-width: 1.4;
  transition: opacity 0.16s ease, stroke-width 0.16s ease;
}

.mindmap-links path.on-path {
  stroke: var(--accent);
  stroke-width: 2.6;
  stroke-dasharray: 9 7;
  animation: map-flow 0.85s linear infinite;
}

.mindmap-links path.dimmed {
  opacity: 0.16;
}

@keyframes map-flow {
  to {
    stroke-dashoffset: -16;
  }
}

.mindmap-node {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 216px;
  height: 90px;
  padding: 8px 9px 8px 11px;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 2px 8px rgba(27, 26, 23, 0.06);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: opacity 0.16s ease, box-shadow 0.16s ease;
}

.mindmap-node.dimmed {
  opacity: 0.42;
}

.mindmap-node.dimmed:hover {
  opacity: 1;
}

.mindmap-node.on-path:not(.selected) {
  box-shadow: 0 0 0 2px var(--accent-soft), 0 2px 8px rgba(27, 26, 23, 0.06);
}

.mindmap-node:hover {
  border-color: var(--accent);
}

.mindmap-node.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft), 0 3px 10px rgba(27, 26, 23, 0.08);
}

.mindmap-node.root {
  border-color: var(--accent);
  background: var(--accent);
}

.mindmap-node.root .map-node-kicker,
.mindmap-node.root .map-node-label,
.mindmap-node.root .map-node-meta,
.mindmap-node.root .map-fold {
  color: rgba(255, 255, 255, 0.86);
}

.mindmap-node.stage {
  border-color: rgba(47, 93, 70, 0.42);
  background: #f3f7f1;
}

.mindmap-node.optional {
  border-color: rgba(148, 98, 28, 0.48);
  border-style: dashed;
  background: #fffdf5;
}

.mindmap-node.gap {
  border-color: var(--line-strong);
  border-style: dotted;
  background: #faf9f4;
}

.mindmap-node.incomplete {
  border-color: rgba(163, 58, 44, 0.5);
  border-style: dashed;
}

.mindmap-node.group {
  border-color: rgba(107, 127, 149, 0.5);
}

.map-node-main {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.map-node-kicker {
  color: var(--ink-3);
  font-size: 8.5px;
  letter-spacing: 0.06em;
}

.map-node-label {
  display: -webkit-box;
  overflow: hidden;
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 560;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.map-node-meta {
  overflow: hidden;
  color: var(--ink-3);
  font-size: 8.5px;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.map-butterflies {
  display: flex;
  gap: 3px;
  overflow: hidden;
  margin-top: 1px;
}

.map-butterfly {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  max-width: 92px;
  padding: 1px 4px;
  overflow: hidden;
  border: 1px solid rgba(148, 98, 28, 0.24);
  border-radius: 999px;
  background: rgba(148, 98, 28, 0.08);
  color: var(--amber);
  font-size: 8px;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.map-butterfly.more {
  color: var(--ink-3);
  border-color: var(--line);
  background: transparent;
}

.map-fold {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface);
  color: var(--ink-3);
  font-size: 12px;
  line-height: 1;
}

.map-fold:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.mindmap-node.root .map-fold {
  border-color: rgba(255, 255, 255, 0.34);
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
}

.mindmap-node.root .map-fold:hover {
  background: rgba(255, 255, 255, 0.22);
}

.map-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--ink-3);
  font-size: 12px;
}

@media (max-width: 1180px) {
  .detail-card {
    left: 12px;
    width: auto;
  }
}

@media (max-width: 720px) {
  .page-head {
    flex-direction: column;
  }

  .filter-bar {
    align-items: flex-start;
  }

  .search {
    width: 100%;
  }

  .stage-summary,
  .detail-head {
    flex-direction: column;
  }

  .key-code {
    max-width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mindmap-links path.on-path {
    animation: none;
  }
}
</style>
