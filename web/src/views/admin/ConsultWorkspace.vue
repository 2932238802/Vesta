<template>
  <div class="consult-workspace">
    <header class="page-head">
      <div>
        <p class="eyebrow">咨询</p>
        <h1 class="page-title">写咨询稿</h1>
      </div>
      <div class="head-actions">
        <RouterLink class="btn ghost small" to="/admin/consult/tree">维护咨询路径</RouterLink>
        <RouterLink class="btn ghost small" to="/admin/consult/indexes">查看路径索引</RouterLink>
        <RouterLink class="btn ghost small" to="/admin/consult/templates">调整咨询稿风格</RouterLink>
      </div>
    </header>

    <div v-if="loading" class="card empty">正在读取</div>
    <div v-else-if="loadError" class="card empty">
      {{ loadError }}
      <div class="empty-action">
        <button class="btn ghost small" type="button" @click="load">重新读取</button>
      </div>
    </div>

    <template v-else>
      <p v-if="!ai.configured" class="notice">
        AI 还没开通。可以先看看咨询会走哪些方向，但暂时不能生成完整咨询稿。
        请联系技术人员开通。
      </p>

      <div class="workspace-grid">
        <section class="card compose-card">
          <header class="card-head">
            <div>
              <h2>这次的情况</h2>
              <p class="quiet tiny">填多少都可以，信息越具体，写出来越贴近对方。</p>
            </div>
            <span class="chip" :class="{ accent: ai.configured }">
              {{ ai.configured ? 'AI 可用' : 'AI 未开通' }}
            </span>
          </header>

          <form class="compose-form" @submit.prevent="generate">
            <label class="field">
              <span>称呼（可选）</span>
              <input
                v-model="userName"
                class="input"
                type="text"
                maxlength="80"
                placeholder="例：小林"
              />
            </label>

            <label class="field">
              <span>咨询稿框架</span>
              <select v-model="templateId" class="select">
                <option v-for="template in templates" :key="template.id" :value="template.id">
                  {{ templateOptionLabel(template) }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>咨询稿篇幅</span>
              <select v-model.number="targetLength" class="select">
                <option :value="20000">约 2 万字</option>
                <option :value="30000">约 3 万字</option>
                <option :value="40000">约 4 万字</option>
              </select>
            </label>

            <label class="field">
              <span>关键词（可选，用逗号隔开）</span>
              <input
                v-model="tagsText"
                class="input"
                type="text"
                maxlength="300"
                placeholder="例：求职, 英语, 杭州"
              />
            </label>

            <div class="field">
              <div class="field-label-row">
                <span>来访者情况（可选）</span>
                <button class="btn quiet tiny-btn" type="button" @click="openImport">
                  从问卷导入
                </button>
              </div>
              <textarea
                v-model="profile"
                class="textarea"
                rows="3"
                maxlength="20000"
                placeholder="例：大三，汉语言专业，想留在杭州做运营，但还没有实习"
              />
            </div>

            <div class="compose-actions">
              <button class="btn ghost" type="button" :disabled="busy" @click="preview">
                先看看会怎么聊
              </button>
              <button class="btn" type="submit" :disabled="busy || !ai.configured">
                {{ busy ? '正在生成' : '生成咨询稿' }}
              </button>
            </div>
            <p class="quiet tiny">
              长稿会先规划章节，再逐章生成。通常需要几分钟，关掉页面也不会中断。
            </p>
            <p v-if="actionError" class="notice">{{ actionError }}</p>
          </form>

          <section v-if="decision" class="path-panel">
            <div class="path-head">
              <strong>本次咨询师会这样说</strong>
              <span class="quiet tiny">{{ decision.path.length }} 步</span>
            </div>
            <ol class="path-list">
              <li v-for="(item, index) in decision.path" :key="item.id">
                <span class="path-index">{{ index + 1 }}</span>
                <span class="path-text">{{ item.text }}</span>
              </li>
            </ol>
            <details v-if="decision.steps.length" class="trace-details">
              <summary>为什么这样安排</summary>
              <p class="quiet tiny trace-note">系统比较了下一句可以怎么说，以及哪一句更贴近本次学生情况。</p>
              <div v-for="step in decision.steps" :key="step.nodeId" class="trace-step">
                <p class="trace-title">{{ step.nodeText }}</p>
                <div
                  v-for="candidate in step.candidates"
                  :key="candidate.id"
                  class="trace-choice"
                  :class="{ selected: candidate.selected }"
                >
                  <span>{{ candidate.text }}</span>
                  <em v-if="candidate.selected">{{ step.explored ? '本次尝试这个方向' : '本次走这里' }}</em>
                </div>
              </div>
            </details>
          </section>
        </section>

        <section class="card history-card">
          <header class="card-head">
            <div>
              <h2>生成记录</h2>
              <p class="quiet tiny">生成后记一下结果，系统以后会选得更准。</p>
            </div>
            <button class="btn quiet tiny-btn" type="button" :disabled="loadingRuns" @click="loadRuns">
              刷新
            </button>
          </header>

          <div v-if="runs.length === 0" class="empty small-empty">还没有生成记录</div>
          <div v-else class="history-layout">
            <div class="run-list">
              <button
                v-for="run in runs"
                :key="run.id"
                class="run-choice"
                :class="{ on: selectedRunId === run.id }"
                type="button"
                @click="selectRun(run)"
              >
                <span class="run-choice-main">
                  <span class="run-choice-title">{{ run.path.at(-1)?.text || '未完成生成' }}</span>
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
                <button
                  v-if="selectedRun.status === 'ready' && selectedRun.output"
                  class="btn quiet tiny-btn"
                  type="button"
                  @click="copyOutput"
                >
                  复制全文
                </button>
              </header>

              <div v-if="selectedRun.status === 'failed'" class="failure-panel">
                <p class="notice">{{ selectedRun.error || '这次没有生成成功' }}</p>
                <button class="btn ghost small" type="button" :disabled="busy" @click="retryRun">
                  {{ busy ? '正在重试' : '从失败处重试' }}
                </button>
              </div>
              <div v-else-if="selectedRun.status !== 'ready'" class="progress-panel">
                <div class="progress-head">
                  <strong>{{ selectedRun.status === 'queued' ? '正在排队' : '正在逐章生成' }}</strong>
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
                <p v-else class="quiet tiny">正在规划章节，稍后这里会显示每一章的进度。</p>
              </div>
              <pre v-else class="run-output">{{ selectedRun.output }}</pre>

              <div class="run-path">
                <span v-for="(item, index) in selectedRun.path" :key="item.id" class="path-chip">
                  {{ index + 1 }}. {{ item.text }}
                </span>
              </div>
              <p class="quiet tiny path-index-line">路径索引 {{ selectedRun.pathIndexId }}</p>

              <footer v-if="selectedRun.status === 'ready'" class="feedback">
                <div class="feedback-head">
                  <strong>{{ selectedRun.outcome ? '反馈已记录' : '记录这次结果' }}</strong>
                  <span class="quiet tiny">记录后，系统会记住这条路径效果好不好。</span>
                </div>
                <div v-if="!selectedRun.outcome" class="feedback-actions">
                  <button class="btn ghost small" type="button" :disabled="feedbackBusy" @click="recordOutcome('won')">成交</button>
                  <button class="btn ghost small" type="button" :disabled="feedbackBusy" @click="recordOutcome('lost')">未成交</button>
                  <button class="btn ghost small" type="button" :disabled="feedbackBusy" @click="recordOutcome('liked')">用户好评</button>
                  <button class="btn ghost small" type="button" :disabled="feedbackBusy" @click="recordOutcome('abandoned')">中途退出</button>
                </div>
                <div v-else class="feedback-result">
                  <span class="chip" :class="outcomeChip(selectedRun.outcome)">{{ outcomeLabel(selectedRun.outcome) }}</span>
                  <span v-if="selectedRun.outcome === 'abandoned'" class="quiet tiny">
                    聊到这里离开：{{ selectedRun.path.find((item) => item.id === selectedRun?.outcomeNodeId)?.text || '最后一步' }}
                  </span>
                </div>
                <label v-if="!selectedRun.outcome" class="field breakpoint-field">
                  <span>对方聊到哪一步离开（可选）</span>
                  <select v-model="breakpointNodeId" class="select">
                    <option value="">最后一步</option>
                    <option v-for="item in selectedRun.path" :key="item.id" :value="item.id">
                      {{ item.text }}
                    </option>
                  </select>
                </label>
              </footer>
            </article>
          </div>
        </section>
      </div>
    </template>

    <Modal
      :open="importOpen"
      title="从问卷导入情况"
      eyebrow="来访者情况"
      wide
      @close="closeImport"
    >
      <div class="import-dialog">
        <label class="field">
          <span>搜索姓名、备注或渠道</span>
          <input
            v-model="importSearch"
            class="input"
            type="search"
            maxlength="80"
            placeholder="例：小林 / 大二 / 朋友圈"
          />
        </label>

        <p class="quiet tiny import-hint">
          导入会用答卷内容覆盖当前“来访者情况”。如果还没填称呼，也会自动带上姓名。
        </p>

        <div v-if="importLoading" class="import-empty">正在读取答卷</div>
        <p v-else-if="importError" class="notice">{{ importError }}</p>
        <div v-else-if="importSubmissions.length === 0" class="import-empty">
          没有找到可导入的答卷
        </div>
        <div v-else class="import-list">
          <button
            v-for="item in importSubmissions"
            :key="item.id"
            class="import-choice"
            type="button"
            :disabled="importingSubmissionId !== ''"
            @click="importSubmission(item)"
          >
            <span class="import-choice-main">
              <span class="import-choice-name">{{ item.name || '未命名' }}</span>
              <span class="import-choice-meta">
                {{ item.note || item.channel || '没有备注' }} · {{ formatDate(item.createdAt, false) }}
              </span>
            </span>
            <span class="import-choice-side">
              <span class="chip accent">{{ item.tier }} 档</span>
              <span class="quiet tiny">{{ importingSubmissionId === item.id ? '正在导入' : '导入' }}</span>
            </span>
          </button>
        </div>
      </div>
      <template #footer>
        <button class="btn ghost small" type="button" @click="closeImport">取消</button>
      </template>
    </Modal>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  api,
  type AdminSubmissionDetail,
  type AdminSubmissionSummary,
  type ConsultContext,
  type ConsultDecisionPath,
  type ConsultOutcome,
  type ConsultRun,
  type ConsultRunSectionStatus,
  type ConsultTemplate
} from '@/api'
import Modal from '@/components/Modal.vue'
import { formatDate } from '@/format'

