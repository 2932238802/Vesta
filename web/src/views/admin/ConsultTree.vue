<template>
  <div class="consult-tree-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">咨询</p>
        <div class="title-row">
          <h1 class="page-title">咨询路径</h1>
          <div class="view-switch" role="group" aria-label="查看方式">
            <button
              class="view-switch-btn"
              :class="{ on: viewMode === 'list' }"
              type="button"
              @click="setViewMode('list')"
            >
              列表
            </button>
            <button
              class="view-switch-btn"
              :class="{ on: viewMode === 'map' }"
              type="button"
              @click="setViewMode('map')"
            >
              思维导图
            </button>
          </div>
        </div>
      </div>
      <div class="head-actions">
        <span v-if="dirty" class="chip warn">未保存</span>
        <button class="btn ghost small" type="button" :disabled="loading" @click="expandAll">
          全部展开
        </button>
        <button class="btn ghost small" type="button" :disabled="loading" @click="collapseAll">
          全部收起
        </button>
        <button class="btn ghost small" type="button" :disabled="loading" @click="togglePathOnly">
          {{ pathOnly ? '查看整棵树' : '只看当前路径' }}
        </button>
        <button class="btn small" type="button" :disabled="saving || !dirty" @click="save">
          {{ saving ? '保存中' : '保存' }}
        </button>
      </div>
    </header>

    <section v-if="forest" class="tree-bar card">
      <label class="tree-select">
        <span>当前咨询树</span>
        <select class="select" :value="tree?.id" @change="switchTree(($event.target as HTMLSelectElement).value)">
          <option v-for="item in trees" :key="item.id" :value="item.id">
            {{ item.name }} · {{ nodeCount(item) }} 句
          </option>
        </select>
      </label>
      <span class="quiet tiny">共 {{ trees.length }} 棵；相同句子会自动共用同一个节点。</span>
      <div class="tree-bar-actions">
        <button class="btn ghost small" type="button" @click="createTree">新建咨询树</button>
        <button class="btn ghost small" type="button" :disabled="!tree" @click="renameTree">重命名</button>
        <button class="btn quiet small danger-text" type="button" :disabled="trees.length <= 1 || !tree" @click="deleteTree">
          删除这棵
        </button>
      </div>
    </section>

    <div v-if="loading" class="card empty">正在读取咨询路径</div>
    <div v-else-if="loadError" class="card empty">
      {{ loadError }}
      <div class="empty-action">
        <button class="btn ghost small" type="button" @click="load">重新读取</button>
      </div>
    </div>

    <template v-else-if="tree">
      <p v-if="actionError" class="notice">{{ actionError }}</p>

      <div
        ref="treeLayout"
        class="tree-layout"
        :class="{ 'editor-collapsed': editorCollapsed, resizing }"
        :style="{ '--side-width': `${sideWidth}px` }"
      >
        <section class="card tree-card" :class="{ 'canvas-expanded': canvasExpanded }">
          <div class="tree-search">
            <input
              v-model="searchText"
              class="input"
              type="search"
              maxlength="200"
              placeholder="搜索一句话，快速定位到很深的轮次"
              @keyup.enter="locateSearch"
            />
            <button class="btn ghost small" type="button" @click="locateSearch">定位</button>
            <button class="btn ghost small" type="button" @click="toggleCanvasExpanded">
              {{ canvasExpanded ? '退出全屏' : '全屏查看' }}
            </button>
            <span v-if="searchError" class="quiet tiny search-error">{{ searchError }}</span>
          </div>

          <div v-if="viewMode === 'list'" class="tree-table" role="tree">
            <div class="tree-columns" aria-hidden="true">
              <span>咨询师要说的话</span>
            </div>
            <div
              v-for="row in rows"
              :key="row.node.id"
              class="tree-row"
              :class="{
                selected: selectedId === row.node.id,
                located: locatedId === row.node.id,
                onpath: selectedPathIds.has(row.node.id),
                'drop-target': dropTargetId === row.node.id
              }"
              :data-node-id="row.node.id"
              :style="{ paddingLeft: `${12 + Math.min(row.depth, 8) * 18}px` }"
              :draggable="row.depth > 0"
              role="treeitem"
              @click="selectRow(row.node.id)"
              @dblclick="toggleNodeEditor(row.node.id)"
              @dragstart="startDrag(row.node.id, $event)"
              @dragover.prevent="dropTargetId = row.node.id"
              @dragleave="dropTargetId = ''"
              @drop.prevent="dropOn(row.node.id)"
            >
              <span class="tree-main">
                <button
                  v-if="row.node.children.length"
                  class="expand-btn"
                  type="button"
                  :aria-label="expanded.has(row.node.id) ? '收起' : '展开'"
                  @click.stop="toggle(row.node.id)"
                >
                  {{ expanded.has(row.node.id) ? '▾' : '▸' }}
                </button>
                <span v-else class="expand-placeholder" />
                <span class="node-type" :class="row.node.type">{{ nodeTypeLabel(row.node.type) }}</span>
                <span class="node-depth">第 {{ row.depth + 1 }} 轮</span>
                <span class="node-text" :class="{ placeholder: !row.node.text }">
                  {{ row.node.text || '还没有导入开场白' }}
                </span>
              </span>
              <button
                class="add-child"
                type="button"
                title="在后面加一句"
                @click.stop="addChild(row.node)"
              >
                ＋
              </button>
            </div>
          </div>
          <div v-else class="mindmap-shell">
            <div
              ref="mapCanvas"
              class="mindmap-canvas"
              :class="{ dragging: panning }"
              @mousedown="startPan"
              @mousedown.right.prevent
              @mouseup.right.prevent
              @auxclick.prevent
              @contextmenu.prevent
              @dragstart.prevent
              @wheel.prevent="handleWheel"
            >
              <div class="mindmap-overlay" @mousedown.stop @contextmenu.prevent>
                <button
                  class="map-tools-toggle"
                  type="button"
                  :aria-expanded="!mapToolsCollapsed"
                  @click="mapToolsCollapsed = !mapToolsCollapsed"
                >
                  {{ mapToolsCollapsed ? '工具' : '隐藏' }}
                </button>
                <div v-if="!mapToolsCollapsed" class="mindmap-tools-panel">
                  <span class="mindmap-hint">拖动空白移动 · 滚轮缩放 · 双击节点编辑</span>
                  <div class="mindmap-actions">
                    <button class="btn ghost map-control" type="button" @click="zoomMap(0.85)">缩小</button>
                    <span class="map-zoom">{{ Math.round(zoom * 100) }}%</span>
                    <button class="btn ghost map-control" type="button" @click="zoomMap(1.18)">放大</button>
                    <button class="btn ghost map-control" type="button" @click="fitMap">适应</button>
                    <button
                      v-if="editorCollapsed && selectedNode"
                      class="btn map-control map-primary"
                      type="button"
                      @click="editorCollapsed = false"
                    >
                      编辑所选
                    </button>
                  </div>
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
                    stroke="currentColor"
                  />
                </svg>
                <button
                  v-for="item in mapNodes"
                  :key="item.node.id"
                  class="mindmap-node"
                  :class="{
                    selected: selectedId === item.node.id,
                    located: locatedId === item.node.id,
                    onpath: selectedPathIds.has(item.node.id),
                    leaf: !item.node.children.length
                  }"
                  :data-node-id="item.node.id"
                  type="button"
                  :style="{
                    left: `${item.x}px`,
                    top: `${item.y - MAP_NODE_HEIGHT / 2}px`
                  }"
                  @mousedown.stop
                  @mousedown.right.prevent
                  @mouseup.right.prevent
                  @auxclick.prevent
                  @contextmenu.prevent
                  @click="selectRow(item.node.id)"
                  @dblclick.stop="toggleNodeEditor(item.node.id)"
                >
                  <span class="mindmap-node-main">
                    <span class="mindmap-node-text" :class="{ placeholder: !item.node.text }">
                      {{ item.node.text || '还没有导入开场白' }}
                    </span>
                    <span class="mindmap-node-meta">第 {{ item.depth + 1 }} 轮</span>
                  </span>
                  <span
                    v-if="item.node.children.length"
                    class="mindmap-toggle"
                    role="button"
                    :aria-label="expanded.has(item.node.id) ? '收起' : '展开'"
                    @click.stop="toggleMindmapNode(item.node.id)"
                  >
                    {{ expanded.has(item.node.id) ? '−' : '+' }}
                  </span>
                </button>
              </div>
              <div v-if="mapNodes.length === 0" class="mindmap-empty">没有可显示的节点</div>
            </div>
          </div>
        </section>

        <div
          v-if="!editorCollapsed"
          class="split-handle"
          role="separator"
          aria-orientation="vertical"
          title="拖动调整宽度"
          @mousedown.prevent="startResize"
        />

        <aside v-if="!editorCollapsed" class="side-stack">
          <section v-if="selectedNode" class="card editor-card">
            <header class="editor-head">
              <div>
                <h2>这一句怎么说</h2>
              </div>
              <div class="editor-head-actions">
                <span class="chip">{{ nodeTypeLabel(selectedNode.type) }}</span>
                <button class="btn quiet small" type="button" @click="editorCollapsed = true">
                  收起
                </button>
              </div>
            </header>

            <div class="editor-form">
              <label class="field">
                <span>咨询师要说的话</span>
                <textarea v-model="selectedNode.text" class="textarea" rows="4" maxlength="2000" />
              </label>

              <div class="field-row">
                <label class="field">
                  <span>位置</span>
                  <select v-model="selectedNode.type" class="select" :disabled="selectedNode.type === 'root'">
                    <option value="root" :disabled="!isRoot(selectedNode)">开场</option>
                    <option value="branch">中间</option>
                    <option value="leaf">结束</option>
                  </select>
                </label>
                <label class="field">
                  <span>这一段用哪种风格（可选）</span>
                  <select v-model="selectedNode.metadata!.templateId" class="select">
                    <option value="">跟随本次选择</option>
                    <option v-for="template in templates" :key="template.id" :value="template.id">
                      {{ template.name }}
                    </option>
                  </select>
                </label>
              </div>

              <details class="node-advanced">
                <summary>高级设置（一般不用改）</summary>
                <div class="advanced-body">
                  <div class="metric-grid">
                    <label class="field">
                      <span>权重</span>
                      <input v-model.number="selectedNode.weight" class="input" type="number" min="0" step="0.1" />
                    </label>
                    <label class="field">
                      <span>奖励分</span>
                      <input v-model.number="selectedNode.reward" class="input" type="number" min="0" step="0.5" />
                    </label>
                    <label class="field">
                      <span>惩罚分</span>
                      <input v-model.number="selectedNode.penalty" class="input" type="number" min="0" step="0.5" />
                    </label>
                  </div>

                  <label class="field">
                    <span>匹配关键词（逗号隔开）</span>
                    <input
                      :value="(selectedNode.metadata?.tags ?? []).join(', ')"
                      class="input"
                      type="text"
                      maxlength="500"
                      placeholder="例：求职, 城市, 英语"
                      @input="updateTags"
                    />
                  </label>
                  <p class="quiet tiny">这句话被用过 {{ selectedNode.selectedCount ?? 0 }} 次。</p>
                </div>
              </details>

              <section class="answer-history">
                <header class="answer-history-head">
                  <div>
                    <h3>历史回答</h3>
                    <p class="quiet tiny">学生听完这句话后，以前的回答会积累在这里。</p>
                  </div>
                  <span class="chip">{{ selectedNode.metadata?.answerHistory?.length ?? 0 }} 条</span>
                </header>
                <p v-if="!selectedNode.metadata?.answerHistory?.length" class="answer-empty">
                  还没有历史回答。导入成交对话或生成咨询稿后，这里会自动记录。
                </p>
                <div v-else class="answer-list">
                  <article
                    v-for="answer in selectedNode.metadata.answerHistory"
                    :key="answer.id"
                    class="answer-item"
                  >
                    <header class="answer-meta">
                      <span>{{ answer.studentName || '匿名学生' }}</span>
                      <span class="quiet tiny">
                        {{ answer.source === 'import' ? '成交稿' : '生成记录' }} · {{ formatDate(answer.createdAt, false) }}
                      </span>
                    </header>
                    <p class="answer-text">{{ answer.text }}</p>
                    <div v-if="answer.tags.length" class="answer-tags">
                      <span v-for="tag in answer.tags" :key="tag" class="chip">{{ tag }}</span>
                    </div>
                  </article>
                </div>
              </section>

              <div class="node-actions">
                <button
                  class="btn ghost small"
                  type="button"
                  :disabled="isRoot(selectedNode)"
                  @click="goPrev"
                >
                  上一句
                </button>
                <button
                  class="btn ghost small"
                  type="button"
                  :disabled="selectedNode.children.length === 0"
                  @click="goNext"
                >
                  下一句
                </button>
                <button class="btn ghost small" type="button" @click="addChild(selectedNode)">在后面加一句</button>
                <button
                  class="btn ghost small"
                  type="button"
                  :disabled="isRoot(selectedNode)"
                  @click="moveSelected(-1)"
                >
                  上移
                </button>
                <button
                  class="btn ghost small"
                  type="button"
                  :disabled="isRoot(selectedNode)"
                  @click="moveSelected(1)"
                >
                  下移
                </button>
                <button
                  class="btn quiet small danger-text"
                  type="button"
                  :disabled="isRoot(selectedNode)"
                  @click="removeSelected"
                >
                  删除
                </button>
              </div>
            </div>
          </section>

          <details class="card import-card">
            <summary>导入成交对话</summary>
            <div class="import-body">
              <p class="quiet tiny">
                可以直接粘贴整段多轮对话：一行一句，咨询师的话写“咨询师：”，学生回答写“学生：”；空行分隔不同对话。
                也可以每个对话用 → 连成一行。多条对话会按相同句子自动共享节点，学生回答会挂在前一句咨询师的话下面。
              </p>
              <div class="import-target">
                <label class="check">
                  <input v-model="importMode" type="radio" value="current" />
                  合并到当前树“{{ tree.name }}”
                </label>
                <label class="check">
                  <input v-model="importMode" type="radio" value="new" />
                  导入成一棵新树
                </label>
                <input
                  v-if="importMode === 'new'"
                  v-model="importTreeName"
                  class="input"
                  type="text"
                  maxlength="60"
                  placeholder="新咨询树名称，例如：七月成交稿"
                />
              </div>
              <textarea
                v-model="importText"
                class="textarea"
                rows="5"
                placeholder="咨询师：还不确定毕业以后做什么也没关系。你现在更想继续读书，还是先工作看看？ → 学生：我想先工作，但不知道做什么 → 咨询师：想直接工作的话，我们先从你能接受的岗位和城市开始缩小范围。"
              />
              <p v-if="importError" class="notice">{{ importError }}</p>
              <div class="import-actions">
                <button class="btn small" type="button" :disabled="importing" @click="importPaths">
                  {{ importing ? '正在导入' : importMode === 'new' ? '导入为新树' : '合并进当前树' }}
                </button>
              </div>
            </div>
          </details>

          <details class="card scoring-card">
            <summary>高级调整（一般不用改）</summary>
            <div class="scoring-body">
              <p class="quiet tiny">
                这些数值会影响系统怎样挑方向。没有特别需要时，保持现在的设置即可。
              </p>
              <div class="metric-grid four">
                <label class="field">
                  <span>α 奖励</span>
                  <input v-model.number="scoring.alpha" class="input" type="number" min="0" step="0.1" />
                </label>
                <label class="field">
                  <span>β 惩罚</span>
                  <input v-model.number="scoring.beta" class="input" type="number" min="0" step="0.1" />
                </label>
                <label class="field">
                  <span>γ 上下文</span>
                  <input v-model.number="scoring.gamma" class="input" type="number" min="0" step="0.1" />
                </label>
                <label class="field">
                  <span>ε 探索率</span>
                  <input v-model.number="scoring.epsilon" class="input" type="number" min="0" max="1" step="0.01" />
                </label>
              </div>
              <div class="decay-row">
                <span class="quiet tiny">如果旧记录影响太大，可以让它慢慢变小。</span>
                <button class="btn quiet small" type="button" :disabled="decaying" @click="decay">
                  {{ decaying ? '正在调整' : '让旧记录影响变小' }}
                </button>
              </div>
            </div>
          </details>
        </aside>
      </div>
    </template>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import {
  api,
  type ConsultForest,
  type ConsultNode,
  type ConsultNodeType,
  type ConsultScoringConfig,
  type ConsultTemplate,
  type ConsultTree
} from '@/api'
import { createConsultNode } from '@shared/consult'
import { formatDate } from '@/format'
import { useUnsavedChanges } from '@/useUnsavedChanges'

