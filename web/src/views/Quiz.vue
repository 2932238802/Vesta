<template>
  <div
    ref="rootEl"
    class="quiz"
    :class="{ 'kb-focus': kbFocus, 'kb-raised': kbRaised, 'kb-hide-foot': kbHideFoot }"
    :style="{ '--kb-offset': `${kbOffset}px` }"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <p id="quiz-status" class="sr-only" aria-live="polite">{{ statusText }}</p>

    <main v-if="loading" class="state">
      <p class="quiet">正在打开</p>
    </main>

    <main v-else-if="error && !survey" class="state">
      <p class="eyebrow">无法打开</p>
      <h1>{{ error }}</h1>
      <RouterLink class="btn ghost" to="/">回到首页</RouterLink>
    </main>

    <template v-else-if="survey && current && resolved">
      <main v-if="restored" class="restore">
        <template v-if="!confirmRestart">
          <p>已恢复上次的填写进度，从这一题继续。</p>
          <div class="restore-actions">
            <button class="btn quiet small" type="button" @click="restored = false">继续填写</button>
            <button class="btn ghost small" type="button" @click="confirmRestart = true">重新填写</button>
          </div>
        </template>
        <template v-else>
          <p>会清空本机保存的答案，确定吗？</p>
          <div class="restore-actions">
            <button class="btn ghost small" type="button" @click="confirmRestart = false">取消</button>
            <button class="btn danger small" type="button" @click="restart">清空答案</button>
          </div>
        </template>
      </main>

      <main class="sheet">
        <div :key="current.id" class="group fade-in">
          <h1 v-if="groupTitle" class="group-title">{{ groupTitle }}</h1>
          <h2 id="question-stem" ref="stemEl" class="stem" tabindex="-1">{{ resolved.title }}</h2>
          <p v-if="resolved.hint" class="sub">{{ resolved.hint }}</p>

          <div class="questions" :id="`q-${current.id}`">
            <p v-if="resolved.disabled" class="disabled-note">还没考过，跳过这一题</p>
            <QuestionField
              v-model="answers[current.id]"
              :question="currentQuestion"
              labelledby="question-stem"
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
          <button class="btn next" type="button" :disabled="submitting" @click="next">
            {{ submitting ? '正在提交' : isLast ? '提交并生成报告' : '下一题' }}
          </button>
        </div>
        <p v-if="showMissingHint" class="missing-hint">这一题还没完成</p>
        <p v-if="error" class="error" aria-live="polite">{{ error }}</p>
      </footer>
    </template>

    <div v-if="submitting" class="veil" aria-busy="true">
      <div class="veil-inner">
        <span class="pulse" />
        <p>正在提交你的答案</p>
        <p class="quiet">提交后会跳到报告页，报告生成需要一会儿</p>
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
const confirmRestart = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const stemEl = ref<HTMLElement | null>(null)
const statusText = ref('')
const keyboardMode = ref(false)
const kbFocus = ref(false)
const kbRaised = ref(false)
const kbHideFoot = ref(false)
const kbOffset = ref(0)

const draftKey = `vesta:draft:${token}`
let saveTimer: ReturnType<typeof setTimeout> | undefined
let autoTimer: ReturnType<typeof setTimeout> | undefined
let focusOutTimer: ReturnType<typeof setTimeout> | undefined
let kbDebounce: ReturnType<typeof setTimeout> | undefined
let lastViewportHeight = 0
let suppressAnnounce = false
let autoAdvancedStep = -1
let activeId: string | null = null
let activeSince = 0
let submitted = false
let exitTracked = false
let restoring = false

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
const isLast = computed(() => step.value >= visible.value.length - 1)

const groupTitle = computed(() => {
  if (!survey.value || !current.value) return ''
  const group = survey.value.groups.find((item) => item.id === current.value?.groupId)
  return group?.title ?? ''
})

function announce(message: string) {
  statusText.value = ''
  void nextTick(() => {
    statusText.value = message
  })
}

function clearAuto() {
  if (autoTimer) clearTimeout(autoTimer)
  autoTimer = undefined
}

async function focusQuestion() {
  await nextTick()
  const container = document.getElementById(`q-${current.value?.id ?? ''}`)
  container?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const control = container?.querySelector<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
  )
  control?.focus({ preventScroll: true })
}

function coarsePointer() {
  return window.matchMedia('(pointer: coarse)').matches
}

function resetKeyboard() {
  kbFocus.value = false
  kbRaised.value = false
  kbHideFoot.value = false
  kbOffset.value = 0
}