const loading = ref(true)
const loadingRuns = ref(false)
const loadError = ref('')
const actionError = ref('')
const busy = ref(false)
const feedbackBusy = ref(false)
const templates = ref<ConsultTemplate[]>([])
const activeTemplateId = ref('')
const templateId = ref('')
const userName = ref('')
const tagsText = ref('')
const profile = ref('')
const targetLength = ref(30000)
const decision = ref<ConsultDecisionPath | null>(null)
const runs = ref<ConsultRun[]>([])
const selectedRunId = ref('')
const breakpointNodeId = ref('')
const toast = ref('')
const ai = ref({ configured: false, model: '' })
const importOpen = ref(false)
const importLoading = ref(false)
const importError = ref('')
const importSearch = ref('')
const importSubmissions = ref<AdminSubmissionSummary[]>([])
const importingSubmissionId = ref('')

let importTimer: ReturnType<typeof setTimeout> | undefined
let pollTimer: ReturnType<typeof setTimeout> | undefined
let pollRunId = ''

const selectedRun = computed(() => runs.value.find((run) => run.id === selectedRunId.value) ?? null)

function templateOptionLabel(template: ConsultTemplate): string {
  return template.id === activeTemplateId.value ? `${template.name}（默认使用）` : template.name
}

function progressPercent(run: ConsultRun): number {
  if (run.status === 'ready') return 100
  if (!run.sections.length) return 4
  const done = run.sections.filter((section) => section.status === 'ready').length
  return Math.max(4, Math.round((done / run.sections.length) * 100))
}