interface TreeRow {
  node: ConsultNode
  depth: number
  parentId: string | null
}

interface MindmapNode {
  node: ConsultNode
  depth: number
  x: number
  y: number
}

interface MindmapEdge {
  id: string
  d: string
}

const MAP_NODE_WIDTH = 190
const MAP_NODE_HEIGHT = 58
const MAP_X_GAP = 230
const MAP_Y_GAP = 76
const MAP_PADDING = 48

const tree = ref<ConsultTree | null>(null)
const forest = ref<ConsultForest | null>(null)
const templates = ref<ConsultTemplate[]>([])
const scoring = ref<ConsultScoringConfig>({ alpha: 1, beta: 0.5, gamma: 2, epsilon: 0.05 })
const expanded = ref(new Set<string>())
const selectedId = ref('')
const dragId = ref('')
const dropTargetId = ref('')
const importText = ref('')
const importMode = ref<'current' | 'new'>('current')
const importTreeName = ref('')
const importError = ref('')
const importing = ref(false)
const decaying = ref(false)
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const toast = ref('')
const savedSnapshot = ref('')
const pathOnly = ref(false)
const searchText = ref('')
const searchError = ref('')
const locatedId = ref('')
const viewMode = ref<'list' | 'map'>('list')
const editorCollapsed = ref(false)
const canvasExpanded = ref(false)
const mapToolsCollapsed = ref(false)
const treeLayout = ref<HTMLElement | null>(null)
const sideWidth = ref(380)
const resizing = ref(false)
const mapCanvas = ref<HTMLElement | null>(null)
const pan = ref({ x: 24, y: 24 })
const zoom = ref(1)
const panning = ref(false)
let panStart: { x: number; y: number; panX: number; panY: number } | null = null
let resizeStart: { x: number; width: number } | null = null
let locateTimer = 0

