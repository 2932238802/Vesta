<template>
  <div class="quiz" @focusin="onFocusIn">
    <header class="top">
      <button v-if="step > 0" class="back-mini" type="button" @click="back">← 上一题</button>
      <span v-else class="save-hint">进度自动保存在本机</span>
      <span class="step">已答 {{ answeredCount }} / 27</span>
    </header>

    <div class="progress">
      <span :style="{ width: `${progressPct}%` }" />
    </div>

    <main v-if="loading" class="state">
      <p class="quiet">正在打开</p>
    </main>

    <main v-else-if="error && !survey" class="state">
      <p class="eyebrow">无法打开</p>
      <h1 class="serif">{{ error }}</h1>
      <RouterLink class="btn ghost" to="/">回到首页</RouterLink>
    </main>

    <template v-else-if="survey && current && resolved">
      <main v-if="restored" class="restore">
        <p>已恢复上次的填写进度，从这一题继续。</p>
        <div class="restore-actions">
          <button class="btn quiet small" type="button" @click="restored = false">继续填写</button>
          <button class="btn ghost small" type="button" @click="restart">重新填写</button>
        </div>
      </main>

      <main class="sheet">
        <div :key="current.id" class="group fade-in">
          <p class="eyebrow">第 {{ step + 1 }} 题 · {{ current.code }}</p>
          <h1 class="serif">{{ resolved.title }}</h1>
          <p v-if="resolved.hint" class="sub">{{ resolved.hint }}</p>

          <div class="questions" :id="`q-${current.id}`">
            <p v-if="resolved.disabled" class="disabled-note">还没考过，跳过这一题</p>
            <QuestionField
              v-model="answers[current.id]"
              :question="currentQuestion"
              :index="step + 1"
              :invalid="invalid.includes(current.id)"
              :disabled="resolved.disabled"
              @touch="touch"
            />
          </div>
        </div>
      </main>

      <footer class="foot">
        <div class="foot-inner">
          <button v-if="step > 0" class="btn ghost back" type="button" @click="back">上一题</button>
          <span v-else class="save-hint">草稿自动保存在本机</span>
          <div class="spacer" />
          <button
            v-if="!isSingle || resolved.disabled"
            class="btn next"
            type="button"
            :disabled="submitting"
            @click="next"
          >
            {{ submitting ? '正在生成报告' : isLast ? '提交并生成报告' : '下一题' }}
          </button>
        </div>
        <p v-if="showMissingHint" class="missing-hint">这一题还没完成</p>
        <p v-if="error" class="error" aria-live="polite">{{ error }}</p>
      </footer>
    </template>

    <div v-if="submitting" class="veil">
      <div class="veil-inner">
        <span class="pulse" />
        <p>正在把你的回答整理成报告</p>
        <p class="quiet">大约需要几秒，请不要关闭页面</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { Answers, InvitePayload, Question, Survey } from '@/api'
import { ApiError, api, track } from '@/api'
import { isEmptyValue } from '@shared/validate'
import { resolveQuestion, visibleQuestions } from '@shared/doc'
import QuestionField from '@/components/QuestionField.vue'

const route = useRoute()
const router = useRouter()
const token = String(route.params.token ?? '')

const loading = ref(true)
const survey = ref<Survey | null>(null)
const invite = ref<InvitePayload | null>(null)
const step = ref(0)
const answers = ref<Answers>({})
const timing = ref<Record<string, number>>({})
const invalid = ref<string[]>([])
const error = ref('')
const submitting = ref(false)
const restored = ref(false)
const showMissingHint = ref(false)

const draftKey = `vesta:draft:${token}`
let saveTimer: ReturnType<typeof setTimeout> | undefined
let autoTimer: ReturnType<typeof setTimeout> | undefined
let autoAdvancedStep = -1
let activeId: string | null = null
let activeSince = 0
let submitted = false
let exitTracked = false

const visible = computed<Question[]>(() =>
  survey.value ? visibleQuestions(survey.value, answers.value) : []
)
const current = computed(() => visible.value[step.value] ?? null)
const resolved = computed(() =>
  survey.value && current.value ? resolveQuestion(survey.value, answers.value, current.value) : null
)
const currentQuestion = computed<Question | null>(() => {
  if (!current.value || !resolved.value) return null
  return {
    ...current.value,
    title: resolved.value.title,
    hint: resolved.value.hint,
    options: resolved.value.options
  }
})
const isSingle = computed(() => current.value?.type === 'single')
const isLast = computed(() => step.value >= visible.value.length - 1)