function progressLabel(run: ConsultRun): string {
  if (!run.sections.length) return run.status === 'queued' ? '等待开始' : '正在准备章节'
  const done = run.sections.filter((section) => section.status === 'ready').length
  return `${done} / ${run.sections.length} 章`
}

function sectionStatusLabel(status: ConsultRunSectionStatus): string {
  return {
    pending: '待写',
    running: '正在写',
    ready: '已完成',
    failed: '失败'
  }[status]
}

function context(): ConsultContext {
  return {
    name: userName.value.trim(),
    tags: tagsText.value
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    profile: profile.value.trim()
  }
}

watch(importSearch, () => {
  if (!importOpen.value) return
  if (importTimer) clearTimeout(importTimer)
  importTimer = setTimeout(() => void loadImportSubmissions(), 280)
})

async function openImport() {
  importOpen.value = true
  importError.value = ''
  await loadImportSubmissions()
}

function closeImport() {
  if (importingSubmissionId.value) return
  importOpen.value = false
  importError.value = ''
}

async function loadImportSubmissions() {
  importLoading.value = true
  importError.value = ''
  try {
    const result = await api.submissions({ q: importSearch.value.trim() })
    importSubmissions.value = result.submissions
  } catch (error) {
    importError.value = error instanceof Error ? error.message : '读取答卷失败'
  } finally {
    importLoading.value = false
  }
}

