<template>
  <Modal
    :open="open"
    title="从问卷导入情况"
    eyebrow="来访者情况"
    wide
    @close="emit('close')"
  >
    <div class="import-dialog">
      <label class="field">
        <span>搜索姓名、备注或渠道</span>
        <input
          v-model="search"
          class="input"
          type="search"
          maxlength="80"
          placeholder="例：小林 / 大二 / 朋友圈"
        />
      </label>

      <p class="quiet tiny import-hint">
        导入会用答卷内容覆盖当前“来访者情况”。如果还没填称呼，也会自动带上姓名。
      </p>

      <div v-if="loading" class="import-empty">正在读取答卷</div>
      <p v-else-if="error" class="notice">{{ error }}</p>
      <div v-else-if="submissions.length === 0" class="import-empty">
        没有找到可导入的答卷
      </div>
      <div v-else class="import-list">
        <button
          v-for="item in submissions"
          :key="item.id"
          class="import-choice"
          type="button"
          :disabled="importingId !== ''"
          @click="emit('import', item)"
        >
          <span class="import-choice-main">
            <span class="import-choice-name">{{ item.name || '未命名' }}</span>
            <span class="import-choice-meta">
              {{ item.note || item.channel || '没有备注' }} · {{ formatDate(item.createdAt, false) }}
            </span>
          </span>
          <span class="import-choice-side">
            <span class="chip accent">{{ item.tier }} 档</span>
            <span class="quiet tiny">{{ importingId === item.id ? '正在导入' : '导入' }}</span>
          </span>
        </button>
      </div>
    </div>
    <template #footer>
      <button class="btn ghost small" type="button" @click="emit('close')">取消</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import type { AdminSubmissionSummary } from '@/api'
import { formatDate } from '@/format'
import Modal from '@/components/Modal.vue'

defineProps<{
  open: boolean
  loading: boolean
  error: string
  submissions: AdminSubmissionSummary[]
  importingId: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'import', item: AdminSubmissionSummary): void
}>()

const search = defineModel<string>('search', { required: true })
</script>

<style scoped>
.import-dialog {
  display: grid;
  gap: 13px;
}

.import-hint {
  line-height: 1.7;
}

.import-empty {
  padding: 28px 12px;
  color: var(--ink-3);
  font-size: 12.5px;
  text-align: center;
}

.import-list {
  display: grid;
  gap: 4px;
  max-height: min(52vh, 480px);
  overflow: auto;
}

.import-choice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  padding: 11px 12px;
  border: 0;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.018);
  text-align: left;
}

.import-choice:hover:not(:disabled) {
  background: rgba(47, 93, 70, 0.075);
}

.import-choice:disabled {
  cursor: wait;
  opacity: 0.65;
}

.import-choice-main,
.import-choice-side {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.import-choice-main {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.import-choice-name {
  font-size: 13px;
  color: var(--ink);
}

.import-choice-meta {
  overflow: hidden;
  color: var(--ink-3);
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.import-choice-side {
  flex: 0 0 auto;
}
</style>
