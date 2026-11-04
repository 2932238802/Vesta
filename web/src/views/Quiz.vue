<template>
  <div class="quiz" @focusin="onFocusIn">
    <header class="top">
      <span v-if="step > 0" class="save-hint">进度自动保存在本机</span>
      <span v-else />
      <span class="step">
        {{ pad(step + 1) }} <span>/ {{ pad(totalSteps) }}</span>
      </span>
    </header>

    <div class="progress">
      <span :style="{ width: `${progress}%` }" />
    </div>

    <main v-if="loading" class="state">
      <p class="quiet">正在打开问卷</p>
    </main>

    <main v-else-if="error && !survey" class="state">
      <p class="eyebrow">无法打开</p>
      <h1 class="serif">{{ error }}</h1>
      <RouterLink class="btn ghost" to="/">回到首页</RouterLink>
    </main>

    <template v-else-if="survey && group">
      <main class="sheet">
        <div v-if="restored" class="restore">
          <p>
            已恢复上次的填写进度：第 {{ step + 1 }} 组，必答已填
            {{ answeredRequired }} / {{ requiredTotal }} 题。
          </p>
          <div class="restore-actions">
            <button class="btn quiet small" type="button" @click="restored = false">
              继续填写
            </button>
            <button class="btn ghost small" type="button" @click="restart">
              重新填写
            </button>
          </div>
        </div>

        <div :key="group.id" class="group fade-in">
          <p class="eyebrow">第 {{ step + 1 }} 组 · {{ group.code }}</p>
          <h1 class="serif">{{ group.title }}</h1>
          <p v-if="group.subtitle" class="sub">{{ group.subtitle }}</p>

          <div class="questions">
            <div v-for="(question, i) in groupQuestions" :id="`q-${question.id}`" :key="question.id">
              <QuestionField
                v-model="answers[question.id]"
                :question="question"
                :index="globalIndex(question.id)"
                :invalid="invalid.includes(question.id)"
                @touch="touch"
              />
            </div>
          </div>
        </div>
      </main>

      <footer class="foot">
        <p
          v-if="showMissingHint && missingInCurrent.length"
          class="missing-hint"
          aria-live="polite"
        >
          本组还有 {{ missingInCurrent.length }} 道必答题没完成
        </p>
        <div class="foot-inner">
          <button v-if="step > 0" class="btn ghost back" type="button" @click="back">
            上一组
          </button>
          <span v-else class="save-hint">草稿自动保存在本机</span>
          <div class="spacer" />
          <button class="btn next" type="button" :disabled="submitting" @click="next">
            {{ submitting ? '正在生成报告' : lastStep ? '提交并生成报告' : '下一组' }}
          </button>
        </div>
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
import { isEmptyValue, validateAnswers } from '@shared/validate'
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
let activeId: string | null = null
let activeSince = 0
let submitted = false
let exitTracked = false

const totalSteps = computed(() => survey.value?.groups.length ?? 1)
const group = computed(() => survey.value?.groups[step.value] ?? null)
const groupQuestions = computed<Question[]>(() => {
  if (!survey.value || !group.value) return []
  return survey.value.questions.filter((q) => q.groupId === group.value!.id)
})
const lastStep = computed(() => step.value >= totalSteps.value - 1)
const requiredQuestions = computed(
  () => survey.value?.questions.filter((question) => question.required) ?? []
)
const requiredTotal = computed(() => requiredQuestions.value.length)
const validation = computed(() =>
  survey.value
    ? validateAnswers(survey.value, answers.value)
    : { missing: [] as string[], errors: [] as string[], ok: true }
)
const missingIds = computed(() => new Set(validation.value.missing))
const answeredRequired = computed(
  () => requiredTotal.value - validation.value.missing.length
)
const progress = computed(() =>
  requiredTotal.value
    ? Math.round((answeredRequired.value / requiredTotal.value) * 100)
    : 0
)

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function globalIndex(id: string): number {
  return (survey.value?.questions.findIndex((q) => q.id === id) ?? 0) + 1
}

