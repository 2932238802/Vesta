import { ref, watch, type ComputedRef, type Ref } from 'vue'
import type { Answers, Question, Survey } from '@shared/types'
import { resolveQuestion } from '@shared/question'
import { isEmptyValue } from '@shared/validate'

export interface BranchRecoveryOptions {
  survey: Ref<Survey | null>
  answers: Ref<Answers>
  step: Ref<number>
  visible: ComputedRef<Question[]>
  /** 补答完成、回到分支题时回调，调用方可借此抑制一次自动前进。 */
  onReturn?: (targetStep: number) => void
}

/**
 * 分支题回跳补答：
 * 进入分支题时，如果分支来源题可见、必答、单选但没有有效答案，自动回到来源题，
 * 清掉失效答案并提示「先完成这一题」；补答后再回到分支题。
 * 来源题缺失 / 被隐藏 / 非单选 / 选中的是合法但无映射的选项时，不回跳，交给 resolveQuestion 兜底。
 */
export function useBranchRecovery(options: BranchRecoveryOptions) {
  const { survey, answers, step, visible, onReturn } = options
  const hint = ref('')
  const hintQuestionId = ref('')
  let pendingReturn: { sourceId: string; sourceIndex: number; targetId: string } | null = null

  function check(): boolean {
    const currentSurvey = survey.value
    const current = visible.value[step.value]
    if (!currentSurvey || !current?.branches) return false
    const sourceId = current.branches.question
    if (!sourceId || sourceId === current.id) return false

    const source = currentSurvey.questions.find((item) => item.id === sourceId)
    if (!source) return false
    const resolved = resolveQuestion(currentSurvey, answers.value, source)
    // 只有「可见 + 可作答（未被置灰）+ 必答 + 单选」的来源题才回跳；其余情况走通用题面兜底。
    if (!resolved.visible || resolved.disabled || !source.required || source.type !== 'single') {
      return false
    }

    const value = answers.value[sourceId]
    const missing = isEmptyValue(value)
    const invalid =
      !missing &&
      (typeof value !== 'string' || !resolved.options.some((option) => option.id === value))
    if (!missing && !invalid) return false

    const sourceIndex = visible.value.findIndex((item) => item.id === sourceId)
    if (sourceIndex < 0 || sourceIndex === step.value) return false

    if (!missing) answers.value = { ...answers.value, [sourceId]: null }
    pendingReturn = { sourceId, sourceIndex, targetId: current.id }
    hint.value = '先完成这一题'
    hintQuestionId.value = sourceId
    step.value = sourceIndex
    return true
  }

  // 补答完成（来源题不再为空）后回到分支题；用户中途离开来源题则取消回跳。
  watch(
    [answers, step],
    () => {
      if (!pendingReturn) return
      const { sourceId, sourceIndex, targetId } = pendingReturn
      if (step.value !== sourceIndex) {
        pendingReturn = null
        return
      }
      if (isEmptyValue(answers.value[sourceId])) return
      const target = visible.value.findIndex((item) => item.id === targetId)
      pendingReturn = null
      hint.value = ''
      hintQuestionId.value = ''
      if (target >= 0) {
        step.value = target
        // 回到分支题时可能残留旧答案，抑制一次自动前进，避免学员来不及确认。
        onReturn?.(target)
      }
    },
    { deep: true }
  )

  return { hint, hintQuestionId, check }
}
