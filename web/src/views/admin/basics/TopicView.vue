<template>
  <article class="topic-view">
    <button class="btn ghost small back-btn" type="button" @click="emit('back')">
      ← 返回话题列表
    </button>

    <nav class="breadcrumb" aria-label="面包屑">
      <RouterLink :to="{ name: 'admin-consult-basics' }">大学常识</RouterLink>
      <span class="crumb-sep">/</span>
      <span class="crumb-current">{{ topic.title }}</span>
    </nav>

    <div class="topic-head">
      <div class="topic-head-main">
        <p class="eyebrow">大学常识</p>
        <h2 class="topic-title">{{ topic.title }}</h2>
        <p class="topic-meta">
          <span>更新于 {{ formatDate(topic.updatedAt) }}</span>
          <span aria-hidden="true">·</span>
          <span>管理员维护</span>
        </p>
      </div>
      <div class="topic-tools">
        <button
          v-if="headings.length"
          class="tool-btn outline-trigger"
          type="button"
          :aria-expanded="outlineOpen"
          @click="outlineOpen = true"
        >
          目录
        </button>
        <button class="tool-btn" type="button" @click="emit('edit')">编辑</button>
        <button class="tool-btn danger" type="button" @click="emit('delete')">删除</button>
      </div>
    </div>

    <!-- 正文只来自 renderMarkdown：先转义原文，再拼接固定标签，链接限 http/https。 -->
    <div class="topic-reading" :class="{ 'has-outline': headings.length }">
      <div ref="bodyEl" class="topic-body" v-html="rendered"></div>

      <aside v-if="headings.length" class="topic-outline" aria-label="文章大纲">
        <p class="outline-label">目录</p>
        <MarkdownOutline :headings="headings" :active-id="activeId" @select="goToHeading" />
      </aside>
    </div>

    <div v-if="outlineOpen" class="outline-overlay" @click.self="outlineOpen = false">
      <div class="outline-sheet" role="dialog" aria-modal="true" aria-label="文章目录">
        <div class="outline-sheet-head">
          <span>目录</span>
          <button class="tool-btn" type="button" @click="outlineOpen = false">关闭</button>
        </div>
        <MarkdownOutline :headings="headings" :active-id="activeId" @select="goToHeading" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { ConsultTopic } from '@/api'
import { formatDate } from '@/format'
import { renderMarkdown } from '@/markdown'
import MarkdownOutline, { type OutlineHeading } from './MarkdownOutline.vue'

const props = defineProps<{ topic: ConsultTopic }>()

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'edit'): void
  (event: 'delete'): void
}>()

const rendered = computed(() => renderMarkdown(props.topic.body))

const bodyEl = ref<HTMLElement | null>(null)
const headings = ref<OutlineHeading[]>([])
const activeId = ref('')
const outlineOpen = ref(false)

let observer: IntersectionObserver | null = null
let scrollHandler: (() => void) | null = null
let narrowQuery: MediaQueryList | null = null
let frame = 0
let trackedTopicId = ''

function onNarrowChange(): void {
  // 跨过 1000px 断点时收起浮层，避免桌面残留遮罩或窄屏丢失入口状态。
  outlineOpen.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && outlineOpen.value) outlineOpen.value = false
}

function nextHeadingId(text: string, index: number, used: Set<string>): string {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[\s　]+/g, '-')
      .replace(/[^\p{L}\p{N}_-]+/gu, '')
      .replace(/^-+|-+$/g, '') || `section-${index + 1}`
  let id = base
  let suffix = 2
  // 用已占用集合递增后缀，覆盖字面 `A` / `A-2` / `A` 与 `section-N` 冲突。
  while (used.has(id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }
  used.add(id)
  return id
}

function headingNodes(): HTMLElement[] {
  if (!bodyEl.value) return []
  return Array.from(bodyEl.value.querySelectorAll<HTMLElement>('h2, h3'))
}

function updateActive(): void {
  const nodes = headingNodes()
  if (!nodes.length) return

  // 以视口上方 140px 为当前阅读线，取最后一个越过大纲线的标题。
  let current = nodes[0]
  for (const node of nodes) {
    if (node.getBoundingClientRect().top <= 140) current = node
    else break
  }

  const doc = document.documentElement
  if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
    current = nodes[nodes.length - 1]
  }

  if (current.id && activeId.value !== current.id) activeId.value = current.id
}

function startTracking(): void {
  updateActive()
  scrollHandler = () => {
    if (frame) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      updateActive()
    })
  }
  window.addEventListener('scroll', scrollHandler, { passive: true })
  window.addEventListener('resize', scrollHandler)

  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(() => updateActive(), {
      rootMargin: '-15% 0px -70% 0px'
    })
    for (const node of headingNodes()) observer.observe(node)
  }
}

function teardownTracking(): void {
  if (frame) {
    window.cancelAnimationFrame(frame)
    frame = 0
  }
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler)
    window.removeEventListener('resize', scrollHandler)
    scrollHandler = null
  }
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

function focusHash(): boolean {
  let hash = ''
  try {
    hash = decodeURIComponent(window.location.hash.replace(/^#/, ''))
  } catch {
    return false
  }
  if (!hash) return false
  const target = headings.value.find((item) => item.id === hash)
  if (!target) return false
  activeId.value = target.id
  // 正文是异步注入的，浏览器不会自动滚到锚点，这里补一次定位。
  window.requestAnimationFrame(() => {
    document.getElementById(target.id)?.scrollIntoView({ block: 'start' })
  })
  return true
}

function buildOutline(): void {
  const nodes = headingNodes()
  teardownTracking()

  if (!nodes.length) {
    headings.value = []
    activeId.value = ''
    outlineOpen.value = false
    return
  }

  const used = new Set<string>()
  headings.value = nodes.map((node, index) => {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
    const id = nextHeadingId(text, index, used)
    node.id = id
    return { level: node.tagName === 'H2' ? 2 : 3, text, id }
  })

  startTracking()

  // 只在切换话题时恢复 URL 锚点，编辑保存后重建不打断当前阅读位置。
  const topicChanged = trackedTopicId !== props.topic.id
  trackedTopicId = props.topic.id
  if (topicChanged) focusHash()
}

function goToHeading(id: string): void {
  const node = document.getElementById(id)
  if (!node) return
  activeId.value = id
  outlineOpen.value = false
  node.scrollIntoView({ behavior: 'smooth', block: 'start' })
  try {
    const hash = `#${encodeURIComponent(id)}`
    if (window.location.hash !== hash) {
      window.history.replaceState(window.history.state, '', hash)
    }
  } catch {
    // 个别环境不允许改地址时不阻塞阅读。
  }
}

watch(
  () => props.topic.id,
  () => {
    outlineOpen.value = false
    activeId.value = ''
  }
)

watch(rendered, () => {
  void nextTick(buildOutline)
})

onMounted(() => {
  narrowQuery = window.matchMedia('(max-width: 1000px)')
  narrowQuery.addEventListener('change', onNarrowChange)
  window.addEventListener('keydown', onKeydown)
  void nextTick(buildOutline)
})

onBeforeUnmount(() => {
  narrowQuery?.removeEventListener('change', onNarrowChange)
  narrowQuery = null
  window.removeEventListener('keydown', onKeydown)
  teardownTracking()
})
</script>