const rows = computed(() => {
  if (!tree.value) return []
  if (pathOnly.value && selectedPath.value.length) {
    return selectedPath.value.map((node, index) => ({
      node,
      depth: index,
      parentId: index > 0 ? selectedPath.value[index - 1].id : null
    }))
  }
  return flatten(tree.value.root, 0, null)
})
const mapLayout = computed(() => {
  if (!tree.value) return { nodes: [] as MindmapNode[], edges: [] as MindmapEdge[], size: { width: 1, height: 1 } }
  return layoutMindmap(tree.value.root)
})
const mapNodes = computed(() => mapLayout.value.nodes)
const mapEdges = computed(() => mapLayout.value.edges)
const mapSize = computed(() => mapLayout.value.size)
const selectedNode = computed(() => {
  if (!tree.value || !selectedId.value) return null
  return findNode(tree.value.root, selectedId.value)
})
const selectedPath = computed(() => {
  if (!tree.value || !selectedId.value) return []
  return pathToNode(tree.value.root, selectedId.value) ?? []
})
const selectedPathIds = computed(() => new Set(selectedPath.value.map((node) => node.id)))
const dirty = computed(() => {
  if (!tree.value) return false
  return JSON.stringify({ tree: tree.value, scoring: scoring.value }) !== savedSnapshot.value
})

