import type { AnswerValue, Answers, ModuleKey, Question, ReportTemplate, Survey } from './types'
import { resolveQuestion } from './doc'

const MODULE_KEYS: ModuleKey[] = [
  'hero',
  'radar',
  'strengths',
  'gaps',
  'consistency',
  'cognition',
  'actions'
]

export function isEmptyValue(value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if ('choice' in record) return !String(record.choice ?? '').trim()
    return Object.keys(record).length === 0
  }
  return false
}

export function validateSurvey(survey: Survey): string[] {
  const errors: string[] = []
  if (!survey.title?.trim()) errors.push('问卷标题不能为空')
  if (!survey.groups?.length) errors.push('至少需要一组')
  if (!survey.questions?.length) errors.push('至少需要一道题')

  const groupIds = new Set(survey.groups.map((g) => g.id))
  const dimensionKeys = new Set(survey.dimensions.map((d) => d.key))
  const questionIds = new Set<string>()
  const codes = new Set<string>()

  for (const group of survey.groups) {
    if (!group.id || !group.title?.trim()) errors.push('分组缺少 id 或标题')
  }

  for (const q of survey.questions) {
    if (!q.id || !q.title?.trim()) errors.push('题目缺少 id 或标题')
    if (questionIds.has(q.id)) errors.push(`题目 id 重复：${q.id}`)
    questionIds.add(q.id)
    if (q.code && codes.has(q.code)) errors.push(`题号重复：${q.code}`)
    if (q.code) codes.add(q.code)
    if (!groupIds.has(q.groupId)) errors.push(`题目「${q.title}」不属于任何分组`)
    if (q.dimension && !dimensionKeys.has(q.dimension)) {
      errors.push(`题目「${q.title}」指向了不存在的维度`)
    }
    if (q.type === 'single' || q.type === 'multi' || q.type === 'choiceText') {
      const optionLists = q.branches
        ? Object.values(q.branches.map).map((branch) => branch.options)
        : q.options
          ? [q.options]
          : []
      if (optionLists.length === 0 || optionLists.some((list) => list.length < 2)) {
        errors.push(`题目「${q.title}」至少需要两个选项`)
      } else {
        for (const options of optionLists) {
          const optionIds = new Set<string>()
          for (const option of options) {
            if (!option.id || !option.label?.trim()) {
              errors.push(`题目「${q.title}」有空白选项`)
            }
            if (optionIds.has(option.id)) {
              errors.push(`题目「${q.title}」选项 id 重复`)
            }
            optionIds.add(option.id)
            if (option.score !== null && !Number.isFinite(option.score)) {
              errors.push(`题目「${q.title}」的选项分值不是数字`)
            }
          }
        }
      }
    }
    if (q.type === 'text' && q.fields && q.fields.length > 3) {
      errors.push(`题目「${q.title}」的输入框最多三个`)
    }
    if (q.type === 'matrix') {
      if (!q.rows || q.rows.length < 2) {
        errors.push(`题目「${q.title}」至少需要两行评分项`)
      } else {
        const rowIds = new Set<string>()
        for (const row of q.rows) {
          if (!row.id || !row.label?.trim()) errors.push(`题目「${q.title}」有空白评分项`)
          if (rowIds.has(row.id)) errors.push(`题目「${q.title}」的评分项 id 重复`)
          rowIds.add(row.id)
        }
      }
      if (q.scale !== undefined && (q.scale < 2 || q.scale > 10)) {
        errors.push(`题目「${q.title}」的评分范围需要在 2 到 10 之间`)
      }
    }
  }

  for (const dim of survey.dimensions) {
    if (!dim.key || !dim.name?.trim()) errors.push('维度缺少 key 或名称')
    if (!Number.isFinite(dim.weight) || dim.weight < 0) {
      errors.push(`维度「${dim.name}」的权重无效`)
    }
    const used = survey.questions.some((q) => q.dimension === dim.key)
    if (!used) errors.push(`维度「${dim.name}」没有关联题目`)
  }

  if (!survey.tiers?.some((t) => t.min === 0)) {
    errors.push('档位需要包含一个最低阈值为 0 的档')
  }

  return errors
}

export interface AnswerValidation {
  ok: boolean
  errors: string[]
  answers: Answers
  missing: string[]
}

