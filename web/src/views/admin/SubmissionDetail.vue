<template>
  <div class="detail-page">
    <RouterLink class="back" to="/admin/submissions">← 返回答卷列表</RouterLink>

    <div v-if="loading" class="card empty">正在读取答卷</div>
    <div v-else-if="error" class="card empty">{{ error }}</div>

    <template v-else-if="detail">
      <header class="head">
        <div>
          <p class="eyebrow">答卷 · {{ formatDate(detail.createdAt) }}</p>
          <h1>{{ detail.name || '未命名' }}</h1>
          <p class="head-sub">
            <span v-if="detail.note">{{ detail.note }}</span>
            <span v-if="detail.channel" class="sep">·</span>
            <span v-if="detail.channel">{{ detail.channel }}</span>
          </p>
        </div>
        <div class="head-actions">
          <a class="btn ghost small" :href="detail.reportPath" target="_blank" rel="noopener">
            打开报告
          </a>
          <button class="btn small" type="button" :disabled="saving || !dirty" @click="save">
            {{ saving ? '保存中' : '保存修改' }}
          </button>
        </div>
      </header>

      <div class="grid">
        <section class="card panel score-panel">
          <header class="panel-head">
            <h2>分数</h2>
            <span class="chip accent">{{ detail.tier }} 档</span>
          </header>
          <div class="total">
            <span class="total-value">{{ detail.total }}</span>
            <span class="total-label">总分 / 100</span>
          </div>
          <div class="bars">
            <ScoreBar
              v-for="dim in detail.scores.dimensions"
              :key="dim.key"
              :name="dim.name"
              :score="dim.score"
            />
          </div>
        </section>

        <div class="side">
          <section class="card panel">
            <header class="panel-head">
              <h2>联系方式</h2>
              <span v-if="!detail.claimed" class="quiet tiny">未领取</span>
            </header>
            <template v-if="detail.claimed">
              <div class="contact-row">
                <span class="contact-label">微信</span>
                <span class="contact-value mono">{{ detail.wechat || '—' }}</span>
                <button v-if="detail.wechat" class="btn quiet" type="button" @click="copyWechat">
                  复制
                </button>
              </div>
              <div class="contact-row">
                <span class="contact-label">时间</span>
                <span class="contact-value">{{ detail.slots.join(' / ') || '—' }}</span>
              </div>
            </template>
          </section>

          <section class="card panel">
            <header class="panel-head">
              <h2>跟进</h2>
            </header>
            <label class="field">
              <span>联系状态</span>
              <select v-model="form.contactStatus" class="select">
                <option value="new">待联系</option>
                <option value="contacted">已联系</option>
                <option value="scheduled">已约时间</option>
                <option value="done">已完成</option>
              </select>
            </label>
            <label class="field follow-note">
              <span>内部备注</span>
              <textarea v-model="form.adminNotes" class="textarea" rows="3" maxlength="2000" />
            </label>
          </section>

          <section class="card panel">
            <header class="panel-head">
              <h2>AI 报告</h2>
              <span class="chip" :class="aiChipClass">{{ aiLabel }}</span>
            </header>
            <p v-if="detail.aiError" class="ai-error">{{ detail.aiError }}</p>
            <p class="quiet tiny ai-note">
              已尝试 {{ detail.aiAttempts }} 次<span v-if="aiModel"> · {{ aiModel }}</span>
            </p>
            <button
              class="btn ghost small wide"
              type="button"
              :disabled="regenerating || detail.aiStatus === 'running'"
              @click="regenerate"
            >
              {{ regenerating || detail.aiStatus === 'running' ? '生成中' : '重新生成' }}
            </button>
          </section>
        </div>
      </div>

      <section class="card panel">
        <header class="panel-head">
          <h2>报告覆盖</h2>
        </header>
        <div class="override-grid">
          <label class="field">
            <span>诊断结论</span>
            <textarea v-model="form.diagnosis" class="textarea" rows="4" maxlength="1500" />
          </label>
          <label class="field">
            <span>写在最后</span>
            <textarea v-model="form.closing" class="textarea" rows="4" maxlength="1500" />
          </label>
        </div>
      </section>

      <section class="card panel">
        <header class="panel-head">
          <h2>完整回答</h2>
          <span class="quiet tiny">{{ detail.answers.length }} 道题</span>
        </header>
        <div class="answer-groups">
          <div v-for="group in detail.groups" :key="group.id" class="answer-group">
            <p class="group-title">{{ group.code }} · {{ group.title }}</p>
            <div class="answer-list">
              <div
                v-for="answer in answersOf(group.id)"
                :key="answer.id"
                class="answer-row"
              >
                <span class="answer-code">{{ answer.code }}</span>
                <span class="answer-title">{{ answer.title }}</span>
                <span class="answer-value" :class="{ empty: !answer.value }">
                  {{ answer.value || '未填' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Transition name="toast">
        <div v-if="toast" class="toast">{{ toast }}</div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api, type AdminSubmissionDetail } from '@/api'
import { formatDate } from '@/format'
import ScoreBar from '@/components/ScoreBar.vue'

const route = useRoute()
const id = String(route.params.id ?? '')
const detail = ref<AdminSubmissionDetail | null>(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const regenerating = ref(false)
const toast = ref('')

const aiLabels: Record<string, string> = {
  pending: '排队中',
  running: '生成中',
  ready: '已生成',
  failed: '模板兜底'
}

const aiLabel = computed(() => aiLabels[detail.value?.aiStatus ?? ''] ?? '未知')
const aiChipClass = computed(() => {
  const status = detail.value?.aiStatus
  if (status === 'ready') return 'accent'
  if (status === 'failed') return 'danger'
  return 'warn'
})
const aiModel = computed(() => {
  const model = detail.value?.aiMeta?.model
  return typeof model === 'string' ? model : ''
})

const form = reactive({
  contactStatus: 'new',
  adminNotes: '',
  diagnosis: '',
  closing: ''
})

const initial = reactive({
  contactStatus: 'new',
  adminNotes: '',
  diagnosis: '',
  closing: ''
})

const dirty = computed(
  () =>
    form.contactStatus !== initial.contactStatus ||
    form.adminNotes !== initial.adminNotes ||
    form.diagnosis !== initial.diagnosis ||
    form.closing !== initial.closing
)

function answersOf(groupId: string) {
  if (!detail.value) return []
  const group = detail.value.groups.find((g) => g.id === groupId)
  if (!group) return []
  return detail.value.answers.filter((answer) => answer.group === group.title)
}

onMounted(async () => {
  try {
    const result = await api.submission(id)
    detail.value = result
    form.contactStatus = result.contactStatus
    form.adminNotes = result.adminNotes
    form.diagnosis = result.overrides.diagnosis ?? ''
    form.closing = result.overrides.closing ?? ''
    Object.assign(initial, { ...form })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取失败'
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  try {
    await api.patchSubmission(id, {
      contactStatus: form.contactStatus,
      adminNotes: form.adminNotes,
      overrides: { diagnosis: form.diagnosis, closing: form.closing }
    })
    Object.assign(initial, { ...form })
    if (detail.value) {
      detail.value.contactStatus = form.contactStatus
      detail.value.adminNotes = form.adminNotes
      detail.value.overrides = { diagnosis: form.diagnosis, closing: form.closing }
    }
    flash('已保存')
  } catch (err) {
    flash(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function regenerate() {
  if (!detail.value) return
  regenerating.value = true
  try {
    await api.regenerateReport(id)
    detail.value.aiStatus = 'running'
    detail.value.aiError = ''
    flash('已提交，稍后刷新查看')
  } catch (err) {
    flash(err instanceof Error ? err.message : '提交失败')
  } finally {
    regenerating.value = false
  }
}

async function copyWechat() {
  if (!detail.value?.wechat) return
  try {
    await navigator.clipboard.writeText(detail.value.wechat)
    flash('已复制微信号')
  } catch {
    flash('复制失败，请手动选择')
  }
}

function flash(message: string) {
  toast.value = message
  setTimeout(() => {
    toast.value = ''
  }, 1800)
}
</script>

<style scoped>
.detail-page {
  display: grid;
  gap: 14px;
}

.back {
  font-size: 12.5px;
  color: var(--ink-3);
  width: fit-content;
}

.back:hover {
  color: var(--ink);
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin: 6px 0 8px;
}

.head h1 {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 600;
}

.head-sub {
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--ink-3);
  display: flex;
  gap: 6px;
}

.sep {
  color: var(--line-strong);
}

.head-actions {
  display: flex;
  gap: 8px;
}

.grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 14px;
}

.side {
  display: grid;
  gap: 14px;
  align-content: start;
}

.panel {
  padding: 22px 24px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-head h2 {
  font-size: 15px;
  font-weight: 500;
}

.total {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 22px;
}

.total-value {
  font-size: 42px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
}

.total-label {
  font-size: 11.5px;
  color: var(--ink-3);
}

.bars {
  display: grid;
  gap: 13px;
}

.contact-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--line);
  font-size: 13px;
}

.contact-row:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.contact-label {
  width: 42px;
  font-size: 11.5px;
  color: var(--ink-3);
  flex: 0 0 auto;
}

.contact-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mono {
  font-family: var(--mono);
  font-size: 12.5px;
}

.follow-note {
  margin-top: 14px;
}

.ai-error {
  margin-bottom: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  background: #fbf0ed;
  color: var(--danger);
  font-size: 12px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.ai-note {
  margin-bottom: 14px;
}

.override-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.answer-groups {
  display: grid;
  gap: 24px;
}

.group-title {
  font-size: 11.5px;
  letter-spacing: 0.06em;
  color: var(--ink-3);
  margin-bottom: 8px;
}

.answer-list {
  display: grid;
}

.answer-row {
  display: grid;
  grid-template-columns: 38px 1.1fr 1fr;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
  font-size: 12.5px;
  align-items: baseline;
}

.answer-code {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--ink-3);
}

.answer-title {
  color: var(--ink-2);
}

.answer-value {
  color: var(--ink);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.answer-value.empty {
  color: var(--ink-3);
}

@media (max-width: 1000px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .override-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .panel {
    padding: 18px;
  }

  .answer-row {
    grid-template-columns: 34px 1fr;
  }

  .answer-value {
    grid-column: 2;
  }
}
</style>
