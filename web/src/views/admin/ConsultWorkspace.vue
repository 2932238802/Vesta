<template>
  <div class="consult-workspace">
    <header class="page-head">
      <div>
        <p class="eyebrow">咨询</p>
        <h1 class="page-title">写咨询稿</h1>
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
        AI 还没开通，暂时不能生成咨询稿。请联系技术人员开通。
      </p>
      <p v-if="!purposeTemplates.length" class="notice">
        咨询树数据还没有生成。请先运行 node prototype/consult-purpose-tree/generate.mjs。
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
              <span>咨询树</span>
              <select v-model="purposeTemplateId" class="select">
                <option v-for="item in purposeTemplates" :key="item.id" :value="item.id">
                  {{ purposeTemplateLabel(item) }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>目标篇幅（只作参考，不按字数硬凑）</span>
              <select v-model.number="targetLength" class="select">
                <option :value="20000">约 2 万字</option>
                <option :value="30000">约 3 万字</option>
                <option :value="40000">约 4 万字</option>
              </select>
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
              <button class="btn" type="submit" :disabled="busy || !ai.configured || !purposeTemplateId">
                {{ busy ? '正在生成' : '生成咨询稿' }}
              </button>
            </div>
            <p class="quiet tiny">
              生成时会先判断这次要走哪些目的，再切成 10—20 个对话模块。每个模块给三种打法，默认选最有依据的一种，并写成节拍。通常需要几分钟，关掉页面也不会中断。
            </p>
            <p v-if="actionError" class="notice">{{ actionError }}</p>
          </form>
        </section>

        <section class="card history-card">
          <header class="card-head">
            <div>
              <h2>生成记录</h2>
              <p class="quiet tiny">生成后记一下结果，系统以后会选得更准。</p>
            </div>
            <div class="history-head-actions">
              <button class="btn quiet tiny-btn" type="button" :disabled="loadingRuns" @click="loadRuns">
                刷新
              </button>
              <button class="btn quiet tiny-btn" type="button" @click="toggleHistory">
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
                @click="toggleRun(run)"
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
                      @click="exportRun('docx')"
                    >
                      {{ exporting === 'docx' ? '导出中' : '导出 Word' }}
                    </button>
                    <button
                      class="btn quiet tiny-btn"
                      type="button"
                      :disabled="exporting !== ''"
                      @click="exportRun('html')"
                    >
                      {{ exporting === 'html' ? '导出中' : '导出 HTML' }}
                    </button>
                    <button
                      class="btn quiet tiny-btn"
                      type="button"
                      :disabled="exporting !== ''"
                      @click="exportRun('txt')"
                    >
                      {{ exporting === 'txt' ? '导出中' : '导出 TXT' }}
                    </button>
                    <button class="btn quiet tiny-btn" type="button" @click="copyOutput">
                      复制全文
                    </button>
                  </template>
                  <button class="btn quiet tiny-btn" type="button" @click="collapseRun">
                    收起
                  </button>
                </div>
              </header>

              <div v-if="selectedRun.status === 'failed'" class="failure-panel">
                <p class="notice">{{ selectedRun.error || '这次没有生成成功' }}</p>
                <button class="btn ghost small" type="button" :disabled="busy" @click="retryRun">
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
              <div v-else class="draft-editor">
                <div class="draft-toolbar">
                  <span class="quiet tiny">
                    共 {{ selectedRun.sections.length }} 个模块 · 点开一个模块修改节拍，改完保存
                  </span>
                  <div class="draft-toolbar-actions">
                    <button class="btn quiet tiny-btn" type="button" @click="collapseModules">
                      收起
                    </button>
                    <button class="btn quiet tiny-btn" type="button" @click="copyOutput">
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
                    <header class="module-head" @click="toggleSection(section.seq)">
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
                          @input="markDirty(section.seq)"
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
                            @click="selectOption(section, option.id)"
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
                            @click="rewriteByOption(section)"
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
                              @change="markDirty(section.seq)"
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
                                @input="markDirty(section.seq)"
                              />
                              <textarea
                                v-model="beat.text"
                                class="textarea beat-text"
                                rows="2"
                                maxlength="4000"
                                @input="markDirty(section.seq)"
                              />
                            </div>
                            <button
                              class="beat-remove"
                              type="button"
                              title="删除这个节拍"
                              @click="removeBeat(section, index)"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <div class="beat-add">
                          <button class="btn quiet tiny-btn" type="button" @click="addBeat(section, 'line')">+ 陈述</button>
                          <button class="btn quiet tiny-btn" type="button" @click="addBeat(section, 'ask')">+ 提问</button>
                          <button class="btn quiet tiny-btn" type="button" @click="addBeat(section, 'student')">+ 学生回应</button>
                          <button class="btn quiet tiny-btn" type="button" @click="addBeat(section, 'direction')">+ 动作</button>
                          <button class="btn quiet tiny-btn" type="button" @click="addBeat(section, 'branch')">+ 分支</button>
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
                          @input="markDirty(section.seq)"
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
                          @input="markDirty(section.seq)"
                        />
                      </label>

                      <p v-if="section.error" class="notice">{{ section.error }}</p>

                      <div class="module-actions">
                        <button
                          class="btn small"
                          type="button"
                          :disabled="savingSeq === section.seq"
                          @click="saveSection(section)"
                        >
                          {{ savingSeq === section.seq ? '正在保存' : '保存本模块' }}
                        </button>
                        <button
                          class="btn ghost small"
                          type="button"
                          :disabled="moduleBusy === section.seq"
                          @click="regenerateSection(section)"
                        >
                          {{ moduleBusy === section.seq ? '正在重写' : '重新给三种打法' }}
                        </button>
                        <button
                          class="btn ghost small"
                          type="button"
                          @click="addSection(section.seq)"
                        >
                          在后面加模块
                        </button>
                        <button
                          class="btn ghost small danger"
                          type="button"
                          @click="deleteSection(section)"
                        >
                          删除模块
                        </button>
                      </div>
                    </div>
                  </article>
                </div>

                <button class="btn ghost small add-module" type="button" @click="addSection()">
                  + 在最后加一个模块
                </button>

                <details class="full-draft">
                  <summary>查看拼好的全文</summary>
                  <pre class="run-output">{{ selectedRun.output }}</pre>
                </details>
              </div>

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
                  <button class="btn ghost small" type="button" :disabled="feedbackBusy" @click="recordOutcome('won')">成交</button>
                  <button class="btn ghost small" type="button" :disabled="feedbackBusy" @click="recordOutcome('lost')">未成交</button>
                  <button class="btn ghost small" type="button" :disabled="feedbackBusy" @click="recordOutcome('liked')">用户好评</button>
                  <button class="btn ghost small" type="button" :disabled="feedbackBusy" @click="recordOutcome('abandoned')">中途退出</button>
                </div>
                <div v-else class="feedback-result">
                  <span class="chip" :class="outcomeChip(selectedRun.outcome)">{{ outcomeLabel(selectedRun.outcome) }}</span>
                </div>
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
import {
  api,
  type AdminSubmissionDetail,
  type AdminSubmissionSummary,
  type ConsultBeat,
  type ConsultBeatKind,
  type ConsultContext,
  type ConsultOutcome,
  type ConsultRun,
  type ConsultRunSection,
  type ConsultRunSectionStatus
} from '@/api'
import Modal from '@/components/Modal.vue'
import { formatDate } from '@/format'

interface PurposeTemplateSummary {
  id: string
  name: string
  season: string
  description: string
  stats: { purposes: number; optional: number; gaps: number }
}

const loading = ref(true)
const loadingRuns = ref(false)
const loadError = ref('')
const actionError = ref('')
const busy = ref(false)
const feedbackBusy = ref(false)
const purposeTemplates = ref<PurposeTemplateSummary[]>([])
const activePurposeTemplateId = ref('')
const purposeTemplateId = ref('')
const userName = ref('')
const profile = ref('')
const targetLength = ref(30000)
const runs = ref<ConsultRun[]>([])
const selectedRunId = ref('')
const toast = ref('')
const ai = ref({ configured: false, model: '' })
const importOpen = ref(false)
const importLoading = ref(false)
const importError = ref('')
const importSearch = ref('')
const importSubmissions = ref<AdminSubmissionSummary[]>([])
const importingSubmissionId = ref('')
const openSectionSeq = ref(0)
const dirtySections = ref<Record<number, boolean>>({})
const pendingOptions = ref<Record<number, string>>({})
const moduleBusy = ref(0)
const savingSeq = ref(0)
const editorError = ref('')
const exporting = ref<'' | 'docx' | 'html' | 'txt'>('')
const historyCollapsed = ref(localStorage.getItem('vesta.consult.history.collapsed') === '1')

let importTimer: ReturnType<typeof setTimeout> | undefined
let pollTimer: ReturnType<typeof setTimeout> | undefined
let pollRunId = ''

const selectedRun = computed(() => runs.value.find((run) => run.id === selectedRunId.value) ?? null)

function purposeTemplateLabel(template: PurposeTemplateSummary): string {
  const suffix = template.season ? ` · ${template.season}` : ''
  return `${template.name}${suffix}`
}

function runTitle(run: ConsultRun): string {
  const last = run.purposePath?.items.at(-1)
  if (last) return `${last.stageLabel} · ${last.label}`
  if (run.status === 'failed') return '未完成生成'
  return run.purposePath?.templateName || '咨询稿生成'
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
  return `${done} / ${run.sections.length} 个模块`
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
    purposeTemplates.value = result.purposeTemplates
    activePurposeTemplateId.value = result.activePurposeTemplateId
    purposeTemplateId.value = result.activePurposeTemplateId || result.purposeTemplates[0]?.id || ''
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

async function selectRun(run: ConsultRun) {
  selectedRunId.value = run.id
  openSectionSeq.value = 0
  editorError.value = ''
  try {
    const result = await api.consultRun(run.id)
    if (selectedRunId.value !== run.id) return
    replaceRun(result.run)
    openSectionSeq.value = result.run.sections.find((section) => section.status === 'ready')?.seq ?? 0
  } catch (error) {
    if (selectedRunId.value === run.id) {
      editorError.value = error instanceof Error ? error.message : '读取模块失败'
    }
  }
}

// 再点一次选中的记录就收起详情，避免历史多了以后一直挂着一大块内容。
function toggleRun(run: ConsultRun) {
  if (selectedRunId.value === run.id) {
    collapseRun()
    return
  }
  void selectRun(run)
}

function collapseRun() {
  selectedRunId.value = ''
  openSectionSeq.value = 0
}

function toggleHistory() {
  historyCollapsed.value = !historyCollapsed.value
  localStorage.setItem('vesta.consult.history.collapsed', historyCollapsed.value ? '1' : '0')
}

async function exportRun(format: 'docx' | 'html' | 'txt') {
  const run = selectedRun.value
  if (!run || exporting.value) return
  exporting.value = format
  editorError.value = ''
  try {
    const blob = await api.exportConsultRun(run.id, format)
    const name = (run.context.name || '').trim().replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 24)
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const filename = `咨询稿${name ? `-${name}` : ''}-${date}.${format}`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    flash(`${format === 'docx' ? 'Word' : format.toUpperCase()} 已导出`)
  } catch (error) {
    editorError.value = error instanceof Error ? error.message : '导出失败'
  } finally {
    exporting.value = ''
  }
}

function replaceRun(run: ConsultRun) {
  const index = runs.value.findIndex((item) => item.id === run.id)
  if (index >= 0) runs.value[index] = run
  else runs.value = [run, ...runs.value]
  dirtySections.value = {}
  pendingOptions.value = {}
}

function toggleSection(seq: number) {
  openSectionSeq.value = openSectionSeq.value === seq ? 0 : seq
}

function collapseModules() {
  openSectionSeq.value = 0
}

function markDirty(seq: number) {
  dirtySections.value = { ...dirtySections.value, [seq]: true }
}

function optionIsSelected(section: ConsultRunSection, optionId: string): boolean {
  return (pendingOptions.value[section.seq] ?? section.selectedOptionId) === optionId
}

function selectOption(section: ConsultRunSection, optionId: string) {
  const next = { ...pendingOptions.value }
  if (optionId === section.selectedOptionId) delete next[section.seq]
  else next[section.seq] = optionId
  pendingOptions.value = next
}

function pendingDiffers(section: ConsultRunSection): boolean {
  const pending = pendingOptions.value[section.seq]
  return Boolean(pending && pending !== section.selectedOptionId)
}

async function saveSection(section: ConsultRunSection) {
  const run = selectedRun.value
  if (!run) return
  savingSeq.value = section.seq
  editorError.value = ''
  try {
    const modular = section.options.length > 0 || section.beats.length > 0
    const body = modular
      ? {
          title: section.title,
          goal: section.goal,
          notes: section.notes,
          beats: section.beats
        }
      : {
          title: section.title,
          goal: section.goal,
          notes: section.notes,
          content: section.content
        }
    const result = await api.saveConsultSection(run.id, section.seq, body)
    replaceRun(result.run)
    openSectionSeq.value = section.seq
    flash('本模块已保存')
  } catch (error) {
    editorError.value = error instanceof Error ? error.message : '保存模块失败'
  } finally {
    savingSeq.value = 0
  }
}

async function rewriteByOption(section: ConsultRunSection) {
  const run = selectedRun.value
  const optionId = pendingOptions.value[section.seq]
  if (!run || !optionId) return
  if (
    dirtySections.value[section.seq] &&
    !window.confirm('本模块还有没保存的修改，按新打法重写会覆盖，继续？')
  ) {
    return
  }
  moduleBusy.value = section.seq
  editorError.value = ''
  try {
    const result = await api.rewriteConsultSectionBeats(run.id, section.seq, optionId)
    replaceRun(result.run)
    openSectionSeq.value = section.seq
    flash('已按新打法重写本模块')
  } catch (error) {
    editorError.value = error instanceof Error ? error.message : '重写模块失败'
  } finally {
    moduleBusy.value = 0
  }
}

async function regenerateSection(section: ConsultRunSection) {
  const run = selectedRun.value
  if (!run) return
  if (!window.confirm('重新给三种打法会覆盖这个模块现在的节拍，继续？')) return
  moduleBusy.value = section.seq
  editorError.value = ''
  try {
    const result = await api.regenerateConsultSection(run.id, section.seq)
    replaceRun(result.run)
    openSectionSeq.value = section.seq
    flash('这个模块已重新生成')
  } catch (error) {
    editorError.value = error instanceof Error ? error.message : '重写模块失败'
  } finally {
    moduleBusy.value = 0
  }
}

async function addSection(afterSeq?: number) {
  const run = selectedRun.value
  if (!run) return
  editorError.value = ''
  try {
    const result = await api.addConsultSection(run.id, { afterSeq })
    replaceRun(result.run)
    openSectionSeq.value = (afterSeq ?? result.run.sections.at(-1)?.seq ?? 0) + 1
    flash('已加一个空模块')
  } catch (error) {
    editorError.value = error instanceof Error ? error.message : '新增模块失败'
  }
}

async function deleteSection(section: ConsultRunSection) {
  const run = selectedRun.value
  if (!run) return
  if (!window.confirm(`删除“${section.title}”？这个模块的节拍会一起删掉。`)) return
  editorError.value = ''
  try {
    const result = await api.deleteConsultSection(run.id, section.seq)
    replaceRun(result.run)
    openSectionSeq.value = Math.max(0, section.seq - 1)
    flash('模块已删除')
  } catch (error) {
    editorError.value = error instanceof Error ? error.message : '删除模块失败'
  }
}

function addBeat(section: ConsultRunSection, kind: ConsultBeatKind) {
  const beat: ConsultBeat = {
    id: `local_${Date.now().toString(36)}_${section.beats.length}`,
    kind,
    text: '',
    when: kind === 'branch' ? '如果她说……' : undefined
  }
  section.beats.push(beat)
  markDirty(section.seq)
}

function removeBeat(section: ConsultRunSection, index: number) {
  section.beats.splice(index, 1)
  markDirty(section.seq)
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

async function generate() {
  actionError.value = ''
  if (!purposeTemplateId.value) {
    actionError.value = '咨询树还没有可用模板，请先生成咨询树数据'
    return
  }
  busy.value = true
  try {
    const result = await api.generateConsult({
      context: context(),
      targetLength: targetLength.value,
      mode: 'purpose',
      purposeTemplateId: purposeTemplateId.value
    })
    if (result.run) {
      replaceRun(result.run)
      selectRun(result.run)
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
    const result = await api.setConsultOutcome(run.id, { outcome })
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
  if (Object.values(dirtySections.value).some(Boolean)) {
    flash('有模块还没保存，先保存再复制全文')
    return
  }
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

.full-draft .run-output {
  margin-top: 9px;
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
