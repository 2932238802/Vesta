<template>
  <Modal :open="open" title="选择专业" eyebrow="该校专业" wide @close="$emit('close')">
    <input
      v-model="q"
      class="input search"
      type="search"
      placeholder="输入专业名称或代码…"
      aria-label="搜索专业"
      autofocus
    >
    <p class="hint">只显示已复核通过的招生专业；没有专业数据时可留空只查校线。</p>

    <p v-if="loading" class="state-line">正在搜索专业…</p>
    <p v-else-if="error" class="state-line error">{{ error }}</p>
    <p v-else-if="!items.length" class="state-line">该校当年还没有已导入的专业。</p>
    <div v-else class="program-list">
      <button
        v-for="program in items"
        :key="program.id"
        class="program-row"
        :class="{ selected: program.id === selectedId }"
        type="button"
        @click="$emit('select', program)"
      >
        <span class="program-main">
          <span class="program-name">{{ program.majorName }}</span>
          <span class="program-meta">
            {{ program.degreeType || '未标注' }} · {{ program.studyMode || '未标注' }}
            <template v-if="program.majorCode"> · {{ program.majorCode }}</template>
          </span>
        </span>
        <span class="program-side">
          <span v-if="program.planCount !== null" class="chip">计划 {{ program.planCount }}</span>
          <span v-if="program.tuition" class="quiet tiny">{{ program.tuition }}</span>
        </span>
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { api } from '@/api'
import type { SchoolProgram } from '@/api'
import Modal from '@/components/Modal.vue'

const props = defineProps<{
  open: boolean
  schoolId: string
  year: number
  exam: string
  selectedId?: string
}>()
const emit = defineEmits<{
  (event: 'close'): void
  (event: 'select', value: SchoolProgram): void
}>()

const q = ref('')
const loading = ref(false)
const error = ref('')
const items = ref<SchoolProgram[]>([])
let timer: ReturnType<typeof setTimeout> | undefined

async function load() {
  if (!props.open || !props.schoolId) return
  loading.value = true
  error.value = ''
  try {
    const result = await api.scoreLinePrograms({
      schoolId: props.schoolId,
      year: props.year,
      exam: props.exam,
      q: q.value.trim(),
      limit: 100
    })
    items.value = result.programs
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '搜索专业失败'
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

.program-list {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  max-height: 52vh;
  overflow-y: auto;
}

.program-row {
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

.program-row:hover {
  background: rgba(0, 0, 0, 0.03);
}

.program-row.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.program-main {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.program-name {
  font-size: 14px;
  font-weight: 500;
}

.program-meta {
  color: var(--ink-3);
  font-size: 12px;
}

.program-side {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