const trees = computed(() => forest.value?.trees ?? (tree.value ? [tree.value] : []))

useUnsavedChanges(dirty, '咨询路径还有未保存的修改，确定离开？')

function flatten(node: ConsultNode, depth: number, parentId: string | null): TreeRow[] {
  const result: TreeRow[] = []
  const stack: TreeRow[] = [{ node, depth, parentId }]
  while (stack.length) {
    const row = stack.pop()!
    result.push(row)
    if (!expanded.value.has(row.node.id)) continue
    for (let index = row.node.children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: row.node.children[index], depth: row.depth + 1, parentId: row.node.id })
    }
  }
  return result
}

function findNode(node: ConsultNode, id: string): ConsultNode | null {
  const stack = [node]
  while (stack.length) {
    const current = stack.pop()!
    if (current.id === id) return current
    for (const child of current.children) stack.push(child)
  }
  return null
}

function pathToNode(node: ConsultNode, id: string): ConsultNode[] | null {
  const stack: { node: ConsultNode; path: ConsultNode[] }[] = [{ node, path: [] }]
  while (stack.length) {
    const current = stack.pop()!
    const next = [...current.path, current.node]
    if (current.node.id === id) return next
    for (let index = current.node.children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: current.node.children[index], path: next })
    }
  }
  return null
}

function findParent(root: ConsultNode, id: string): { parent: ConsultNode; index: number } | null {
  const stack = [root]
  while (stack.length) {
    const node = stack.pop()!
    const index = node.children.findIndex((child) => child.id === id)
    if (index >= 0) return { parent: node, index }
    for (const child of node.children) stack.push(child)
  }
  return null
}

function layoutMindmap(root: ConsultNode): {
  nodes: MindmapNode[]
  edges: MindmapEdge[]
  size: { width: number; height: number }
} {
  const base: { node: ConsultNode; depth: number; parentId: string | null }[] = []
  if (pathOnly.value && selectedPath.value.length) {
    for (const [index, node] of selectedPath.value.entries()) {
      base.push({ node, depth: index, parentId: index > 0 ? selectedPath.value[index - 1].id : null })
    }
  } else {
    const stack: { node: ConsultNode; depth: number; parentId: string | null }[] = [
      { node: root, depth: 0, parentId: null }
    ]
    while (stack.length) {
      const item = stack.pop()!
      base.push(item)
      if (!expanded.value.has(item.node.id)) continue
      for (let index = item.node.children.length - 1; index >= 0; index -= 1) {
        stack.push({
          node: item.node.children[index],
          depth: item.depth + 1,
          parentId: item.node.id
        })
      }
    }
  }

  const children = new Map<string, string[]>()
  for (const item of base) {
    if (!item.parentId) continue
    const list = children.get(item.parentId) ?? []
    list.push(item.node.id)
    children.set(item.parentId, list)
  }

  const yById = new Map<string, number>()
  let leafCursor = 0
  for (let index = base.length - 1; index >= 0; index -= 1) {
    const item = base[index]
    const childIds = children.get(item.node.id) ?? []
    if (!childIds.length) {
      yById.set(item.node.id, leafCursor * MAP_Y_GAP)
      leafCursor += 1
    } else {
      const first = yById.get(childIds[0]) ?? 0
      const last = yById.get(childIds[childIds.length - 1]) ?? first
      yById.set(item.node.id, (first + last) / 2)
    }
  }

  const xById = new Map<string, number>()
  const nodes = base.map((item) => {
    const x = MAP_PADDING + item.depth * MAP_X_GAP
    const y = MAP_PADDING + (yById.get(item.node.id) ?? 0)
    xById.set(item.node.id, x)
    return { node: item.node, depth: item.depth, x, y }
  })

  const edges: MindmapEdge[] = []
  for (const item of base) {
    if (!item.parentId) continue
    const parentX = (xById.get(item.parentId) ?? 0) + MAP_NODE_WIDTH
    const parentY = MAP_PADDING + (yById.get(item.parentId) ?? 0)
    const childX = xById.get(item.node.id) ?? 0
    const childY = MAP_PADDING + (yById.get(item.node.id) ?? 0)
    const middle = (parentX + childX) / 2
    edges.push({
      id: `${item.parentId}-${item.node.id}`,
      d: `M ${parentX} ${parentY} C ${middle} ${parentY}, ${middle} ${childY}, ${childX} ${childY}`
    })
  }

  const depth = base.reduce((max, item) => Math.max(max, item.depth), 0)
  const leafCount = Math.max(1, leafCursor)
  return {
    nodes,
    edges,
    size: {
      width: MAP_PADDING * 2 + depth * MAP_X_GAP + MAP_NODE_WIDTH,
      height: MAP_PADDING * 2 + (leafCount - 1) * MAP_Y_GAP + MAP_NODE_HEIGHT
    }
  }
}

