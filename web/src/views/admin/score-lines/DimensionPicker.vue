<template>
  <div v-if="options.length" ref="root" class="field dim-field">
    <span class="dim-label">{{ label }}</span>

    <div v-if="options.length === 1" class="dim-single">
      <span class="chip accent">{{ options[0].label }}</span>
      <span class="quiet tiny">{{ options[0].count }} 条</span>
    </div>

    <template v-else>
      <button
        class="dim-trigger"
        type="button"
        :aria-expanded="open"
        :disabled="loading"
        @click="toggle"
      >
        <span class="dim-value" :class="{ muted: !modelValue }">{{ selectedLabel }}</span>
        <span class="dim-meta">{{ options.length }} 项 ▾</span>
      </button>

      <div v-if="open" class="dim-popover">
        <input
          ref="search"
          v-model="keyword"
          class="dim-search"
          type="text"
          :placeholder="`搜索${label}`"
          @keydown.esc.stop="close"
        >
        <ul class="dim-list" role="listbox" :aria-label="label">
          <li
            role="option"
            :aria-selected="modelValue === ''"
            :class="{ on: modelValue === '' }"
            @click="choose('')"
          >
            <span>全部</span>
          </li>
          <li
            v-for="option in filtered"
            :key="option.value"
            role="option"
            :aria-selected="modelValue === option.value"
            :class="{ on: modelValue === option.value }"
            @click="choose(option.value)"
          >
            <span class="dim-option-label">{{ option.label }}</span>
            <span class="quiet tiny">{{ option.count }}</span>
          </li>
        </ul>
        <p v-if="!filtered.length" class="dim-empty quiet tiny">没有匹配的选项</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { DimensionFacetOption } from '@/api'
import { DIMENSION_UNLABELED } from '@shared/score-line-dimension'

const props = defineProps<{
  label: string
  options: DimensionFacetOption[]
  loading?: boolean
}>()
const modelValue = defineModel<string>({ required: true })

const root = ref<HTMLElement | null>(null)
const search = ref<HTMLInputElement | null>(null)
const open = ref(false)
const keyword = ref('')

const selectedLabel = computed(() => {
  if (!modelValue.value) return '全部'
  if (modelValue.value === DIMENSION_UNLABELED) return '未标注'
  return props.options.find((option) => option.value === modelValue.value)?.label ?? modelValue.value
})

const filtered = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return props.options
  return props.options.filter(
    (option) =>
      option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query)
  )
})

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
  keyword.value = ''
}

function choose(value: string) {
  if (modelValue.value !== value) modelValue.value = value
  close()
}

function onPointerDown(event: PointerEvent) {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target as Node)) close()
}

watch(open, async (value) => {
  if (!value) return
  keyword.value = ''
  await nextTick()
  search.value?.focus()
})

onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<style scoped>
.dim-field {
  position: relative;
}

.dim-label {
  font-size: 12px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}

.dim-single {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
}

.dim-trigger {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  padding: 11px 13px;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.dim-trigger:disabled {
  background: #f3f0e8;
  color: var(--ink-3);
  cursor: wait;
}

.dim-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dim-value.muted {
  color: var(--ink-3);
}

.dim-meta {
  color: var(--ink-3);
  font-size: 11px;
  white-space: nowrap;
}

.dim-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  display: grid;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 12px 30px rgba(46, 39, 24, 0.14);
}

.dim-search {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  padding: 8px 10px;
  font-size: 13px;
  outline: none;
}

.dim-search:focus {
  border-color: var(--accent);
}

.dim-list {
  max-height: 240px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.dim-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 9px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.dim-list li:hover,
.dim-list li.on {
  background: var(--accent-soft);
  color: var(--accent);
}

.dim-option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dim-empty {
  padding: 4px 9px 6px;
}
</style>