const answeredCount = computed(() => {
  if (!survey.value) return 0
  return visible.value.filter((question) => {
    const r = resolveQuestion(survey.value!, answers.value, question)
    return !r.disabled && !isEmptyValue(answers.value[question.id])
  }).length
})
const progressPct = computed(() => Math.min(100, Math.round((answeredCount.value / 27) * 100)))

function touch(id: string) {
  const now = Date.now()
  if (activeSince) timing.value[id] = (timing.value[id] ?? 0) + (now - activeSince)
  activeId = id
  activeSince = now
  scheduleSave()
}

function onFocusIn(event: FocusEvent) {
  const target = event.target as HTMLElement | null
  if (!target || !target.matches('input, textarea, select')) return
  window.setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 280)
}

function flushTiming() {
  if (activeSince) {
    const now = Date.now()
    timing.value[activeId ?? ''] = (timing.value[activeId ?? ''] ?? 0) + (now - activeSince)
    activeSince = 0
    activeId = null
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveDraft, 400)
}

function saveDraft() {
  if (!survey.value) return
  try {
    localStorage.setItem(
      draftKey,
      JSON.stringify({ surveyId: survey.value.id, answers: answers.value, step: step.value, timing: timing.value })
    )
  } catch {
    // 存储不可用时不影响填写
  }
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(draftKey)
    if (!raw) return
    const draft = JSON.parse(raw) as {
      surveyId?: string
      answers?: Answers
      step?: number
      timing?: Record<string, number>
    }
    if (draft.surveyId !== survey.value?.id) return
    if (draft.answers) answers.value = draft.answers
    if (draft.timing) timing.value = draft.timing
    if (typeof draft.step === 'number') {
      step.value = Math.min(Math.max(draft.step, 0), Math.max(0, visible.value.length - 1))
    }
    restored.value = visible.value.some((question) => !isEmptyValue(answers.value[question.id]))
  } catch {
    // 草稿损坏时丢弃
  }
}