function snapshot() {
  savedSnapshot.value = JSON.stringify({ tree: tree.value, scoring: scoring.value })
}

function expandAll() {
  if (!tree.value) return
  const ids = new Set<string>()
  const stack = [tree.value.root]
  while (stack.length) {
    const node = stack.pop()!
    if (node.children.length) ids.add(node.id)
    for (const child of node.children) stack.push(child)
  }
  expanded.value = ids
}

function collapseAll() {
  if (!tree.value) return
  expanded.value = new Set()
}

function toggle(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function togglePathOnly() {
  pathOnly.value = !pathOnly.value
  if (viewMode.value === 'map') nextTick(fitMap)
}

function setViewMode(mode: 'list' | 'map') {
  viewMode.value = mode
  if (mode === 'map') {
    editorCollapsed.value = true
    nextTick(fitMap)
  }
}

function toggleCanvasExpanded() {
  canvasExpanded.value = !canvasExpanded.value
  document.body.classList.toggle('consult-canvas-expanded', canvasExpanded.value)
  if (viewMode.value === 'map') nextTick(fitMap)
}

function exitCanvasExpanded() {
  if (!canvasExpanded.value) return
  canvasExpanded.value = false
  document.body.classList.remove('consult-canvas-expanded')
  if (viewMode.value === 'map') nextTick(fitMap)
}

function handleCanvasKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') exitCanvasExpanded()
}

function toggleMindmapNode(id: string) {
  toggle(id)
}

function fitMap() {
  const canvas = mapCanvas.value
  if (!canvas) return
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (!width || !height) return
  const targetZoom = Math.min(
    1.2,
    Math.max(0.005, Math.min((width - 36) / mapSize.value.width, (height - 36) / mapSize.value.height))
  )
  zoom.value = targetZoom
  pan.value = {
    x: (width - mapSize.value.width * targetZoom) / 2,
    y: (height - mapSize.value.height * targetZoom) / 2
  }
}

function zoomMap(factor: number) {
  const canvas = mapCanvas.value
  if (!canvas) return
  const nextZoom = Math.min(2.5, Math.max(0.005, zoom.value * factor))
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
  const rect = canvas.getBoundingClientRect()
  const pointerX = event.clientX - rect.left
  const pointerY = event.clientY - rect.top
  const factor = event.deltaY < 0 ? 1.12 : 0.89
  const nextZoom = Math.min(2.5, Math.max(0.005, zoom.value * factor))
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
  if (!panStart) return
  if ((event.buttons & 1) === 0) {
    stopPan()
    return
  }
  pan.value = {
    x: panStart.panX + event.clientX - panStart.x,
    y: panStart.panY + event.clientY - panStart.y
  }
}

function stopPan() {
  panning.value = false
  panStart = null
  window.removeEventListener('mousemove', onPan)
  window.removeEventListener('mouseup', stopPan)
}

function startResize(event: MouseEvent) {
  if (event.button !== 0) return
  resizing.value = true
  resizeStart = { x: event.clientX, width: sideWidth.value }
  window.addEventListener('mousemove', onResize)
  window.addEventListener('mouseup', stopResize)
}

function onResize(event: MouseEvent) {
  if (!resizeStart) return
  const layout = treeLayout.value
  const layoutWidth = layout?.getBoundingClientRect().width ?? window.innerWidth
  const maxWidth = Math.max(320, Math.min(860, layoutWidth - 420))
  const nextWidth = resizeStart.width + resizeStart.x - event.clientX
  sideWidth.value = Math.min(maxWidth, Math.max(300, nextWidth))
}

function stopResize() {
  resizing.value = false
  resizeStart = null
  window.removeEventListener('mousemove', onResize)
  window.removeEventListener('mouseup', stopResize)
}

function locateSearch() {
  searchError.value = ''
  const needle = searchText.value.trim().toLocaleLowerCase()
  if (!needle || !tree.value) return
  const stack = [tree.value.root]
  let found: ConsultNode | null = null
  while (stack.length) {
    const node = stack.pop()!
    if (node.text.toLocaleLowerCase().includes(needle)) {
      found = node
      break
    }
    for (const child of node.children) stack.push(child)
  }
  if (!found) {
    searchError.value = '没有找到这句话'
    return
  }
  const path = pathToNode(tree.value.root, found.id)
  if (path) {
    const next = new Set(expanded.value)
    for (const node of path) next.add(node.id)
    expanded.value = next
  }
  selectRow(found.id)
  markLocated(found.id)
  nextTick(() => {
    if (viewMode.value === 'map') fitMap()
    requestAnimationFrame(() => {
      const selector = `[data-node-id="${window.CSS.escape(found!.id)}"]`
      const target = treeLayout.value?.querySelector<HTMLElement>(selector)
      target?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
    })
  })
}

function markLocated(id: string) {
  window.clearTimeout(locateTimer)
  locatedId.value = id
  locateTimer = window.setTimeout(() => {
    locatedId.value = ''
  }, 3200)
}

