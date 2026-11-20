import { onBeforeUnmount, watch, type ComputedRef, type Ref } from 'vue'
import type { Answers, Question, Survey } from '@shared/types'
import { isEmptyValue } from '@shared/validate'

export interface QuizDraftOptions {
  token: string
  survey: Ref<Survey | null>
  visible: ComputedRef<Question[]>
  answers: Ref<Answers>
  step: Ref<number>
  timing: Ref<Record<string, number>>
  restored: Ref<boolean>
}

/** 问卷草稿：本机保存/恢复 + 每题停留时长。Quiz.vue 只负责流程编排。 */
export function useQuizDraft(options: QuizDraftOptions) {
  const { token, survey, visible, answers, step, timing, restored } = options
  const draftKey = `vesta:draft:${token}`
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let activeId: string | null = null
  let activeSince = 0

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
        JSON.stringify({
          surveyId: survey.value.id,
          answers: answers.value,
          step: step.value,
          timing: timing.value
        })
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

  function cancelSave() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = undefined
  }

  function removeDraft() {
    try {
      localStorage.removeItem(draftKey)
    } catch {
      // 存储不可用时忽略
    }
  }

  /** 重新填写：清空答案、计时、本机草稿。调用方负责重置其余界面状态。 */
  function reset() {
    cancelSave()
    activeId = null
    activeSince = 0
    answers.value = {}
    timing.value = {}
    step.value = 0
    restored.value = false
    removeDraft()
  }

  watch([answers, step, timing], scheduleSave, { deep: true })
  onBeforeUnmount(cancelSave)

  return {
    touch,
    flushTiming,
    scheduleSave,
    saveDraft,
    restoreDraft,
    cancelSave,
    removeDraft,
    reset
  }
}
