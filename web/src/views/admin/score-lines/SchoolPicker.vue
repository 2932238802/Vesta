<template>
  <Modal :open="open" title="选择院校" eyebrow="全国院校" wide @close="$emit('close')">
    <input
      v-model="q"
      class="input search"
      type="search"
      placeholder="输入校名、别名或城市…"
      aria-label="搜索院校"
      autofocus
    >
    <p v-if="province" class="hint">优先显示 {{ province }} 的院校；清空搜索可看该省全部名单。</p>

    <p v-if="loading" class="state-line">正在搜索院校…</p>
    <p v-else-if="error" class="state-line error">{{ error }}</p>
    <p v-else-if="!items.length" class="state-line">
      没有找到院校。请先在服务器导入教育部《全国高等学校名单》。
    </p>
    <div v-else class="school-list">
      <button
        v-for="school in items"
        :key="school.id"
        class="school-row"
        :class="{ selected: school.id === selectedId }"
        type="button"
        @click="$emit('select', school)"
      >
        <span class="school-main">
          <span class="school-name">{{ school.name }}</span>
          <span class="school-meta">
            {{ school.city || school.province }}
            <template v-if="school.level"> · {{ school.level }}</template>
            <template v-if="school.nature"> · {{ school.nature }}</template>
            <template v-if="school.tags.length"> · {{ school.tags.join(' / ') }}</template>
          </span>
        </span>
        <span class="school-side">
          <span v-if="school.planCount !== null" class="chip">计划 {{ school.planCount }}</span>
          <span
            v-if="school.coverage"
            class="chip"
            :class="{ accent: school.coverage.status === 'covered' }"
          >{{ coverageLabel(school.coverage.status) }}</span>
        </span>
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { api } from '@/api'
import type { CoverageStatus, SchoolSearchItem } from '@/api'
import { COVERAGE_LABELS } from '@shared/score-line'
import Modal from '@/components/Modal.vue'

const props = defineProps<{
  open: boolean
  exam: string
  year: number
  province: string
  selectedId?: string
}>()
const emit = defineEmits<{
  (event: 'close'): void
  (event: 'select', value: SchoolSearchItem): void
}>()

const q = ref('')
const loading = ref(false)
const error = ref('')
const items = ref<SchoolSearchItem[]>([])
let timer: ReturnType<typeof setTimeout> | undefined

function coverageLabel(status: CoverageStatus | ''): string {
  return status ? COVERAGE_LABELS[status] ?? status : ''
}

async function load() {
  if (!props.open) return
  loading.value = true
  error.value = ''
  try {
    const result = await api.scoreLineSchools({
      q: q.value.trim(),
      province: props.province,
      exam: props.exam,
      year: props.year,
      limit: 50
    })
    items.value = result.schools
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '搜索院校失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      q.value = ''
      void load()
    }
  },
  { immediate: true }
)

watch(q, () => {
  if (!props.open) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void load(), 250)
})
</script>

<style scoped>
.search {
  width: 100%;
}

.hint {
  margin: 10px 0 4px;
  color: var(--ink-3);
  font-size: 12px;
}

.school-list {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  max-height: 52vh;
  overflow-y: auto;
}

.school-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.school-row:hover {
  background: rgba(0, 0, 0, 0.03);
}

.school-row.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.school-main {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.school-name {
  font-size: 14px;
  font-weight: 500;
}

.school-meta {
  color: var(--ink-3);
  font-size: 12px;
}

.school-side {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
</style>