function goPrev() {
  if (!tree.value || !selectedId.value) return
  const found = findParent(tree.value.root, selectedId.value)
  if (found) selectRow(found.parent.id)
}

function goNext() {
  const node = selectedNode.value
  if (!node?.children.length) return
  expanded.value = new Set([...expanded.value, node.id])
  selectRow(node.children[0].id)
  if (viewMode.value === 'map') nextTick(fitMap)
}

function selectRow(id: string) {
  if (locatedId.value && locatedId.value !== id) locatedId.value = ''
  selectedId.value = id
  const node = tree.value ? findNode(tree.value.root, id) : null
  if (node && !node.metadata) node.metadata = { tags: [] }
}

function toggleNodeEditor(id: string) {
  selectRow(id)
  editorCollapsed.value = !editorCollapsed.value
}

function isRoot(node: ConsultNode): boolean {
  return tree.value?.root.id === node.id
}

function addChild(node: ConsultNode) {
  const child = createConsultNode('新的一句话', 'leaf')
  node.children.push(child)
  if (node.type === 'leaf') node.type = 'branch'
  expanded.value = new Set([...expanded.value, node.id])
  selectRow(child.id)
}

function removeSelected() {
  if (!tree.value || !selectedId.value) return
  const found = findParent(tree.value.root, selectedId.value)
  if (!found) return
  if (!window.confirm('确定删除这个方向，以及它下面的所有内容？')) return
  found.parent.children.splice(found.index, 1)
  if (found.parent.children.length === 0 && found.parent.type !== 'root') found.parent.type = 'leaf'
  selectRow(found.parent.id)
}

function moveSelected(direction: -1 | 1) {
  if (!tree.value || !selectedId.value) return
  const found = findParent(tree.value.root, selectedId.value)
  if (!found) return
  const target = found.index + direction
  if (target < 0 || target >= found.parent.children.length) return
  const [node] = found.parent.children.splice(found.index, 1)
  found.parent.children.splice(target, 0, node)
}

function startDrag(id: string, event: DragEvent) {
  if (isRoot(findNode(tree.value!.root, id)!)) return
  dragId.value = id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
}

function dropOn(targetId: string) {
  dropTargetId.value = ''
  const sourceId = dragId.value
  dragId.value = ''
  if (!tree.value || !sourceId || sourceId === targetId) return
  const source = findParent(tree.value.root, sourceId)
  const target = findParent(tree.value.root, targetId)
  if (!source || !target || source.parent.id !== target.parent.id) return
  const [node] = source.parent.children.splice(source.index, 1)
  const nextIndex = source.parent.children.findIndex((child) => child.id === targetId)
  source.parent.children.splice(nextIndex, 0, node)
}

function updateTags(event: Event) {
  if (!selectedNode.value) return
  const tags = (event.target as HTMLInputElement).value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
  if (!selectedNode.value.metadata) selectedNode.value.metadata = {}
  selectedNode.value.metadata.tags = tags
}

function nodeTypeLabel(type: ConsultNodeType): string {
  return { root: '开场', branch: '中间', leaf: '结束' }[type]
}

function nodeCount(item: ConsultTree): number {
  let count = 0
  const stack = [item.root]
  while (stack.length) {
    const node = stack.pop()!
    if (node.text.trim()) count += 1
    for (const child of node.children) stack.push(child)
  }
  return count
}

function useForest(result: { forest: ConsultForest; tree: ConsultTree }) {
  forest.value = result.forest
  tree.value = result.tree
}

async function switchTree(id: string) {
  if (!tree.value || id === tree.value.id) return
  if (dirty.value && !window.confirm('当前咨询树还有未保存的修改，切换会丢失。继续？')) return
  try {
    const result = await api.activateConsultTree(id)
    useForest(result)
    expanded.value = new Set()
    selectRow(result.tree.root.id)
    snapshot()
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '切换失败'
  }
}

async function createTree() {
  const name = window.prompt('新咨询树名称', `咨询树 ${trees.value.length + 1}`)
  if (!name?.trim()) return
  if (dirty.value && !window.confirm('当前咨询树还有未保存的修改，新建会切换过去。继续？')) return
  try {
    const result = await api.createConsultTree(name.trim())
    useForest(result)
    expanded.value = new Set()
    selectRow(result.tree.root.id)
    snapshot()
    flash('已新建咨询树')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '新建失败'
  }
}

async function renameTree() {
  if (!tree.value) return
  const name = window.prompt('咨询树名称', tree.value.name)
  if (!name?.trim() || name.trim() === tree.value.name) return
  try {
    const result = await api.renameConsultTree(tree.value.id, name.trim())
    useForest(result)
    snapshot()
    flash('名称已更新')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '重命名失败'
  }
}

