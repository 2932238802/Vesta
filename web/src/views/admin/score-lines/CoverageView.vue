<template>
  <Modal :open="open" title="覆盖看板" eyebrow="抓取状态" wide @close="$emit('close')">
    <div class="coverage-filters">
      <select v-model="exam" class="select" @change="reload">
        <option value="upgrade">专升本</option>
        <option value="postgrad">考研</option>
      </select>
      <select v-model="province" class="select" @change="reload">
        <option value="">全部省份</option>
        <option v-for="name in provinceNames" :key="name" :value="name">{{ name }}</option>
      </select>
      <input v-model.number="year" class="input year" type="number" min="2000" max="2100" @change="reload">
      <select v-model="status" class="select" @change="reload">
        <option value="">全部状态</option>
        <option v-for="(label, key) in COVERAGE_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <div class="summary">
      <span v-for="(label, key) in COVERAGE_LABELS" :key="key" class="chip" :class="{ accent: key === 'covered' }">
        {{ label }} {{ data?.summary[key] ?? 0 }}
      </span>
    </div>

    <p v-if="loading" class="state-line">正在读取覆盖状态…</p>
    <p v-else-if="error" class="state-line error">{{ error }}</p>
    <p v-else-if="!data?.items.length" class="state-line">这个筛选条件下没有学校。</p>
    <div v-else class="table-wrap">
      <table class="table coverage-table">
        <thead>
          <tr><th>院校</th><th>省份</th><th>年份</th><th>状态</th><th>缺什么</th><th>最近更新</th><th>失败原因</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in data.items" :key="`${item.schoolId}-${item.year}`">
            <td>{{ item.name }}</td>
            <td>{{ item.province }}</td>
            <td>{{ item.year || '—' }}</td>
            <td><span class="chip" :class="{ accent: item.status === 'covered' }">{{ coverageLabel(item.status) }}</span></td>
            <td class="quiet">{{ item.missing.map(missingLabel).join('、') || '—' }}</td>
            <td class="quiet tiny">{{ formatDate(item.updatedAt) }}</td>
            <td class="error-cell">{{ failureText(item.lastError) || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer v-if="data" class="pager">
      <span class="quiet tiny">共 {{ data.total }} 所 · 第 {{ data.page }} 页</span>
      <button class="btn ghost small" type="button" :disabled="data.page <= 1" @click="prev">上一页</button>
      <button
        class="btn ghost small"
        type="button"
        :disabled="data.page * data.pageSize >= data.total"
        @click="next"
      >下一页</button>
    </footer>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { api } from '@/api'
import type { AdminCoverageResponse, CoverageStatus } from '@/api'
import { COVERAGE_LABELS, COVERAGE_MISSING_LABELS, crawlFailureHint } from '@shared/score-line'
import { provinceNames } from '@shared/score-line-region'
import { formatDate } from '@/format'
import Modal from '@/components/Modal.vue'

const props = defineProps<{ open: boolean; exam: string; year: number; province: string }>()
defineEmits<{ (event: 'close'): void }>()

const exam = ref(props.exam)
const year = ref(props.year)
const province = ref(props.province)
const status = ref('')
const page = ref(1)
const loading = ref(false)
const error = ref('')
const data = ref<AdminCoverageResponse | null>(null)

/** 失败码 → 中文结论 + 下一步；不认识的旧报文原样展示。 */
function failureText(value: string): string {
  const hint = crawlFailureHint(value)
  return hint ? `${hint.label}：${hint.next}` : value
}

function coverageLabel(value: CoverageStatus): string {
  return COVERAGE_LABELS[value] ?? value
}

function missingLabel(value: string): string {
  return COVERAGE_MISSING_LABELS[value] ?? value
}

async function load() {
  if (!props.open) return
  loading.value = true
  error.value = ''
  try {
    data.value = await api.scoreLineCoverage({
      exam: exam.value,
      year: year.value,
      province: province.value,
      status: status.value,
      page: page.value
    })
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '读取覆盖状态失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  void load()
}

function prev() {
  page.value = Math.max(1, page.value - 1)
  void load()
}

function next() {
  page.value += 1
  void load()
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    exam.value = props.exam
    year.value = props.year
    province.value = props.province
    status.value = ''
    page.value = 1
    void load()
  },
  { immediate: true }
)
</script>

<style scoped>
.coverage-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.select,
.input {
  width: auto;
}

.year {
  width: 100px;
}

.summary {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 14px 0;
}

.table-wrap {
  overflow-x: auto;
  max-height: 52vh;
}

.coverage-table {
  min-width: 760px;
}

.error-cell {
  color: var(--danger);
  font-size: 12px;
  max-width: 200px;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}
</style>