function touch(id: string) {
  const now = Date.now()
  if (activeSince) {
    timing.value[id] = (timing.value[id] ?? 0) + (now - activeSince)
  }
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

function trackExit() {
  if (submitted || exitTracked || !survey.value) return
  const answeredCount = survey.value.questions.filter(
    (question) => !isEmptyValue(answers.value[question.id])
  ).length
  if (answeredCount === 0 && step.value === 0) return
  const active = groupQuestions.value.find((question) => question.id === activeId)
  const questionId = active?.id ?? groupQuestions.value[0]?.id
  if (!questionId) return
  exitTracked = true
  track(token, 'quiz_exit', {
    questionId,
    step: step.value,
    answered: answeredCount,
    total: survey.value.questions.length
  })
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
  const draft = {
    surveyId: survey.value.id,
    answers: answers.value,
    step: step.value,
    timing: timing.value
  }
  try {
    localStorage.setItem(draftKey, JSON.stringify(draft))
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
    const filled = draft.answers
      ? (survey.value?.questions.filter(
          (question) => !isEmptyValue(draft.answers?.[question.id])
        ).length ?? 0)
      : 0
    if (draft.answers) answers.value = draft.answers
    if (draft.timing) timing.value = draft.timing
    if (typeof draft.step === 'number') {
      step.value = Math.min(Math.max(draft.step, 0), totalSteps.value - 1)
    }
    restored.value = filled > 0
  } catch {
    // 草稿损坏时丢弃
  }
}

function restart() {
  if (!window.confirm('重新填写会清空本机保存的答案，确定吗？')) return
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = undefined
  }
  activeId = null
  activeSince = 0
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

function missingInCurrent(): string[] {
  const ids = new Set(groupQuestions.value.map((question) => question.id))
  return validation.value.missing.filter((id) => ids.has(id))
}

function missingAll(): string[] {
  return validation.value.missing
}

async function focusFirst(id: string) {
  await nextTick()
  const container = document.getElementById(`q-${id}`)
  container?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const control = container?.querySelector<HTMLElement>('button, input, textarea, select')
  control?.focus({ preventScroll: true })
}

async function next() {
  if (!survey.value || submitting.value) return
  error.value = ''
  flushTiming()

  const missing = missingInCurrent()
  if (missing.length) {
    invalid.value = missing
    showMissingHint.value = true
    await focusFirst(missing[0])
    return
  }

  invalid.value = []
  showMissingHint.value = false
  if (group.value) {
    track(token, 'group_complete', { groupId: group.value.id })
  }

  if (lastStep.value) {
    await submit()
    return
  }

  step.value += 1
  saveDraft()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function back() {
  flushTiming()
  invalid.value = []
  error.value = ''
  showMissingHint.value = false
  step.value = Math.max(0, step.value - 1)
  saveDraft()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function jumpToQuestion(id: string) {
  if (!survey.value) return
  const target = survey.value.questions.find((question) => question.id === id)
  if (!target) return
  const index = survey.value.groups.findIndex((groupItem) => groupItem.id === target.groupId)
  if (index >= 0) step.value = index
}

async function submit() {
  if (!survey.value) return
  const missing = missingAll()
  if (missing.length) {
    const target = survey.value.questions.find((q) => q.id === missing[0])
    jumpToQuestion(missing[0])
    invalid.value = missing
    showMissingHint.value = true
    error.value = `还有 ${missing.length} 道必答题没完成${target ? `，先看 ${target.code}` : ''}`
    await focusFirst(missing[0])
    return
  }

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
        const target = survey.value.questions.find((q) => q.id === missingIds[0])
        jumpToQuestion(missingIds[0])
        invalid.value = missingIds
        showMissingHint.value = true
        error.value = `还有 ${missingIds.length} 道必答题没完成${
          target ? `，先看 ${target.code}` : ''
        }`
        submitting.value = false
        await focusFirst(missingIds[0])
        return
      }
    }

    error.value = err instanceof Error ? err.message : '提交失败，请再试一次'
    submitting.value = false
  }
}

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
  const missing = new Set(validation.value.missing)
  invalid.value = invalid.value.filter((id) => missing.has(id))
  if (missing.size === 0) {
    showMissingHint.value = false
    if (error.value.startsWith('还有')) error.value = ''
  } else if (error.value.startsWith('还有')) {
    error.value = ''
  }
}, { deep: true })

watch([answers, step, timing], scheduleSave, { deep: true })

function onLeave() {
  trackExit()
  flushTiming()
  saveDraft()
}

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
  onLeave()
  window.removeEventListener('beforeunload', onLeave)
})

window.addEventListener('beforeunload', onLeave)
</script>

<style scoped>
.quiz {
  min-height: 100vh;
  max-width: 700px;
  margin: 0 auto;
  padding: 24px 24px 150px;
}

.top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 18px;
}

.step {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink-2);
  letter-spacing: 0.04em;
}

.step span {
  color: var(--ink-3);
}

.progress {
  position: sticky;
  top: 0;
  z-index: 5;
  height: 2px;
  background: var(--line);
}

.progress span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.sheet {
  padding-top: 44px;
}

.restore {
  margin-bottom: 28px;
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
  font-size: clamp(28px, 6vw, 38px);
  font-weight: 500;
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
  margin-top: 36px;
}

.foot {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: var(--paper);
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--line);
  padding: 14px 24px calc(14px + env(safe-area-inset-bottom));
}

.foot-inner {
  max-width: 652px;
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

.save-hint {
  font-size: 11.5px;
  color: var(--ink-3);
}

.missing-hint {
  max-width: 652px;
  margin: 0 auto 10px;
  font-size: 12px;
  color: var(--ink-2);
  text-align: center;
}

.error {
  max-width: 652px;
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
  box-shadow: 0 0 0 0 var(--accent-soft);
  animation: pulse 1.4s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(47, 93, 70, 0.22);
  }
  70% {
    box-shadow: 0 0 0 18px rgba(47, 93, 70, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(47, 93, 70, 0);
  }
}

@media (max-width: 560px) {
  .quiz {
    padding: 20px 20px 140px;
  }

  .sheet {
    padding-top: 34px;
  }

  .foot {
    padding-left: 16px;
    padding-right: 16px;
  }

  .next {
    min-width: 0;
    flex: 1;
  }

  .save-hint {
    display: none;
  }
}
</style>