async function deleteTree() {
  if (!tree.value || trees.value.length <= 1) return
  if (!window.confirm(`删除“${tree.value.name}”？这棵树里的内容会一起删除。`)) return
  try {
    const result = await api.deleteConsultTree(tree.value.id)
    useForest(result)
    expanded.value = new Set()
    selectRow(result.tree.root.id)
    snapshot()
    flash('咨询树已删除')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '删除失败'
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await api.consult()
    useForest(result)
    templates.value = result.templates
    scoring.value = result.scoring
    expanded.value = new Set()
    selectRow(result.tree.root.id)
    snapshot()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '读取失败'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!tree.value) return
  saving.value = true
  actionError.value = ''
  try {
    const treeResult = await api.saveConsultTree(tree.value)
    const scoringResult = await api.saveConsultScoring(scoring.value)
    useForest(treeResult)
    scoring.value = scoringResult.scoring
    if (!findNode(treeResult.tree.root, selectedId.value)) selectRow(treeResult.tree.root.id)
    snapshot()
    flash('咨询路径已保存')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function importPaths() {
  if (!importText.value.trim()) {
    importError.value = '先粘贴至少一条路径'
    return
  }
  importing.value = true
  importError.value = ''
  try {
    const result = await api.importConsult({
      text: importText.value,
      treeId: importMode.value === 'current' ? tree.value?.id : undefined,
      newTreeName: importMode.value === 'new' ? importTreeName.value.trim() || undefined : undefined
    })
    useForest(result)
    importText.value = ''
    importTreeName.value = ''
    importMode.value = 'current'
    expanded.value = new Set()
    selectRow(result.tree.root.id)
    expandAll()
    snapshot()
    flash(`已合并 ${result.imported} 条对话，记录 ${result.answers} 条学生回答`)
  } catch (error) {
    importError.value = error instanceof Error ? error.message : '导入失败'
  } finally {
    importing.value = false
  }
}

async function decay() {
  if (!window.confirm('让旧记录的影响变小，继续？')) return
  decaying.value = true
  try {
    const result = await api.decayConsult(0.9)
    useForest(result)
    snapshot()
    flash('旧记录的影响已经调小')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '调整失败'
  } finally {
    decaying.value = false
  }
}

function flash(message: string) {
  toast.value = message
  setTimeout(() => {
    toast.value = ''
  }, 2000)
}

onMounted(() => {
  load()
  window.addEventListener('keydown', handleCanvasKeydown)
})
onUnmounted(() => {
  stopPan()
  stopResize()
  window.clearTimeout(locateTimer)
  window.removeEventListener('keydown', handleCanvasKeydown)
  document.body.classList.remove('consult-canvas-expanded')
})
</script>

<style scoped>
.page-head,
.editor-head,
.decay-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.page-head {
  margin-bottom: 10px;
}

.tree-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 10px 12px;
}

.tree-select {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 220px;
}

.tree-select > span {
  flex: 0 0 auto;
  color: var(--ink-3);
  font-size: 11px;
}

.tree-select .select {
  min-width: 180px;
}

.tree-bar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-wrap: wrap;
}

.import-target {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface-2);
}

.import-target .input {
  flex: 1 1 220px;
  min-width: 180px;
}

.node-text.placeholder,
.mindmap-node-text.placeholder {
  color: var(--ink-3);
  font-style: italic;
}

.page-title {
  margin-top: 3px;
  font-size: 27px;
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

.view-switch {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
}

.view-switch-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 11px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-3);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.view-switch-btn:hover {
  background: rgba(47, 93, 70, 0.05);
  color: var(--ink-2);
}

.view-switch-btn.on {
  background: var(--accent-soft);
  color: var(--accent);
}

.tree-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 8px var(--side-width, 380px);
  gap: 14px;
  align-items: start;
}

.tree-layout.editor-collapsed {
  grid-template-columns: minmax(0, 1fr);
}

.tree-layout.resizing {
  cursor: col-resize;
  user-select: none;
}

.split-handle {
  position: relative;
  align-self: stretch;
  min-height: 560px;
  cursor: col-resize;
  touch-action: none;
}

.split-handle::before {
  content: "";
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 50%;
  width: 2px;
  border-radius: 99px;
  background: var(--line);
  transform: translateX(-50%);
  transition: background 0.15s ease, width 0.15s ease;
}

.split-handle:hover::before,
.tree-layout.resizing .split-handle::before {
  width: 3px;
  background: rgba(47, 93, 70, 0.55);
}

.tree-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: clamp(760px, calc(100vh - 170px), 1250px);
  overflow: hidden;
}

.tree-card.canvas-expanded {
  position: fixed;
  z-index: 80;
  inset: 14px;
  width: auto;
  height: auto;
  max-height: none;
  border-radius: 18px;
  box-shadow: 0 24px 80px rgba(27, 26, 23, 0.24);
}

:global(body.consult-canvas-expanded) {
  overflow: hidden;
}

.editor-head h2 {
  font-size: 15px;
}

.editor-head p {
  margin-top: 3px;
}

.editor-head-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
}

.tree-search {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
}

.tree-search .input {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
  height: 34px;
  padding: 0 11px;
  font-size: 12.5px;
}

.tree-search .btn {
  flex: 0 0 auto;
  min-width: 62px;
  white-space: nowrap;
}

.search-error {
  flex: 0 0 auto;
  color: var(--danger);
}

.tree-table {
  flex: 1 1 auto;
  min-height: 580px;
  overflow: auto;
}

.tree-columns,
.tree-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  column-gap: 5px;
}

.tree-columns {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 8px 36px 8px 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  color: var(--ink-3);
  font-size: 10px;
  letter-spacing: 0.06em;
}

.tree-row {
  min-height: 42px;
  padding-right: 10px;
  border-bottom: 1px solid rgba(230, 225, 214, 0.7);
  cursor: pointer;
  transition: background 0.12s ease;
}

.tree-row:hover {
  background: rgba(0, 0, 0, 0.018);
}

.tree-row.onpath {
  background: rgba(47, 93, 70, 0.045);
}

.tree-row.selected {
  background: var(--accent-soft);
  box-shadow: inset 3px 0 var(--accent);
}

.tree-row.located {
  background: var(--accent-soft);
  box-shadow: inset 3px 0 var(--accent);
  animation: locate-row 1.1s ease-in-out 2;
}

.tree-row.drop-target {
  box-shadow: inset 0 2px var(--accent);
}

.tree-main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 7px;
  padding: 6px 0;
}

.expand-btn,
.add-child {
  flex: 0 0 auto;
  width: 23px;
  height: 23px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-3);
  font-size: 13px;
}

.expand-btn:hover,
.add-child:hover {
  background: rgba(0, 0, 0, 0.055);
  color: var(--ink);
}

.expand-placeholder {
  width: 23px;
  flex: 0 0 23px;
}

.add-child {
  opacity: 0;
}

.tree-row:hover .add-child {
  opacity: 1;
}

.node-type {
  flex: 0 0 auto;
  padding: 2px 5px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.045);
  color: var(--ink-3);
  font-size: 9.5px;
}

.node-type.root {
  background: var(--accent-soft);
  color: var(--accent);
}

.node-type.leaf {
  background: #f6efe1;
  color: var(--amber);
}

