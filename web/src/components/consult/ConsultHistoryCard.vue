<template>
  <section class="card history-card">
    <header class="card-head">
      <div>
        <h2>生成记录</h2>
        <p class="quiet tiny">生成后记一下结果，系统以后会选得更准。</p>
      </div>
      <div class="history-head-actions">
        <button class="btn quiet tiny-btn" type="button" :disabled="loadingRuns" @click="emit('refresh')">
          刷新
        </button>
        <button class="btn quiet tiny-btn" type="button" @click="emit('toggle-history')">
          {{ historyCollapsed ? '展开' : '收起' }}
        </button>
      </div>
    </header>

    <p v-if="historyCollapsed" class="quiet tiny history-collapsed-note">
      已收起 {{ runs.length }} 条生成记录，需要时点“展开”。
    </p>
    <div v-else-if="runs.length === 0" class="empty small-empty">还没有生成记录</div>
    <div v-else class="history-layout">
      <div class="run-list">
        <button
          v-for="run in runs"
          :key="run.id"
          class="run-choice"
          :class="{ on: selectedRunId === run.id }"
          type="button"
          @click="emit('toggle-run', run)"
        >
          <span class="run-choice-main">
            <span class="run-choice-title">{{ runTitle(run) }}</span>
            <span class="run-choice-meta">
              {{ formatDate(run.createdAt, false) }} · {{ run.templateName }}
            </span>
          </span>
          <span v-if="run.status === 'failed'" class="chip danger">失败</span>
          <span v-else-if="run.status === 'running'" class="chip accent">生成中</span>
          <span v-else-if="run.status === 'queued'" class="chip">排队中</span>
          <span v-else-if="run.outcome" class="chip" :class="outcomeChip(run.outcome)">
            {{ outcomeLabel(run.outcome) }}
          </span>
          <span v-else class="chip">待反馈</span>
        </button>
      </div>

      <article v-if="selectedRun" class="run-detail">
        <header class="run-detail-head">
          <div>
            <p class="eyebrow">{{ formatDate(selectedRun.createdAt) }}</p>
            <h3>{{ selectedRun.templateName }}</h3>
          </div>
          <div class="run-detail-actions">
            <template v-if="selectedRun.status === 'ready' && selectedRun.output">
              <button
                class="btn quiet tiny-btn"
                type="button"
                :disabled="exporting !== ''"
                @click="emit('export', 'docx')"
              >
                {{ exporting === 'docx' ? '导出中' : '导出 Word' }}
              </button>
              <button
                class="btn quiet tiny-btn"
                type="button"
                :disabled="exporting !== ''"
                @click="emit('export', 'html')"
              >
                {{ exporting === 'html' ? '导出中' : '导出 HTML' }}
              </button>
              <button
                class="btn quiet tiny-btn"
                type="button"
                :disabled="exporting !== ''"
                @click="emit('export', 'txt')"
              >
                {{ exporting === 'txt' ? '导出中' : '导出 TXT' }}
              </button>
              <button class="btn quiet tiny-btn" type="button" @click="emit('copy-output')">
                复制全文
              </button>
            </template>
            <button class="btn quiet tiny-btn" type="button" @click="emit('collapse-run')">
              收起
            </button>
          </div>
        </header>

        <div v-if="selectedRun.status === 'failed'" class="failure-panel">
          <p class="notice">{{ selectedRun.error || '这次没有生成成功' }}</p>
          <button class="btn ghost small" type="button" :disabled="busy" @click="emit('retry')">
            {{ busy ? '正在重试' : '从失败处重试' }}
          </button>
        </div>
        <div v-else-if="selectedRun.status !== 'ready'" class="progress-panel">
          <div class="progress-head">
            <strong>{{ selectedRun.status === 'queued' ? '正在排队' : '正在逐个模块生成' }}</strong>
            <span class="quiet tiny">{{ progressLabel(selectedRun) }}</span>
          </div>
          <div class="progress-track" aria-hidden="true">
            <span :style="{ width: `${progressPercent(selectedRun)}%` }" />
          </div>
          <div v-if="selectedRun.sections.length" class="section-progress">
            <div
              v-for="section in selectedRun.sections"
              :key="section.seq"
              class="section-progress-row"
              :class="section.status"
            >
              <span class="section-seq">{{ section.seq }}</span>
              <span class="section-title">{{ section.title }}</span>
              <span class="section-state">{{ sectionStatusLabel(section.status) }}</span>
            </div>
          </div>
          <p v-else class="quiet tiny">正在按目的树切分对话模块，稍后这里会显示每一段的进度。</p>
        </div>
        <ConsultRunEditor
          v-else
          :selected-run="selectedRun"
          :open-section-seq="openSectionSeq"
          :dirty-sections="dirtySections"
          :pending-options="pendingOptions"
          :module-busy="moduleBusy"
          :saving-seq="savingSeq"
          :editor-error="editorError"
          @toggle-section="emit('toggle-section', $event)"
          @collapse-modules="emit('collapse-modules')"
          @copy-output="emit('copy-output')"
          @mark-dirty="emit('mark-dirty', $event)"
          @select-option="(section, optionId) => emit('select-option', section, optionId)"
          @rewrite-option="emit('rewrite-option', $event)"
          @save-section="emit('save-section', $event)"
          @regenerate="emit('regenerate', $event)"
          @add-section="emit('add-section', $event)"
          @delete-section="emit('delete-section', $event)"
          @add-beat="(section, kind) => emit('add-beat', section, kind)"
          @remove-beat="(section, index) => emit('remove-beat', section, index)"
        />

        <div v-if="selectedRun.purposePath?.items.length" class="run-path">
          <span
            v-for="item in selectedRun.purposePath.items"
            :key="item.purposeKey"
            class="path-chip"
            :title="item.reason || item.summary"
          >
            {{ item.stageLabel }} · {{ item.label }}
          </span>
        </div>

        <footer v-if="selectedRun.status === 'ready'" class="feedback">
          <div class="feedback-head">
            <strong>{{ selectedRun.outcome ? '反馈已记录' : '记录这次结果' }}</strong>
            <span class="quiet tiny">记录后，系统会记住哪些目的对这类学生更有效。</span>
          </div>
          <div v-if="!selectedRun.outcome" class="feedback-actions">
            <button class="btn ghost small" type="button" :disabled="feedbackBusy" @click="emit('record-outcome', 'won')">成交</button>
            <button class="btn ghost small" type="button" :disabled="feedbackBusy" @click="emit('record-outcome', 'lost')">未成交</button>
            <button class="btn ghost small" type="button" :disabled="feedbackBusy" @click="emit('record-outcome', 'liked')">用户好评</button>
            <button class="btn ghost small" type="button" :disabled="feedbackBusy" @click="emit('record-outcome', 'abandoned')">中途退出</button>
          </div>
          <div v-else class="feedback-result">
            <span class="chip" :class="outcomeChip(selectedRun.outcome)">{{ outcomeLabel(selectedRun.outcome) }}</span>
          </div>
        </footer>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type {
  ConsultBeatKind,
  ConsultOutcome,
  ConsultRun,
  ConsultRunSection
} from '@/api'
import { formatDate } from '@/format'
import ConsultRunEditor from './ConsultRunEditor.vue'
import {
  outcomeChip,
  outcomeLabel,
  progressLabel,
  progressPercent,
  runTitle,
  sectionStatusLabel
} from './consultRunView'

