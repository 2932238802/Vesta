<template>
  <aside class="topic-rail" aria-label="话题列表">
    <div class="rail-search">
      <label class="search-box">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
          <path d="m20 20-3.2-3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <input
          v-model="queryModel"
          type="search"
          placeholder="搜索话题…"
          autocomplete="off"
          aria-label="搜索话题"
        >
      </label>
    </div>

    <div class="rail-meta">
      <span>{{ query.trim() ? '匹配话题' : '全部话题' }}</span>
      <span class="rail-count">{{ topics.length }}</span>
    </div>

    <p v-if="!draggable" class="drag-hint">清空搜索后可调整顺序</p>

    <ul class="topic-list">
      <li v-for="item in localTopics" :key="item.id">
        <button
          :ref="(el) => setItemRef(item.id, el)"
          class="topic-item"
          :class="{ on: item.id === selectedId, dragging: dragging && item.id === dragId }"
          type="button"
          @pointerdown="onPointerDown($event, item.id)"
          @click="onSelect(item.id)"
        >
          <span class="topic-title">{{ item.title }}</span>
          <span class="dot" aria-hidden="true"></span>
        </button>
      </li>
      <li v-if="!localTopics.length" class="rail-empty">
        {{ query.trim() ? '没有匹配的话题' : '还没有话题' }}
      </li>
    </ul>

    <div class="rail-foot">
      <span>{{ draggable ? '按住话题可拖动排序' : '搜索中，顺序已锁定' }}</span>
      <span aria-hidden="true">↕</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { ConsultTopicSummary } from '@/api'

const props = defineProps<{
  topics: ConsultTopicSummary[]
  selectedId: string
  query: string
  draggable: boolean
}>()

const emit = defineEmits<{
  (event: 'update:query', value: string): void
  (event: 'select', id: string): void
  (event: 'reorder', ids: string[]): void
}>()

const queryModel = computed({
  get: () => props.query,
  set: (value: string) => emit('update:query', value)
})

const localTopics = ref<ConsultTopicSummary[]>([...props.topics])
const dragging = ref(false)
const dragId = ref('')

watch(
  () => props.topics,
  (value) => {
    if (!dragging.value) localTopics.value = [...value]
  }
)

watch(
  () => props.draggable,
  (value) => {
    if (!value && dragging.value) finishDrag(false)
  }
)

const itemEls = new Map<string, HTMLElement>()

function setItemRef(id: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) itemEls.set(id, el)
  else itemEls.delete(id)
}

const DRAG_THRESHOLD = 4
let candidateId = ''
let startX = 0
let startY = 0
let active = false
let suppressUntil = 0

function onPointerDown(event: PointerEvent, id: string) {
  if (event.button !== 0 || !props.draggable) return
  candidateId = id
  startX = event.clientX
  startY = event.clientY
  active = false
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
}

function onPointerMove(event: PointerEvent) {
  if (!active) {
    if (Math.hypot(event.clientX - startX, event.clientY - startY) < DRAG_THRESHOLD) return
    active = true
    dragging.value = true
    dragId.value = candidateId
    localTopics.value = [...props.topics]
  }
  event.preventDefault()
  moveDrag(event.clientY)
}

function moveDrag(clientY: number) {
  const list = localTopics.value
  const currentIndex = list.findIndex((item) => item.id === dragId.value)
  if (currentIndex < 0) return

  // 以其余话题的中线为界，计算拖拽项应插入的位置。
  let insertAt = 0
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index]
    if (item.id === dragId.value) continue
    const element = itemEls.get(item.id)
    if (!element) continue
    const rect = element.getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) break
    insertAt += 1
  }

  const dragged = list[currentIndex]
  const without = list.filter((item) => item.id !== dragId.value)
  without.splice(insertAt, 0, dragged)
  if (without.some((item, index) => item.id !== list[index].id)) {
    localTopics.value = without
  }
}

function finishDrag(persist: boolean) {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerCancel)
  const wasActive = active
  active = false
  candidateId = ''
  if (!dragging.value) return
  dragging.value = false
  dragId.value = ''
  if (persist && wasActive) {
    suppressUntil = Date.now() + 300
    emit('reorder', localTopics.value.map((item) => item.id))
  } else {
    localTopics.value = [...props.topics]
  }
}

function onPointerUp() {
  finishDrag(true)
}

function onPointerCancel() {
  finishDrag(false)
}

function onSelect(id: string) {
  if (Date.now() < suppressUntil) return
  emit('select', id)
}

onBeforeUnmount(() => {
  finishDrag(false)
})
</script>