.node-depth {
  flex: 0 0 auto;
  color: var(--ink-3);
  font-size: 9.5px;
  font-variant-numeric: tabular-nums;
}

.node-text {
  min-width: 0;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mindmap-shell {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}

.mindmap-overlay {
  position: absolute;
  z-index: 3;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  max-width: calc(100% - 24px);
}

.map-tools-toggle {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(214, 208, 194, 0.9);
  border-radius: 8px;
  background: rgba(255, 253, 248, 0.94);
  box-shadow: 0 4px 12px rgba(27, 26, 23, 0.08);
  color: var(--ink-2);
  font-size: 11.5px;
  backdrop-filter: blur(8px);
}

.map-tools-toggle:hover {
  color: var(--ink);
  background: var(--surface);
}

.mindmap-tools-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(760px, calc(100vw - 100px));
  padding: 6px 7px 6px 11px;
  border: 1px solid rgba(214, 208, 194, 0.85);
  border-radius: 10px;
  background: rgba(255, 253, 248, 0.92);
  box-shadow: 0 5px 16px rgba(27, 26, 23, 0.08);
  backdrop-filter: blur(8px);
}

.mindmap-hint {
  overflow: hidden;
  color: var(--ink-2);
  font-size: 11.5px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mindmap-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.map-control {
  height: 30px;
  padding: 0 10px;
  border-radius: 7px;
  font-size: 12px;
}

.map-control.map-primary {
  border-color: transparent;
  background: var(--accent);
  color: #fff;
}

.map-zoom {
  min-width: 38px;
  color: var(--ink-2);
  font-family: var(--mono);
  font-size: 11px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.mindmap-canvas {
  position: relative;
  flex: 1 1 auto;
  overflow: hidden;
  width: 100%;
  height: auto;
  min-height: 620px;
  background:
    radial-gradient(circle, rgba(47, 93, 70, 0.12) 1px, transparent 1px) 0 0 / 22px 22px,
    #fbf9f2;
  cursor: grab;
  user-select: none;
  touch-action: none;
  -webkit-user-drag: none;
}

.mindmap-canvas * {
  -webkit-user-drag: none;
}

.mindmap-canvas.dragging {
  cursor: grabbing;
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
  stroke-width: 1.4;
}

.mindmap-node {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 190px;
  min-height: 58px;
  padding: 8px 9px 8px 11px;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 2px 8px rgba(27, 26, 23, 0.06);
  text-align: left;
  cursor: pointer;
}

.mindmap-node.onpath {
  border-color: rgba(47, 93, 70, 0.35);
}

.mindmap-node.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft), 0 3px 10px rgba(27, 26, 23, 0.08);
}

.mindmap-node.located {
  border-color: var(--accent);
  animation: locate-node 1.2s ease-in-out 2;
}

@keyframes locate-row {
  0%,
  100% {
    background: var(--accent-soft);
  }
  50% {
    background: rgba(47, 93, 70, 0.2);
  }
}

@keyframes locate-node {
  0%,
  100% {
    box-shadow: 0 0 0 3px var(--accent-soft), 0 3px 10px rgba(27, 26, 23, 0.08);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(47, 93, 70, 0.18), 0 3px 14px rgba(27, 26, 23, 0.12);
  }
}

.mindmap-node.leaf {
  background: #fffaf0;
}

.mindmap-node-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.mindmap-node-text {
  display: -webkit-box;
  overflow: hidden;
  color: var(--ink);
  font-size: 11.5px;
  line-height: 1.42;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.mindmap-node-meta {
  color: var(--ink-3);
  font-size: 9px;
}

.mindmap-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 14px;
  line-height: 1;
}

.mindmap-toggle:hover {
  background: #dce8dd;
}

.mindmap-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--ink-3);
  font-size: 12px;
}

.side-stack {
  display: grid;
  gap: 14px;
}

.editor-card,
.import-card,
.scoring-card {
  padding: 18px 20px;
}

.editor-head {
  align-items: center;
  margin-bottom: 16px;
}

.editor-form {
  display: grid;
  gap: 14px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.metric-grid.four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.node-advanced {
  border-top: 1px solid var(--line);
  padding-top: 11px;
}

.node-advanced summary {
  cursor: pointer;
  color: var(--ink-3);
  font-size: 11.5px;
}

.advanced-body {
  display: grid;
  gap: 11px;
  margin-top: 11px;
}

.answer-history {
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.answer-history-head,
.answer-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.answer-history-head {
  align-items: center;
}

.answer-history-head h3 {
  font-size: 13px;
}

.answer-history-head p {
  margin-top: 2px;
}

.answer-empty {
  margin-top: 10px;
  padding: 11px 12px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.02);
  color: var(--ink-3);
  font-size: 11.5px;
  line-height: 1.7;
}

.answer-list {
  display: grid;
  gap: 7px;
  max-height: 280px;
  margin-top: 10px;
  overflow: auto;
}

.answer-item {
  padding: 10px 11px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.012);
}

.answer-meta {
  color: var(--ink-2);
  font-size: 11px;
}

.answer-text {
  margin-top: 6px;
  color: var(--ink-2);
  font-size: 11.5px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.answer-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 7px;
}

.node-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.danger-text {
  color: var(--danger);
}

.import-card summary,
.scoring-card summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.import-body,
.scoring-body {
  display: grid;
  gap: 12px;
  margin-top: 13px;
}

.import-actions {
  display: flex;
  justify-content: flex-end;
}

.decay-row {
  align-items: center;
}

@media (max-width: 1180px) {
  .tree-layout {
    grid-template-columns: 1fr;
  }

  .split-handle {
    display: none;
  }

  .mindmap-tools-panel {
    flex-wrap: wrap;
  }

  .mindmap-hint {
    display: none;
  }

  .mindmap-actions {
    flex-wrap: wrap;
  }
}

@media (max-width: 720px) {
  .page-head {
    flex-direction: column;
  }

  .tree-columns {
    display: none;
  }

  .add-child {
    opacity: 1;
  }

  .metric-grid,
  .metric-grid.four {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