defineProps<{
  runs: ConsultRun[]
  selectedRun: ConsultRun | null
  selectedRunId: string
  loadingRuns: boolean
  historyCollapsed: boolean
  busy: boolean
  feedbackBusy: boolean
  exporting: '' | 'docx' | 'html' | 'txt'
  openSectionSeq: number
  dirtySections: Record<number, boolean>
  pendingOptions: Record<number, string>
  moduleBusy: number
  savingSeq: number
  editorError: string
}>()

const emit = defineEmits<{
  (event: 'refresh'): void
  (event: 'toggle-history'): void
  (event: 'toggle-run', run: ConsultRun): void
  (event: 'collapse-run'): void
  (event: 'export', format: 'docx' | 'html' | 'txt'): void
  (event: 'copy-output'): void
  (event: 'retry'): void
  (event: 'record-outcome', outcome: Exclude<ConsultOutcome, ''>): void
  (event: 'toggle-section', seq: number): void
  (event: 'collapse-modules'): void
  (event: 'mark-dirty', seq: number): void
  (event: 'select-option', section: ConsultRunSection, optionId: string): void
  (event: 'rewrite-option', section: ConsultRunSection): void
  (event: 'save-section', section: ConsultRunSection): void
  (event: 'regenerate', section: ConsultRunSection): void
  (event: 'add-section', afterSeq?: number): void
  (event: 'delete-section', section: ConsultRunSection): void
  (event: 'add-beat', section: ConsultRunSection, kind: ConsultBeatKind): void
  (event: 'remove-beat', section: ConsultRunSection, index: number): void
}>()
</script>