function onFocusIn(event: FocusEvent) {
  const target = event.target as HTMLElement | null
  if (!target || !target.matches('input, textarea, select')) return
  if (focusOutTimer) clearTimeout(focusOutTimer)
  if (!coarsePointer()) return
  kbFocus.value = true
  window.setTimeout(() => {
    if (!target.isConnected) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 120)
}

function onFocusOut(event: FocusEvent) {
  const target = event.target as HTMLElement | null
  if (!target || !target.matches('input, textarea, select')) return
  if (!coarsePointer()) return
  if (focusOutTimer) clearTimeout(focusOutTimer)
  focusOutTimer = setTimeout(resetKeyboard, 150)
}

function applyViewport() {
  const vv = window.visualViewport
  if (!vv || !coarsePointer()) return
  const height = vv.height
  if (Math.abs(height - lastViewportHeight) < 8) return
  lastViewportHeight = height
  const kb = Math.max(0, window.innerHeight - height - (vv.offsetTop || 0))
  if (kb > 120) {
    kbOffset.value = kb
    kbRaised.value = true
    kbHideFoot.value = kb > window.innerHeight * 0.45
    void nextTick(() =>
      requestAnimationFrame(() => {
        const active = document.activeElement as HTMLElement | null
        active?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    )
  } else {
    kbRaised.value = false
    kbHideFoot.value = false
    kbOffset.value = 0
  }
}

function scheduleViewportCheck() {
  if (kbDebounce) clearTimeout(kbDebounce)
  kbDebounce = setTimeout(applyViewport, 100)
}

function onKeydown(event: KeyboardEvent) {
  if (
    event.key === 'Tab' ||
    event.key === 'Enter' ||
    event.key === ' ' ||
    event.key.startsWith('Arrow')
  ) {
    keyboardMode.value = true
  }
}

function onPointerdown() {
  keyboardMode.value = false
}

function touch(id: string) {
  const now = Date.now()
  if (activeSince) timing.value[id] = (timing.value[id] ?? 0) + (now - activeSince)
  activeId = id
  activeSince = now
  scheduleSave()
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
  if (saveTimer) clearTimeout(saveTimer)
  clearAuto()
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
  confirmRestart.value = false
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
  clearAuto()
  error.value = ''
  flushTiming()
  if (isLast.value) {
    void submit()
    return
  }
  step.value += 1
  autoAdvancedStep = -1
  saveDraft()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function next() {
  if (submitting.value) return
  if (!canAdvance()) {
    clearAuto()
    if (current.value) {
      invalid.value = [current.value.id]
      showMissingHint.value = true
      void focusQuestion()
    }
    return
  }
  invalid.value = []
  showMissingHint.value = false
  advance()
}

function back() {
  if (submitting.value) return
  clearAuto()
  flushTiming()
  invalid.value = []
  error.value = ''
  showMissingHint.value = false
  step.value = Math.max(0, step.value - 1)
  // 回到上一题后重新选择，仍然要能自动进到下一题，所以把「这一题已自动跳过一次」的标记清掉。
  autoAdvancedStep = -1
  saveDraft()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function jumpToQuestion(id: string): boolean {
  const index = visible.value.findIndex((question) => question.id === id)
  if (index < 0 || index === step.value) return false
  step.value = index
  return true
}

async function submit() {
  if (!survey.value) return
  submitting.value = true
  error.value = ''
  announce('正在提交答案')
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
        // 只有真的发生跳题才抑制切题播报；当前题缺失时 step 不变，标记会泄漏。
        suppressAnnounce = jumpToQuestion(missingIds[0])
        invalid.value = missingIds
        showMissingHint.value = true
        error.value = `还有 ${missingIds.length} 道必答题没完成`
        submitting.value = false
        void focusQuestion()
        return
      }
    }
    error.value = err instanceof Error ? err.message : '提交失败，请再试一次'
    submitting.value = false
  }
}

// 单选题选中后自动进入下一题；多选题、填空题、数字题用「下一步」确认。
// 键盘选中后停留，方便比较选项；只有指针/触摸点选才启动 250ms 自动前进。
watch(
  answers,
  () => {
    if (restoring) return
    if (keyboardMode.value) return
    if (!current.value || current.value.type !== 'single') return
    if (resolved.value?.disabled) return
    if (isEmptyValue(answers.value[current.value.id])) return
    if (autoAdvancedStep === step.value) return
    autoAdvancedStep = step.value
    clearAuto()
    autoTimer = setTimeout(() => {
      if (autoAdvancedStep !== step.value) return
      advance()
    }, 250)
  },
  { deep: true }
)

watch(step, async () => {
  if (restoring) return
  await nextTick()
  if (suppressAnnounce) {
    suppressAnnounce = false
    return
  }
  if (keyboardMode.value) {
    stemEl.value?.focus({ preventScroll: true })
  } else {
    announce(`下一题：${groupTitle.value}`)
  }
})

function onVisibility() {
  if (document.visibilityState === 'hidden') onLeave()
}

function bindGlobal() {
  window.addEventListener('beforeunload', onLeave)
  window.addEventListener('pagehide', onLeave)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('pointerdown', onPointerdown)
  window.visualViewport?.addEventListener('resize', scheduleViewportCheck)
  window.visualViewport?.addEventListener('scroll', scheduleViewportCheck)
}

function unbindGlobal() {
  window.removeEventListener('beforeunload', onLeave)
  window.removeEventListener('pagehide', onLeave)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('pointerdown', onPointerdown)
  window.visualViewport?.removeEventListener('resize', scheduleViewportCheck)
  window.visualViewport?.removeEventListener('scroll', scheduleViewportCheck)
}

onMounted(async () => {
  bindGlobal()
  try {
    const payload = await api.getInvite(token)
    invite.value = payload
    if (payload.submitted && payload.reportSlug) {
      await router.replace(`/r/${payload.reportSlug}`)
      return
    }
    restoring = true
    survey.value = payload.survey
    restoreDraft()
    await nextTick()
    restoring = false
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
  clearAuto()
  if (focusOutTimer) clearTimeout(focusOutTimer)
  if (kbDebounce) clearTimeout(kbDebounce)
  unbindGlobal()
  onLeave()
})
</script>

<style scoped>
.quiz {
  min-height: 100vh;
  min-height: 100svh;
  max-width: 640px;
  margin: 0 auto;
  padding: 20px 24px calc(120px + env(safe-area-inset-bottom));
  background: var(--paper);
}

@media (min-width: 720px) and (pointer: fine) {
  .foot {
    background: rgba(239, 241, 236, 0.94);
    backdrop-filter: blur(10px);
  }
}

@supports not (backdrop-filter: blur(1px)) {
  .foot {
    background: var(--paper);
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sheet {
  padding-top: 24px;
}

.restore {
  margin: 20px 0 0;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
}

.restore p {
  font-size: 13px;
  line-height: 1.6;
  color: var(--ink-2);
}

.restore-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.restore-actions .btn {
  height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 13px;
}

h1 {
  font-family: var(--sans);
  font-size: clamp(24px, 5.4vw, 28px);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0;
}

h1:focus {
  outline: none;
}

.stem {
  margin-top: 8px;
  font-family: var(--sans);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0;
}

.stem:focus {
  outline: none;
}

@media (min-width: 720px) {
  .stem {
    font-size: 20px;
  }
}

.sub {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ink-2);
  max-width: 32em;
}

.questions {
  margin-top: 24px;
}

.disabled-note {
  margin: 22px 0 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px dashed var(--line);
  font-size: 13px;
  color: var(--ink-2);
}

.foot {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: var(--paper);
  border-top: 1px solid var(--line);
  padding: 12px 24px calc(12px + env(safe-area-inset-bottom));
}

.kb-focus {
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.kb-focus .foot {
  position: static;
  margin-top: 16px;
}

.kb-raised {
  padding-bottom: calc(120px + var(--kb-offset, 0px) + env(safe-area-inset-bottom));
}

.kb-raised .foot {
  position: fixed;
  margin-top: 0;
  bottom: var(--kb-offset, 0px);
}

.kb-hide-foot .foot {
  visibility: hidden;
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
  min-width: 96px;
  padding: 0 18px;
}

.spacer {
  flex: 1;
}

.save-hint {
  font-size: 12px;
  color: var(--ink-2);
}

.missing-hint {
  max-width: 640px;
  margin: 10px auto 0;
  font-size: 13px;
  color: var(--danger);
  text-align: center;
}

.error {
  max-width: 640px;
  margin: 10px auto 0;
  font-size: 13px;
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
  height: 100vh;
  height: 100dvh;
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
  font-size: 13px;
  color: var(--ink-2);
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
    box-shadow: 0 0 0 0 rgba(47, 92, 72, 0.25);
  }
  70% {
    box-shadow: 0 0 0 18px rgba(47, 92, 72, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(47, 92, 72, 0);
  }
}

.group.fade-in {
  animation: quiz-fade 0.12s ease;
}

@keyframes quiz-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 560px) {
  .quiz {
    padding: 16px 20px calc(120px + env(safe-area-inset-bottom));
  }

  .sheet {
    padding-top: 20px;
  }

  .foot {
    padding-left: 16px;
    padding-right: 16px;
  }

  .back {
    height: 44px;
    min-width: 88px;
  }

  .next {
    min-width: 0;
    flex: 1;
  }
}
</style>