function profileFromSubmission(detail: AdminSubmissionDetail): string {
  const lines: string[] = []
  if (detail.note) lines.push(`备注：${detail.note}`)
  if (detail.channel) lines.push(`渠道：${detail.channel}`)
  lines.push(`问卷结果：${detail.total} 分（${detail.tier} 档）`)

  for (const group of detail.groups) {
    const answers = detail.answers.filter((answer) => answer.group === group.title && answer.value)
    if (!answers.length) continue
    lines.push('', `【${group.title}】`)
    for (const answer of answers) {
      lines.push(`${answer.code} ${answer.title}：${answer.value}`)
    }
  }
  return lines.join('\n').trim()
}

async function importSubmission(item: AdminSubmissionSummary) {
  if (profile.value.trim() && !window.confirm('导入会用这份答卷覆盖当前“来访者情况”，继续？')) return
  importingSubmissionId.value = item.id
  importError.value = ''
  try {
    const detail = await api.submission(item.id)
    profile.value = profileFromSubmission(detail)
    if (!userName.value.trim()) userName.value = detail.name
    importOpen.value = false
    flash('问卷内容已导入')
  } catch (error) {
    importError.value = error instanceof Error ? error.message : '导入失败'
  } finally {
    importingSubmissionId.value = ''
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await api.consult()
    templates.value = result.templates
    activeTemplateId.value = result.activeTemplateId
    templateId.value = result.activeTemplateId
    ai.value = result.ai
    await loadRuns(false)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '读取失败'
  } finally {
    loading.value = false
  }
}

async function loadRuns(showError = true) {
  loadingRuns.value = true
  try {
    const result = await api.consultRuns()
    runs.value = result.runs
    if (!selectedRunId.value && result.runs.length) {
      selectRun(result.runs[0])
      if (result.runs[0].status === 'queued' || result.runs[0].status === 'running') {
        startPolling(result.runs[0].id)
      }
    }
  } catch (error) {
    if (showError) actionError.value = error instanceof Error ? error.message : '读取历史失败'
  } finally {
    loadingRuns.value = false
  }
}

function selectRun(run: ConsultRun) {
  selectedRunId.value = run.id
  breakpointNodeId.value = run.path.at(-1)?.id ?? ''
}

function replaceRun(run: ConsultRun) {
  const index = runs.value.findIndex((item) => item.id === run.id)
  if (index >= 0) runs.value[index] = run
  else runs.value = [run, ...runs.value]
}

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = undefined
  pollRunId = ''
}

function startPolling(runId: string) {
  if (pollRunId === runId && pollTimer) return
  stopPolling()
  pollRunId = runId
  const poll = async () => {
    if (pollRunId !== runId) return
    try {
      const result = await api.consultRun(runId)
      replaceRun(result.run)
      if (selectedRunId.value === runId) {
        breakpointNodeId.value = result.run.path.at(-1)?.id ?? ''
      }
      if (result.run.status === 'queued' || result.run.status === 'running') {
        pollTimer = setTimeout(poll, 2000)
        return
      }
      stopPolling()
      busy.value = false
      if (result.run.status === 'ready') {
        flash('咨询稿已生成')
      } else {
        actionError.value = result.run.error || '这次生成失败了，可以重试'
      }
    } catch (error) {
      stopPolling()
      busy.value = false
      actionError.value = error instanceof Error ? error.message : '读取生成进度失败'
    }
  }
  busy.value = true
  void poll()
}

async function preview() {
  actionError.value = ''
  busy.value = true
  try {
    const result = await api.previewConsult(context())
    decision.value = result.decision
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '预览失败'
  } finally {
    busy.value = false
  }
}