export function validateAnswers(survey: Survey, input: unknown): AnswerValidation {
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const errors: string[] = []
  const missing: string[] = []
  const answers: Answers = {}

  for (const question of survey.questions) {
    const resolved = resolveQuestion(survey, source as Answers, question)
    const value = source[question.id]

    // 被跳过的题（showIf 不满足）不要求回答；被置灰的题（disableIf 命中）不计必答。
    if (!resolved.visible) {
      answers[question.id] = null
      continue
    }
    const required = question.required && !resolved.disabled

    if (isEmptyValue(value as AnswerValue)) {
      if (required) missing.push(question.id)
      answers[question.id] = null
      continue
    }

    if (question.type === 'single') {
      if (typeof value !== 'string' || !resolved.options.some((o) => o.id === value)) {
        errors.push(`题目「${resolved.title}」的选项无效`)
      } else {
        answers[question.id] = value
      }
      continue
    }

    if (question.type === 'choiceText') {
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        errors.push(`题目「${question.title}」的选项无效`)
        continue
      }
      const record = value as Record<string, unknown>
      const pick = typeof record.choice === 'string' ? record.choice : ''
      const note = typeof record.note === 'string' ? record.note.trim() : ''
      const other = typeof record.other === 'string' ? record.other.trim() : ''
      const isOther = resolved.options.find((o) => o.id === pick)?.label === '其他'
      if (!resolved.options.some((o) => o.id === pick)) {
        errors.push(`题目「${resolved.title}」的选项无效`)
      } else if (isOther && !other) {
        errors.push(`题目「${resolved.title}」选了其他，请填写具体内容`)
        missing.push(question.id)
      } else if (note.length > 300 || other.length > 300) {
        errors.push(`题目「${resolved.title}」填写过长`)
      } else {
        answers[question.id] = isOther ? { choice: pick, note, other } : { choice: pick, note }
      }
      continue
    }

    if (question.type === 'multi') {
      if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
        errors.push(`题目「${resolved.title}」的选项无效`)
      } else {
        const ids = [...new Set(value as string[])]
        if (ids.some((id) => !resolved.options.some((o) => o.id === id))) {
          errors.push(`题目「${resolved.title}」包含无效选项`)
        } else if (question.maxSelect && ids.length > question.maxSelect) {
          errors.push(`题目「${resolved.title}」最多选 ${question.maxSelect} 项`)
        } else {
          answers[question.id] = ids
        }
      }
      continue
    }

    if (question.type === 'matrix') {
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        errors.push(`题目「${question.title}」的评分无效`)
        continue
      }
      const rows = question.rows ?? []
      const scale = question.scale ?? 5
      const record: Record<string, number> = {}
      for (const row of rows) {
        const raw = (value as Record<string, unknown>)[row.id]
        const num = typeof raw === 'number' ? raw : Number(raw)
        if (!Number.isFinite(num)) continue
        if (num < 1 || num > scale) {
          errors.push(`题目「${question.title}」的评分需要在 1 到 ${scale} 之间`)
          continue
        }
        record[row.id] = num
      }
      answers[question.id] = record
      if (question.required && rows.length && Object.keys(record).length < rows.length) {
        missing.push(question.id)
      }
      continue
    }

    if (question.type === 'text') {
      if (question.fields?.length) {
        if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
          errors.push(`题目「${question.title}」的填写内容无效`)
        } else if (value.some((v) => (v as string).length > 300)) {
          errors.push(`题目「${question.title}」填写过长`)
        } else {
          const fields = (value as string[]).map((v) => v.trim())
          answers[question.id] = fields
          if (question.required && fields.some((field) => field.length === 0)) {
            missing.push(question.id)
          }
        }
      } else if (typeof value !== 'string') {
        errors.push(`题目「${question.title}」的填写内容无效`)
      } else if (value.length > 600) {
        errors.push(`题目「${question.title}」填写过长`)
      } else {
        answers[question.id] = value.trim()
      }
      continue
    }

    if (question.type === 'number') {
      const num = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(num) || num < 0 || num > 300) {
        errors.push(`题目「${question.title}」的数字无效`)
      } else {
        answers[question.id] = num
      }
    }
  }

  return { ok: errors.length === 0 && missing.length === 0, errors, answers, missing }
}

export function validateTemplate(template: ReportTemplate): string[] {
  const errors: string[] = []
  if (!template.theme?.accent || !/^#[0-9a-fA-F]{6}$/.test(template.theme.accent)) {
    errors.push('主题强调色需要是 #RRGGBB')
  }
  if (!template.theme?.paper || !/^#[0-9a-fA-F]{6}$/.test(template.theme.paper)) {
    errors.push('主题底色需要是 #RRGGBB')
  }
  if (!Array.isArray(template.modules)) {
    errors.push('模块配置缺失')
  } else {
    const keys = new Set(template.modules.map((m) => m.key))
    for (const key of MODULE_KEYS) {
      if (!keys.has(key)) errors.push(`模块缺少：${key}`)
    }
  }
  if (!template.copy?.claim?.title) errors.push('领取卡片缺少标题')
  return errors
}

export function isQuestionScored(question: Question): boolean {
  return Boolean(
    question.dimension &&
      (question.type === 'single' || question.type === 'multi') &&
      question.options?.some((o) => typeof o.score === 'number')
  )
}
