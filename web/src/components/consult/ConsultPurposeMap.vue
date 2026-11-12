<template>
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
          :title="mapTitle(item.node)"
          @mousedown.stop
          @mousedown.right.prevent
          @mouseup.right.prevent
          @auxclick.prevent
          @contextmenu.prevent
          @click.stop="select(item.node.id)"
        >
          <span class="map-node-main">
            <span class="map-node-kicker">
              {{ mapKicker(item.node, stages) }}
            </span>
            <span class="map-node-label">{{ item.node.label }}</span>
            <span class="map-node-meta">{{ mapMeta(item.node, stages, showButterflies) }}</span>
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ConsultPurposeNode } from '@shared/consult-purpose'
import { useMindmapViewport } from '@/composables/useMindmapViewport'
import {
  MAP_NODE_HEIGHT,
  MAP_NODE_WIDTH,
  buildMapLayout,
  buildVisibleSet,
  butterflyCount,
  hasChildren,
  mapKicker,
  mapMeta,
  mapTitle,
  rowClass,
  type MapEdge
} from './purposeView'

const props = defineProps<{
  tree: ConsultPurposeNode | null
  stages: ConsultPurposeNode[]
  query: string
  onlyMainline: boolean
  showButterflies: boolean
  selectedNode: ConsultPurposeNode | null
  selectedId: string
  collapsedIds: Set<string>
}>()

const emit = defineEmits<{
  (event: 'select', id: string): void
  (event: 'toggle-collapse', id: string): void
  (event: 'clear-selection'): void
}>()

// 选中节点后，把从根/第一阶段流到它的链路在图上标出来。
const selectedPathIds = computed(() => new Set(props.selectedNode?.path ?? []))

function isOnPath(id: string): boolean {
  return selectedPathIds.value.has(id)
}

function edgeOnPath(edge: MapEdge): boolean {
  return selectedPathIds.value.has(edge.parentId) && selectedPathIds.value.has(edge.childId)
}

const visibleSet = computed(() => buildVisibleSet(props.stages, props.query))
const mapLayout = computed(() =>
  buildMapLayout({
    tree: props.tree,
    visible: visibleSet.value,
    forceOpen: Boolean(props.query.trim()),
    onlyMainline: props.onlyMainline,
    collapsed: props.collapsedIds
  })
)

const mapNodes = computed(() => mapLayout.value.nodes)
const mapEdges = computed(() => mapLayout.value.edges)
const mapSize = computed(() => mapLayout.value.size)

function isMapCollapsed(id: string): boolean {
  return props.collapsedIds.has(id)
}

function toggleMapCollapse(id: string) {
  emit('toggle-collapse', id)
}

function select(id: string) {
  emit('select', id)
}

const {
  mapCard,
  mapCanvas,
  isFullscreen,
  pan,
  zoom,
  panning,
  toggleFullscreen,
  fitMap,
  zoomMap,
  handleWheel,
  startPan,
  handleCanvasClick,
  ensureNodeVisible
} = useMindmapViewport({
  getNodes: () => mapNodes.value,
  getSize: () => mapSize.value,
  nodeWidth: MAP_NODE_WIDTH,
  nodeHeight: MAP_NODE_HEIGHT,
  onBlankClick: () => emit('clear-selection')
})

defineExpose({ fitMap, ensureNodeVisible })
</script>

<style scoped>
.map-card {
  min-width: 0;
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

@media (prefers-reduced-motion: reduce) {
  .mindmap-links path.on-path {
    animation: none;
  }
}
</style>