function restart() {
  if (!window.confirm('重新填写会清空本机保存的答案，确定吗？')) return
  if (saveTimer) clearTimeout(saveTimer)
  activeId = null
  activeSince = 0
  autoAdvancedStep = -1
  answers.value = {}
  timing.value = {}
  step.value = 0
  invalid.value = []
  error.value = ''
  showMissingHint.value = false
  restored.value = false
  try {
    localStorage.removeItem(draftKey)
  } catch {
    // 存储不可用时忽略
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function canAdvance(): boolean {
  if (!current.value || !resolved.value) return true
  if (resolved.value.disabled || !current.value.required) return true
  return !isEmptyValue(answers.value[current.value.id])
}

function advance() {
  if (!survey.value || submitting.value) return
  error.value = ''
  flushTiming()
  if (isLast.value) {
    void submit()
    return
  }
  step.value += 1
  saveDraft()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function next() {
  if (submitting.value) return
  if (!canAdvance()) {
    if (current.value) {
      invalid.value = [current.value.id]
      showMissingHint.value = true
    }
    return
  }
  invalid.value = []
  showMissingHint.value = false
  advance()
}

function back() {
  if (submitting.value) return
  flushTiming()
  invalid.value = []
  error.value = ''
  showMissingHint.value = false
  step.value = Math.max(0, step.value - 1)
  saveDraft()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function jumpToQuestion(id: string) {
  const index = visible.value.findIndex((question) => question.id === id)
  if (index >= 0) step.value = index
}

async function submit() {
  if (!survey.value) return
  submitting.value = true
  error.value = ''
  try {
    const result = await api.submit(token, answers.value, timing.value)
    submitted = true
    localStorage.removeItem(draftKey)
    track(token, 'submit')
    await router.replace(`/r/${result.slug}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      try {
        const payload = await api.getInvite(token)
        if (payload.reportSlug) {
          await router.replace(`/r/${payload.reportSlug}`)
          return
        }
      } catch {
        // 忽略，回落到普通提示
      }
    }
    if (err instanceof ApiError && err.status === 400) {
      const missingIds = Array.isArray(err.details?.missing)
        ? err.details.missing.filter((id): id is string => typeof id === 'string')
        : []
      if (missingIds.length) {
        jumpToQuestion(missingIds[0])
        invalid.value = missingIds
        showMissingHint.value = true
        error.value = `还有 ${missingIds.length} 道必答题没完成`
        submitting.value = false
        return
      }
    }
    error.value = err instanceof Error ? err.message : '提交失败，请再试一次'
    submitting.value = false
  }
}

// 单选题选中后自动进入下一题；多选题、填空题、数字题用「下一步」确认。
watch(
  answers,
  () => {
    if (!current.value || current.value.type !== 'single') return
    if (resolved.value?.disabled) return
    if (isEmptyValue(answers.value[current.value.id])) return
    if (autoAdvancedStep === step.value) return
    autoAdvancedStep = step.value
    if (autoTimer) clearTimeout(autoTimer)
    autoTimer = setTimeout(() => {
      if (autoAdvancedStep !== step.value) return
      advance()
    }, 250)
  },
  { deep: true }
)

onMounted(async () => {
  try {
    const payload = await api.getInvite(token)
    invite.value = payload
    if (payload.submitted && payload.reportSlug) {
      await router.replace(`/r/${payload.reportSlug}`)
      return
    }
    survey.value = payload.survey
    restoreDraft()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '链接无法打开'
  } finally {
    loading.value = false
  }
})

watch(answers, () => {
  if (!invalid.value.length && !showMissingHint.value) return
  const stillMissing = invalid.value.filter((id) => {
    const question = survey.value?.questions.find((item) => item.id === id)
    if (!question || !survey.value) return false
    const r = resolveQuestion(survey.value, answers.value, question)
    if (!r.visible || r.disabled) return false
    return isEmptyValue(answers.value[id])
  })
  invalid.value = stillMissing
  if (stillMissing.length === 0) showMissingHint.value = false
}, { deep: true })

watch([answers, step, timing], scheduleSave, { deep: true })

function trackExit() {
  if (submitted || exitTracked || !survey.value) return
  const answered = visible.value.filter((question) => !isEmptyValue(answers.value[question.id])).length
  if (answered === 0 && step.value === 0) return
  const questionId = current.value?.id ?? visible.value[0]?.id
  if (!questionId) return
  exitTracked = true
  track(token, 'quiz_exit', { questionId, step: step.value, answered, total: 27 })
}

function onLeave() {
  trackExit()
  flushTiming()
  saveDraft()
}

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
  if (autoTimer) clearTimeout(autoTimer)
  onLeave()
  window.removeEventListener('beforeunload', onLeave)
})

window.addEventListener('beforeunload', onLeave)
</script>

<style scoped>
.quiz {
  min-height: 100vh;
  max-width: 640px;
  margin: 0 auto;
  padding: 20px 24px 160px;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 16px;
}

.back-mini {
  border: 0;
  background: none;
  padding: 4px 0;
  font-size: 13px;
  color: var(--ink-2);
  cursor: pointer;
}

.step {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink-2);
  letter-spacing: 0.04em;
}

.progress {
  position: sticky;
  top: 0;
  z-index: 5;
  height: 3px;
  background: var(--line);
  border-radius: 2px;
}

.progress span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.35s ease;
}

.sheet {
  padding-top: 40px;
}

.restore {
  margin: 20px 0 0;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
}

.restore p {
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-2);
}

.restore-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.group .eyebrow {
  margin-bottom: 14px;
}

h1 {
  font-size: clamp(24px, 6vw, 32px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.01em;
}

.sub {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--ink-3);
  max-width: 32em;
}

.questions {
  margin-top: 30px;
}

.disabled-note {
  margin: 22px 0 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px dashed var(--line);
  font-size: 13px;
  color: var(--ink-3);
}

.foot {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--line);
  padding: 14px 24px calc(14px + env(safe-area-inset-bottom));
}

.foot-inner {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.next {
  min-width: 168px;
}

.back {
  height: 46px;
  padding: 0 18px;
}

.spacer {
  flex: 1;
}

.save-hint {
  font-size: 11.5px;
  color: var(--ink-3);
}

.missing-hint {
  max-width: 640px;
  margin: 10px auto 0;
  font-size: 12px;
  color: var(--danger);
  text-align: center;
}

.error {
  max-width: 640px;
  margin: 10px auto 0;
  font-size: 12px;
  color: var(--danger);
  text-align: center;
}

.state {
  margin: auto;
  padding: 120px 0;
}

.veil {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: var(--paper);
  display: flex;
  align-items: center;
  justify-content: center;
}

.veil-inner {
  text-align: center;
  padding: 0 24px;
}

.veil-inner p {
  font-size: 14px;
  color: var(--ink);
  margin-top: 18px;
}

.veil-inner p.quiet {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 8px;
}

.pulse {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1.4s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(47, 108, 158, 0.25);
  }
  70% {
    box-shadow: 0 0 0 18px rgba(47, 108, 158, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(47, 108, 158, 0);
  }
}

@media (max-width: 560px) {
  .quiz {
    padding: 16px 18px 150px;
  }

  .sheet {
    padding-top: 30px;
  }

  .foot {
    padding-left: 16px;
    padding-right: 16px;
  }

  .next {
    min-width: 0;
    flex: 1;
  }
}
</style>
