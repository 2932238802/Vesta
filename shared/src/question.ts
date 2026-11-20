import type { Answers, Question, QuestionCondition, QuestionOption, Survey } from './types'

export interface ResolvedQuestion {
  visible: boolean
  disabled: boolean
  title: string
  hint?: string
  options: QuestionOption[]
  range?: { min: number; max: number; step: number }
  branches?: Question['branches']
  /** 分支未命中、改用通用题面时为 true，便于后台/日志识别兜底路径 */
  fallback?: boolean
}

/** 分支题没命中时的通用题面；选项 id 按题目 id 生成，与默认分支的 q16_1–q16_4 一致。 */
export const BRANCH_FALLBACK_TITLE = '你对目标方向的门槛、时间节点了解多少？'

const BRANCH_FALLBACK_LABELS = ['都清楚', '知道一些', '只听过', '完全不了解']

export function branchFallbackOptions(questionId: string): QuestionOption[] {
  return BRANCH_FALLBACK_LABELS.map((label, index) => ({
    id: `${questionId}_${index + 1}`,
    label,
    score: null
  }))
}

function conditionMatches(answers: Answers, condition: QuestionCondition): boolean {
  const value = answers[condition.question]
  if (condition.when?.length) {
    if (Array.isArray(value)) {
      if (!value.some((item) => typeof item === 'string' && condition.when?.includes(item))) {
        return false
      }
    } else if (typeof value !== 'string' || !condition.when.includes(value)) {
      return false
    }
  }
  if (typeof condition.min === 'number') {
    if (typeof value !== 'number' || value < condition.min) return false
  }
  if (typeof condition.max === 'number') {
    if (typeof value !== 'number' || value >= condition.max) return false
  }
  if (condition.not?.length) {
    if (Array.isArray(value)) {
      if (value.some((item) => typeof item === 'string' && condition.not?.includes(item))) {
        return false
      }
    } else if (typeof value === 'string' && condition.not.includes(value)) {
      return false
    }
  }
  return true
}

/**
 * 只计算题目自身是否可见 / 置灰，不解析 branches。
 * 分支题判断来源题可用性时用它，避免沿 branches 递归造成自引用/互相引用死循环。
 */
function questionState(
  question: Question,
  answers: Answers
): { visible: boolean; disabled: boolean } {
  const hidden =
    Boolean(question.showIf && !conditionMatches(answers, question.showIf)) ||
    Boolean(question.showIfAll?.some((condition) => !conditionMatches(answers, condition)))
  const disabled = question.disableIf ? conditionMatches(answers, question.disableIf) : false
  return { visible: !hidden, disabled }
}

/** 把一道题按当前答案解析成实际要展示的题面：处理 showIf / disableIf / branches。 */
export function resolveQuestion(
  survey: Survey,
  answers: Answers,
  question: Question
): ResolvedQuestion {
  const base: ResolvedQuestion = {
    visible: true,
    disabled: false,
    title: question.title,
    hint: question.hint,
    options: question.options ?? [],
    range: question.range,
    branches: question.branches
  }

  const state = questionState(question, answers)
  if (!state.visible) {
    return { ...base, visible: false }
  }

  let title = question.title
  let hint = question.hint
  let options = question.options ?? []
  let fallback = false

  if (question.branches) {
    const source = survey.questions.find((item) => item.id === question.branches?.question)
    // 来源题不存在、被隐藏、被置灰或不是单选时，即使答案碰巧是字符串也不能用分支，统一走通用题面。
    const sourceState = source ? questionState(source, answers) : null
    const sourceUsable =
      Boolean(source) &&
      source?.type === 'single' &&
      Boolean(sourceState?.visible) &&
      !sourceState?.disabled
    const value = answers[question.branches.question]
    const branch =
      sourceUsable && typeof value === 'string' ? question.branches.map[value] : undefined
    if (branch && branch.options.length > 0) {
      title = branch.title
      hint = branch.hint ?? hint
      options = branch.options
    } else {
      // 分支未命中（来源缺失 / 非单选 / 答案失效 / 选项没有映射）时一律走通用题面，
      // 保证任何分支题都不会渲染成 0 个选项的死路；前端、提交校验、报告共用这一处。
      title = BRANCH_FALLBACK_TITLE
      options = branchFallbackOptions(question.id)
      fallback = true
    }
  }

  return fallback
    ? { ...base, title, hint, options, disabled: state.disabled, fallback: true }
    : { ...base, title, hint, options, disabled: state.disabled }
}

export function visibleQuestions(survey: Survey, answers: Answers): Question[] {
  return survey.questions.filter(
    (question) => resolveQuestion(survey, answers, question).visible
  )
}

function optionLabel(options: QuestionOption[], id: string): string {
  return options.find((item) => item.id === id)?.label ?? ''
}

export function selectedOption(
  survey: Survey,
  answers: Answers,
  id: string
): QuestionOption | undefined {
  const question = survey.questions.find((item) => item.id === id)
  if (!question) return undefined
  const resolved = resolveQuestion(survey, answers, question)
  const value = answers[id]
  if (typeof value !== 'string') return undefined
  return resolved.options.find((item) => item.id === value)
}

/** 选项文字按「实际渲染的选项」取，兜底答案也能拿到正确标签。 */
export function label(survey: Survey, answers: Answers, id: string): string {
  const question = survey.questions.find((item) => item.id === id)
  if (!question) return ''
  const value = answers[id]
  if (typeof value !== 'string') return ''
  return optionLabel(resolveQuestion(survey, answers, question).options, value)
}

export function labels(survey: Survey, answers: Answers, id: string): string[] {
  const question = survey.questions.find((item) => item.id === id)
  if (!question) return []
  const value = answers[id]
  if (!Array.isArray(value)) return []
  const options = resolveQuestion(survey, answers, question).options
  return value
    .map((item) => (typeof item === 'string' ? optionLabel(options, item) : ''))
    .filter(Boolean)
}