async function generate() {
  actionError.value = ''
  busy.value = true
  try {
    const result = await api.generateConsult({
      context: context(),
      templateId: templateId.value,
      targetLength: targetLength.value
    })
    if (result.run) {
      replaceRun(result.run)
      selectRun(result.run)
      decision.value = { path: result.run.path, steps: result.run.steps, leafId: result.run.path.at(-1)?.id ?? '' }
      startPolling(result.run.id)
    } else {
      busy.value = false
    }
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '生成失败'
    busy.value = false
  }
}

async function retryRun() {
  if (!selectedRun.value) return
  actionError.value = ''
  busy.value = true
  try {
    const result = await api.retryConsultRun(selectedRun.value.id)
    replaceRun(result.run)
    startPolling(result.run.id)
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '重试失败'
    busy.value = false
  }
}

async function recordOutcome(outcome: Exclude<ConsultOutcome, ''>) {
  const run = selectedRun.value
  if (!run || run.outcome) return
  feedbackBusy.value = true
  actionError.value = ''
  try {
    const result = await api.setConsultOutcome(run.id, {
      outcome,
      nodeId: outcome === 'abandoned' ? breakpointNodeId.value : undefined
    })
    const index = runs.value.findIndex((item) => item.id === run.id)
    if (index >= 0) {
      runs.value[index] = {
        ...runs.value[index],
        outcome: result.outcome,
        outcomeNodeId: result.outcomeNodeId,
        outcomeAt: new Date().toISOString()
      }
    }
    flash('反馈已记录，系统以后会选得更准')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '记录失败'
  } finally {
    feedbackBusy.value = false
  }
}

function outcomeLabel(outcome: ConsultOutcome): string {
  return {
    won: '成交',
    lost: '未成交',
    liked: '用户好评',
    abandoned: '中途退出',
    '': '待反馈'
  }[outcome]
}

function outcomeChip(outcome: ConsultOutcome): string {
  if (outcome === 'won' || outcome === 'liked') return 'accent'
  if (outcome === 'lost' || outcome === 'abandoned') return 'warn'
  return ''
}

async function copyOutput() {
  if (!selectedRun.value?.output) return
  try {
    await navigator.clipboard.writeText(selectedRun.value.output)
    flash('咨询稿已复制')
  } catch {
    flash('复制失败，请手动选择文字')
  }
}

function flash(message: string) {
  toast.value = message
  setTimeout(() => {
    toast.value = ''
  }, 2000)
}

onMounted(load)
onUnmounted(stopPolling)
</script>

<style scoped>
.page-head,
.card-head,
.path-head,
.run-detail-head,
.feedback-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.page-head {
  margin-bottom: 22px;
}

.page-title {
  margin-top: 3px;
  font-size: 27px;
  letter-spacing: -0.03em;
}

.head-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.85fr) minmax(420px, 1.45fr);
  gap: 20px;
  align-items: start;
}

.compose-card,
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

.compose-form {
  display: grid;
  gap: 14px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.compose-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.path-panel {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.path-list {
  display: grid;
  gap: 7px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.path-list li {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(47, 93, 70, 0.045);
  font-size: 12.5px;
  line-height: 1.55;
}

.path-index {
  flex: 0 0 18px;
  color: var(--accent);
  font-family: var(--mono);
  font-size: 10.5px;
}

.path-text {
  flex: 1;
}

.trace-details {
  margin-top: 12px;
}

.trace-note {
  margin-top: 7px;
  line-height: 1.7;
}

.trace-details summary {
  cursor: pointer;
  color: var(--ink-3);
  font-size: 12px;
}

.trace-step {
  margin-top: 12px;
}

.trace-title {
  margin-bottom: 5px;
  font-size: 12px;
  color: var(--ink-2);
}

.trace-choice {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 6px 9px;
  border-radius: 8px;
  color: var(--ink-3);
  font-size: 11.5px;
}

.trace-choice.selected {
  background: var(--accent-soft);
  color: var(--accent);
}

.trace-choice em {
  margin-left: 5px;
  font-style: normal;
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

.feedback-result,
.breakpoint-field {
  margin-top: 10px;
}

.breakpoint-field {
  max-width: 360px;
}

.path-index-line {
  margin-top: 8px;
  font-family: var(--mono);
}

.small-empty {
  padding: 34px 16px;
}

.tiny-btn {
  height: 28px;
  padding: 0 8px;
  font-size: 11.5px;
}

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
  .workspace-grid,
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
  .page-head {
    flex-direction: column;
  }

  .compose-card,
  .history-card {
    padding: 17px;
  }
}
</style>