<style scoped>
.card-head,
.run-detail-head,
.feedback-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.history-card {
  min-width: 0;
  padding: 22px;
}

.card-head {
  align-items: center;
  margin-bottom: 18px;
}

.card-head h2,
.run-detail-head h3 {
  font-size: 16px;
}

.card-head p {
  margin-top: 3px;
}

.history-layout {
  display: grid;
  grid-template-columns: minmax(170px, 0.7fr) minmax(0, 1.5fr);
  gap: 16px;
  align-items: start;
}

.run-list {
  display: grid;
  gap: 4px;
  max-height: 680px;
  overflow: auto;
  padding-right: 3px;
}

.run-choice {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 7px;
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  text-align: left;
}

.run-choice:hover,
.run-choice.on {
  background: rgba(47, 93, 70, 0.065);
}

.run-choice.on {
  box-shadow: inset 2px 0 var(--accent);
}

.run-choice-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.run-choice-title {
  display: -webkit-box;
  overflow: hidden;
  color: var(--ink-2);
  font-size: 12.5px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.run-choice-meta {
  color: var(--ink-3);
  font-size: 10.5px;
}

.run-detail {
  min-width: 0;
  padding-left: 16px;
  border-left: 1px solid var(--line);
}

.run-detail-head {
  align-items: center;
  margin-bottom: 14px;
}

.run-detail-actions,
.history-head-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.history-collapsed-note {
  margin: 0;
  padding: 10px 0 2px;
}

.run-path {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 13px;
}

.path-chip {
  padding: 5px 8px;
  border-radius: 7px;
  background: rgba(47, 93, 70, 0.06);
  color: var(--ink-2);
  font-size: 10.5px;
}

.feedback {
  margin-top: 18px;
  padding-top: 15px;
  border-top: 1px solid var(--line);
}

.feedback-actions {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.feedback-result {
  margin-top: 10px;
}

.small-empty {
  padding: 34px 16px;
}

.tiny-btn {
  height: 28px;
  padding: 0 8px;
  font-size: 11.5px;
}

.failure-panel,
.progress-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 253, 248, 0.72);
}

.failure-panel .notice {
  margin: 0;
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.progress-track {
  width: 100%;
  height: 6px;
  overflow: hidden;
  border-radius: 99px;
  background: var(--line);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width 0.35s ease;
}

.section-progress {
  display: grid;
  gap: 4px;
}

.section-progress-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border-radius: 8px;
  color: var(--ink-3);
  font-size: 12px;
}

.section-progress-row.running {
  background: var(--accent-soft);
  color: var(--accent);
}

.section-progress-row.failed {
  color: var(--danger);
}

.section-seq {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.section-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-state {
  font-size: 11px;
}

@media (max-width: 1100px) {
  .history-layout {
    grid-template-columns: 1fr;
  }

  .run-list {
    max-height: 250px;
  }

  .run-detail {
    padding-left: 0;
    border-left: 0;
  }
}

@media (max-width: 720px) {
  .history-card {
    padding: 17px;
  }
}
</style>
