<template>
  <div class="draft-editor">
    <div class="draft-toolbar">
      <span class="quiet tiny">
        共 {{ selectedRun.sections.length }} 个模块 · 点开一个模块修改节拍，改完保存
      </span>
      <div class="draft-toolbar-actions">
        <button class="btn quiet tiny-btn" type="button" @click="emit('collapse-modules')">
          收起
        </button>
        <button class="btn quiet tiny-btn" type="button" @click="emit('copy-output')">
          复制全文
        </button>
      </div>
    </div>

    <p v-if="editorError" class="notice">{{ editorError }}</p>

    <div class="module-list">
      <article
        v-for="section in selectedRun.sections"
        :key="section.seq"
        class="module-card"
        :class="{ open: openSectionSeq === section.seq, edited: section.edited }"
      >
        <header class="module-head" @click="emit('toggle-section', section.seq)">
          <div class="module-title">
            <span class="module-seq">{{ section.seq }}</span>
            <div>
              <h4>{{ section.title }}</h4>
              <p class="quiet tiny">
                {{ section.goal || '还没有目标说明' }}
                <template v-if="section.purposeKeys.length">
                  · {{ section.purposeKeys.length }} 个目的
                </template>
              </p>
            </div>
          </div>
          <div class="module-head-side">
            <span v-if="dirtySections[section.seq]" class="chip warn">未保存</span>
            <span v-else-if="section.edited" class="chip accent">已改</span>
            <span v-else class="chip">{{ sectionStatusLabel(section.status) }}</span>
            <span class="module-chevron">{{ openSectionSeq === section.seq ? '−' : '+' }}</span>
          </div>
        </header>

        <div v-if="openSectionSeq === section.seq" class="module-body">
          <label class="field module-title-field">
            <span>模块标题</span>
            <input
              v-model="section.title"
              class="input"
              type="text"
              maxlength="200"
              @input="emit('mark-dirty', section.seq)"
            />
          </label>

          <section v-if="section.options.length" class="option-block">
            <div class="block-head">
              <strong>先选打法</strong>
              <span class="quiet tiny">
                推荐项有学生依据；换打法后，节拍要按新打法重写。
              </span>
            </div>
            <div class="option-list">
              <button
                v-for="option in section.options"
                :key="option.id"
                class="option-card"
                :class="{ on: optionIsSelected(section, option.id) }"
                type="button"
                @click="emit('select-option', section, option.id)"
              >
                <span class="option-top">
                  <span class="option-id">{{ option.id }}</span>
                  <span class="option-title">{{ option.title }}</span>
                  <span v-if="option.recommended" class="chip accent">推荐</span>
                </span>
                <span class="option-summary">{{ option.summary }}</span>
                <span v-if="option.why" class="option-detail">依据：{{ option.why }}</span>
                <span v-if="option.tradeoff" class="option-detail">代价：{{ option.tradeoff }}</span>
                <span v-if="option.risk" class="option-detail">风险：{{ option.risk }}</span>
                <span v-if="option.evidence.length" class="option-evidence">
                  <span
                    v-for="(evidence, index) in option.evidence"
                    :key="`${option.id}-${index}`"
                    class="evidence-chip"
                  >
                    {{ evidence }}
                  </span>
                </span>
              </button>
            </div>
            <div v-if="pendingDiffers(section)" class="option-apply">
              <span class="quiet tiny">
                已选 {{ pendingOptions[section.seq] }} 打法，节拍还没重写。
              </span>
              <button
                class="btn small"
                type="button"
                :disabled="moduleBusy === section.seq"
                @click="emit('rewrite-option', section)"
              >
                {{ moduleBusy === section.seq ? '正在重写' : '按这个打法重写本模块' }}
              </button>
            </div>
          </section>

          <section v-if="section.beats.length" class="beat-block">
            <div class="block-head">
              <strong>照着说的节拍</strong>
              <span class="quiet tiny">一句话一个节拍；分支写清“如果她说……”。</span>
            </div>
            <div class="beat-list">
              <div
                v-for="(beat, index) in section.beats"
                :key="beat.id || index"
                class="beat-row"
              >
                <select
                  v-model="beat.kind"
                  class="beat-kind"
                  @change="emit('mark-dirty', section.seq)"
                >
                  <option value="line">陈述</option>
                  <option value="ask">提问</option>
                  <option value="student">学生</option>
                  <option value="direction">动作</option>
                  <option value="branch">分支</option>
                </select>
                <div class="beat-main">
                  <input
                    v-if="beat.kind === 'branch'"
                    v-model="beat.when"
                    class="input beat-when"
                    type="text"
                    maxlength="200"
                    placeholder="如果她说……"
                    @input="emit('mark-dirty', section.seq)"
                  />
                  <textarea
                    v-model="beat.text"
                    class="textarea beat-text"
                    rows="2"
                    maxlength="4000"
                    @input="emit('mark-dirty', section.seq)"
                  />
                </div>
                <button
                  class="beat-remove"
                  type="button"
                  title="删除这个节拍"
                  @click="emit('remove-beat', section, index)"
                >
                  ×
                </button>
              </div>
            </div>
            <div class="beat-add">
              <button class="btn quiet tiny-btn" type="button" @click="emit('add-beat', section, 'line')">+ 陈述</button>
              <button class="btn quiet tiny-btn" type="button" @click="emit('add-beat', section, 'ask')">+ 提问</button>
              <button class="btn quiet tiny-btn" type="button" @click="emit('add-beat', section, 'student')">+ 学生回应</button>
              <button class="btn quiet tiny-btn" type="button" @click="emit('add-beat', section, 'direction')">+ 动作</button>
              <button class="btn quiet tiny-btn" type="button" @click="emit('add-beat', section, 'branch')">+ 分支</button>
            </div>
          </section>

          <section
            v-else-if="!section.options.length"
            class="legacy-block"
          >
            <p class="quiet tiny">
              这个模块还没有拆成节拍。可以直接改正文，或者让 AI 重写成三种打法。
            </p>
            <textarea
              v-model="section.content"
              class="textarea legacy-content"
              rows="8"
              @input="emit('mark-dirty', section.seq)"
            />
          </section>

          <label class="field notes-field">
            <span>咨询师备注（不会出现在正文里）</span>
            <textarea
              v-model="section.notes"
              class="textarea"
              rows="2"
              maxlength="8000"
              placeholder="例：她妈妈在旁边，价格先不要逼太紧"
              @input="emit('mark-dirty', section.seq)"
            />
          </label>

          <p v-if="section.error" class="notice">{{ section.error }}</p>

          <div class="module-actions">
            <button
              class="btn small"
              type="button"
              :disabled="savingSeq === section.seq"
              @click="emit('save-section', section)"
            >
              {{ savingSeq === section.seq ? '正在保存' : '保存本模块' }}
            </button>
            <button
              class="btn ghost small"
              type="button"
              :disabled="moduleBusy === section.seq"
              @click="emit('regenerate', section)"
            >
              {{ moduleBusy === section.seq ? '正在重写' : '重新给三种打法' }}
            </button>
            <button
              class="btn ghost small"
              type="button"
              @click="emit('add-section', section.seq)"
            >
              在后面加模块
            </button>
            <button
              class="btn ghost small danger"
              type="button"
              @click="emit('delete-section', section)"
            >
              删除模块
            </button>
          </div>
        </div>
      </article>
    </div>

    <button class="btn ghost small add-module" type="button" @click="emit('add-section')">
      + 在最后加一个模块
    </button>

    <details class="full-draft">
      <summary>查看拼好的全文</summary>
      <pre class="run-output">{{ selectedRun.output }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import type {
  ConsultBeatKind,
  ConsultRun,
  ConsultRunSection
} from '@/api'
import { sectionStatusLabel } from './consultRunView'

const props = defineProps<{
  selectedRun: ConsultRun
  openSectionSeq: number
  dirtySections: Record<number, boolean>
  pendingOptions: Record<number, string>
  moduleBusy: number
  savingSeq: number
  editorError: string
}>()

const emit = defineEmits<{
  (event: 'toggle-section', seq: number): void
  (event: 'collapse-modules'): void
  (event: 'copy-output'): void
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

function optionIsSelected(section: ConsultRunSection, optionId: string): boolean {
  return (props.pendingOptions[section.seq] ?? section.selectedOptionId) === optionId
}

function pendingDiffers(section: ConsultRunSection): boolean {
  const pending = props.pendingOptions[section.seq]
  return Boolean(pending && pending !== section.selectedOptionId)
}
</script>

<style scoped>
.draft-editor {
  display: grid;
  gap: 12px;
}

.draft-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.draft-toolbar-actions {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.tiny-btn {
  height: 28px;
  padding: 0 8px;
  font-size: 11.5px;
}

.module-list {
  display: grid;
  gap: 8px;
}

.module-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  overflow: hidden;
}

.module-card.open {
  border-color: rgba(47, 93, 70, 0.24);
  box-shadow: 0 8px 26px rgba(20, 44, 32, 0.05);
}

.module-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 13px;
  cursor: pointer;
  user-select: none;
}

.module-head:hover {
  background: rgba(47, 93, 70, 0.035);
}

.module-title {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.module-seq {
  flex: none;
  min-width: 22px;
  padding-top: 1px;
  color: var(--ink-3);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.module-title h4 {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.45;
}

.module-title p {
  margin-top: 2px;
  line-height: 1.55;
}

.module-head-side {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.module-chevron {
  width: 20px;
  color: var(--ink-3);
  font-size: 16px;
  text-align: center;
}

.module-body {
  display: grid;
  gap: 14px;
  padding: 4px 13px 15px;
  border-top: 1px solid var(--line);
}

.option-block,
.beat-block,
.legacy-block {
  display: grid;
  gap: 8px;
  padding-top: 11px;
}

.block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.block-head strong {
  font-size: 12px;
}

.block-head .quiet {
  line-height: 1.6;
}

.option-list {
  display: grid;
  gap: 7px;
}

.option-card {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 10px 11px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.012);
  color: var(--ink-2);
  text-align: left;
}

.option-card:hover {
  border-color: rgba(47, 93, 70, 0.28);
}

.option-card.on {
  border-color: rgba(47, 93, 70, 0.5);
  background: rgba(47, 93, 70, 0.045);
  box-shadow: inset 2px 0 var(--accent);
}

.option-top {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.option-id {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(47, 93, 70, 0.09);
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
}

.option-title {
  font-size: 12.5px;
  font-weight: 600;
}

.option-summary {
  font-size: 12px;
  line-height: 1.65;
}

.option-detail {
  color: var(--ink-3);
  font-size: 11px;
  line-height: 1.6;
}

.option-evidence {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.evidence-chip {
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.035);
  color: var(--ink-3);
  font-size: 10px;
  line-height: 1.5;
}

.option-apply {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(184, 124, 33, 0.07);
}

.beat-list {
  display: grid;
  gap: 6px;
}

.beat-row {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr) 24px;
  gap: 7px;
  align-items: start;
}

.beat-kind {
  height: 32px;
  padding: 0 6px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--ink-2);
  font-size: 11px;
}

.beat-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.beat-when {
  height: 30px;
  font-size: 11.5px;
}

.beat-text {
  min-height: 54px;
  padding: 7px 9px;
  font-size: 12.5px;
  line-height: 1.65;
  resize: vertical;
}

.beat-remove {
  width: 24px;
  height: 30px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-3);
  font-size: 16px;
}

.beat-remove:hover {
  background: rgba(160, 60, 50, 0.08);
  color: var(--danger);
}

.beat-add {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.legacy-content {
  min-height: 180px;
  font-size: 13px;
  line-height: 1.8;
}

.notes-field {
  padding-top: 2px;
}

.module-actions {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  padding-top: 2px;
}

.add-module {
  justify-self: start;
}

.full-draft {
  margin-top: 4px;
}

.full-draft summary {
  cursor: pointer;
  color: var(--ink-3);
  font-size: 12px;
}

.run-output {
  margin: 0;
  padding: 18px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.022);
  font-family: var(--sans);
  font-size: 13.5px;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
}

.full-draft .run-output {
  margin-top: 9px;
}

@media (max-width: 720px) {
  .module-head,
  .module-body {
    padding-left: 10px;
    padding-right: 10px;
  }

  .beat-row {
    grid-template-columns: 1fr;
  }

  .beat-kind {
    width: 100%;
  }

  .beat-remove {
    justify-self: end;
  }
}
</style>
