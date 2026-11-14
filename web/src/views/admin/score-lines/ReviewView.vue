<template>
  <Modal :open="open" title="复核队列" eyebrow="抓取数据默认待复核" wide @close="$emit('close')">
    <div class="review-bar">
      <div class="kind-tabs" role="tablist" aria-label="复核类型">
        <button
          class="kind-tab"
          :class="{ on: kind === 'batch' }"
          type="button"
          role="tab"
          :aria-selected="kind === 'batch'"
          @click="switchKind('batch')"
        >分数线</button>
        <button
          class="kind-tab"
          :class="{ on: kind === 'program' }"
          type="button"
          role="tab"
          :aria-selected="kind === 'program'"
          @click="switchKind('program')"
        >招生计划</button>
      </div>
      <select v-model="province" class="select" @change="reload">
        <option value="">全部省份</option>
        <option v-for="name in provinceNames" :key="name" :value="name">{{ name }}</option>
      </select>
      <input v-model.number="year" class="input year" type="number" min="2000" max="2100" placeholder="年份" @change="reload">
      <button
        class="btn small"
        type="button"
        :disabled="!selected.length || acting"
        @click="act(selected, 'approve')"
      >通过选中 {{ selected.length || '' }}</button>
    </div>

    <p v-if="actionError" class="state-line error">{{ actionError }}</p>
    <p v-if="loading" class="state-line">正在读取待复核数据…</p>
    <p v-else-if="error" class="state-line error">{{ error }}</p>
    <p v-else-if="!data?.items.length" class="state-line">没有待复核的数据。</p>
    <div v-else class="review-list">
      <article v-for="item in data.items" :key="item.id" class="review-row">
        <label class="check">
          <input v-model="selected" type="checkbox" :value="item.id">
        </label>
        <div class="review-main">
          <p class="review-title">
            {{ item.title || item.majorName || '未命名' }}
            <span v-if="item.confidence !== undefined" class="chip" :class="{ warn: item.confidence < 0.8 }">
              置信度 {{ item.confidence.toFixed(2) }}
            </span>
          </p>
          <p class="review-meta">
            {{ item.schoolName || '主线' }} · {{ item.province || '全国' }} · {{ item.year }}
            <template v-if="item.kind === 'program'">
              · 计划 {{ item.planCount ?? '未公布' }}
              <template v-if="item.tuition"> · {{ item.tuition }}</template>
            </template>
            · {{ formatDate(item.createdAt) }}
          </p>
        </div>
        <div class="review-actions">
          <button class="btn ghost small" type="button" :disabled="acting" @click="act([item.id], 'reject')">拒绝</button>
          <button class="btn small" type="button" :disabled="acting" @click="act([item.id], 'approve')">通过</button>
        </div>
      </article>
    </div>

    <footer v-if="data" class="pager">
      <span class="quiet tiny">共 {{ data.total }} 条 · 第 {{ data.page }} 页</span>
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
import type { AdminReviewResponse } from '@/api'
import { provinceNames } from '@shared/score-line-region'
import { formatDate } from '@/format'
import Modal from '@/components/Modal.vue'

const props = defineProps<{ open: boolean; province: string; year: number }>()
const emit = defineEmits<{ (event: 'close'): void; (event: 'changed'): void }>()

const kind = ref<'batch' | 'program'>('batch')
const province = ref(props.province)
const year = ref(props.year || new Date().getFullYear())
const page = ref(1)
const loading = ref(false)
const error = ref('')
const actionError = ref('')
const acting = ref(false)
const data = ref<AdminReviewResponse | null>(null)
const selected = ref<string[]>([])

async function load() {
  if (!props.open) return
  loading.value = true
  error.value = ''
  selected.value = []
  try {
    data.value = await api.scoreLineReview({
      kind: kind.value,
      province: province.value,
      year: year.value,
      page: page.value
    })
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '读取复核队列失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  void load()
}

function switchKind(value: 'batch' | 'program') {
  kind.value = value
  reload()
}

function prev() {
  page.value = Math.max(1, page.value - 1)
  void load()
}

function next() {
  page.value += 1
  void load()
}

async function act(ids: string[], action: 'approve' | 'reject') {
  if (!ids.length || acting.value) return
  acting.value = true
  actionError.value = ''
  try {
    await api.scoreLineReviewAction({ kind: kind.value, ids, action })
    emit('changed')
    await load()
  } catch (caught) {
    actionError.value = caught instanceof Error ? caught.message : '复核失败'
  } finally {
    acting.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    kind.value = 'batch'
    province.value = props.province
    year.value = props.year || new Date().getFullYear()
    page.value = 1
    void load()
  },
  { immediate: true }
)
</script>

<style scoped>
.review-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.kind-tabs {
  display: flex;
  gap: 4px;
}

.kind-tab {
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2);
  padding: 6px 14px;
  font-size: 12.5px;
  cursor: pointer;
}

.kind-tab.on {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--accent);
  font-weight: 500;
}

.year {
  width: 100px;
}

.review-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  max-height: 52vh;
  overflow-y: auto;
}

.review-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.review-main {
  flex: 1;
  min-width: 0;
}

.review-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13.5px;
  font-weight: 500;
}

.review-meta {
  margin-top: 4px;
  color: var(--ink-3);
  font-size: 12px;
}

.review-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

@media (max-width: 600px) {
  .review-row {
    flex-wrap: wrap;
  }

  .review-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
