<script lang="ts">
/** 从正文 DOM 提取出的标题，level 只取 2（分组）或 3（条目）。 */
export interface OutlineHeading {
  level: number
  text: string
  id: string
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

interface OutlineGroup {
  key: string
  heading: OutlineHeading | null
  items: OutlineHeading[]
}

const props = defineProps<{
  headings: OutlineHeading[]
  activeId?: string
}>()

const emit = defineEmits<{
  (event: 'select', id: string): void
}>()

// h2 作为分组标题，h3 作为组内条目；没有 h2 时所有条目自然平铺在一组里。
const groups = computed<OutlineGroup[]>(() => {
  const result: OutlineGroup[] = []
  let current: OutlineGroup | null = null

  for (const heading of props.headings) {
    if (heading.level === 2) {
      current = { key: heading.id, heading, items: [] }
      result.push(current)
      continue
    }
    if (!current) {
      current = { key: '__flat__', heading: null, items: [] }
      result.push(current)
    }
    current.items.push(heading)
  }

  return result
})

const on = (id: string) => props.activeId === id

function label(text: string): string {
  return text || '未命名小节'
}
</script>

<template>
  <nav class="outline" aria-label="大纲条目">
    <ol class="outline-list">
      <li v-for="group in groups" :key="group.key" class="outline-block">
        <button
          v-if="group.heading"
          class="outline-link outline-title"
          :class="{ on: on(group.heading.id) }"
          type="button"
          :aria-current="on(group.heading.id) ? 'location' : undefined"
          @click="emit('select', group.heading.id)"
        >
          {{ label(group.heading.text) }}
        </button>
        <ol v-if="group.items.length" class="outline-items" :class="{ nested: group.heading }">
          <li v-for="item in group.items" :key="item.id">
            <button
              class="outline-link"
              :class="{ on: on(item.id), nested: group.heading }"
              type="button"
              :aria-current="on(item.id) ? 'location' : undefined"
              @click="emit('select', item.id)"
            >
              {{ label(item.text) }}
            </button>
          </li>
        </ol>
      </li>
    </ol>
  </nav>
</template>
