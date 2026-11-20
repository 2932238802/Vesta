import type { Answers, Question, QuestionCondition, QuestionOption, Survey } from './types'

export interface ResolvedQuestion {
  visible: boolean
  disabled: boolean
  title: string
  hint?: string
  options: QuestionOption[]
  range?: { min: number; max: number; step: number }
  branches?: Question['branches']
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

  if (question.showIf && !conditionMatches(answers, question.showIf)) {
    return { ...base, visible: false }
  }
  if (question.showIfAll?.some((condition) => !conditionMatches(answers, condition))) {
    return { ...base, visible: false }
  }

  let title = question.title
  let hint = question.hint
  let options = question.options ?? []

  if (question.branches) {
    const value = answers[question.branches.question]
    const branch = typeof value === 'string' ? question.branches.map[value] : undefined
    if (branch) {
      title = branch.title
      hint = branch.hint ?? hint
      options = branch.options
    }
  }

  const disabled = question.disableIf ? conditionMatches(answers, question.disableIf) : false

  return { ...base, title, hint, options, disabled }
}

export function visibleQuestions(survey: Survey, answers: Answers): Question[] {
  return survey.questions.filter(
    (question) => resolveQuestion(survey, answers, question).visible
  )
}

function optionLabel(question: Question, id: string): string {
  if (question.branches) {
    for (const branch of Object.values(question.branches.map)) {
      const option = branch.options.find((item) => item.id === id)
      if (option) return option.label
    }
    return ''
  }
  return question.options?.find((item) => item.id === id)?.label ?? ''
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

export function label(survey: Survey, answers: Answers, id: string): string {
  const question = survey.questions.find((item) => item.id === id)
  if (!question) return ''
  const value = answers[id]
  if (typeof value !== 'string') return ''
  return optionLabel(question, value)
}

export function labels(survey: Survey, answers: Answers, id: string): string[] {
  const question = survey.questions.find((item) => item.id === id)
  if (!question) return []
  const value = answers[id]
  if (!Array.isArray(value)) return []
  return value.map((item) => optionLabel(question, item)).filter(Boolean)
}
