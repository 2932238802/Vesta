import type {
  Answers,
  DimScore,
  ModuleKey,
  Question,
  ReportBlock,
  ReportOverrides,
  ReportPayload,
  ReportTemplate,
  ScoreResult,
  Survey
} from './types'
import { tierRuleOf } from './scoring'

type Vars = Record<string, string | number | undefined>

export function render(text: string, vars: Vars): string {
  if (!text) return ''
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key]
    return value === undefined || value === null ? '' : String(value)
  })
}

function textFields(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim())
}

function samePlace(a: string, b: string): boolean {
  const clean = (place: string) => place.replace(/[市省]$/u, '').trim()
  const left = clean(a)
  const right = clean(b)
  return Boolean(left) && left === right
}

export function answerLabel(question: Question | undefined, value: unknown): string {
  if (!question || value === null || value === undefined) return ''
  if (question.type === 'matrix') {
    if (typeof value !== 'object' || Array.isArray(value)) return ''
    const record = value as Record<string, number>
    return (
      question.rows
        ?.map((row) => `${row.label} ${record[row.id] ?? '-'}`)
        .join('、') ?? ''
    )
  }
  if (question.type === 'single') {
    return question.options?.find((o) => o.id === value)?.label ?? ''
  }
  if (question.type === 'choiceText') {
    if (typeof value !== 'object' || Array.isArray(value)) return ''
    const record = value as { choice?: unknown; note?: unknown; other?: unknown }
    const label = question.options?.find((o) => o.id === record.choice)?.label ?? ''
    const note = typeof record.note === 'string' ? record.note.trim() : ''
    const other = typeof record.other === 'string' ? record.other.trim() : ''
    const base = other ? `${label}：${other}` : label
    return note ? `${base}（${note}）` : base
  }
  if (question.type === 'multi') {
    if (!Array.isArray(value)) return ''
    return question.options
      ?.filter((o) => value.includes(o.id))
      .map((o) => o.label)
      .join('、') ?? ''
  }
  if (question.type === 'text') {
    if (Array.isArray(value)) return value.filter(Boolean).join(' / ')
    return String(value)
  }
  return String(value)
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

function sortedDimensions(dimensions: DimScore[], direction: 'asc' | 'desc'): DimScore[] {
  const copy = [...dimensions]
  copy.sort((a, b) => (direction === 'asc' ? a.score - b.score : b.score - a.score))
  return copy
}

// 家庭支持是背景条件，不是靠学生自己就能补上的能力项。
// 它照常计入雷达图和总分，但不参与“先补哪一项”的排序和动作推荐。
const ACTIONABLE = (dimensions: DimScore[]): DimScore[] =>
  dimensions.filter((dim) => dim.key !== 'b8')

const FACTORS = [
  { id: 'c1_1', name: '努力', dimensions: ['b6'] },
  { id: 'c1_2', name: '老师与资源', dimensions: ['b5', 'b8'] },
  { id: 'c1_3', name: '身边的人与环境', dimensions: ['b7'] },
  { id: 'c1_4', name: '方法', dimensions: ['b5'] },
  { id: 'c1_5', name: '家庭条件', dimensions: ['b8'] }
] as const

interface FactorScore {
  id: string
  name: string
  weight: number
  score: number
  dimensions: readonly string[]
}

function factorScores(answers: Answers, scores: ScoreResult): FactorScore[] {
  const raw = answers.c1
  return FACTORS.map((factor) => {
    let weight = 3
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const value = Number((raw as Record<string, unknown>)[factor.id])
      if (Number.isFinite(value)) weight = Math.min(Math.max(value, 1), 5)
    } else if (typeof raw === 'string') {
      // 旧版单选题的数据：选中的一项按 5 分处理，其余按 1 分
      weight = raw === factor.id ? 5 : 1
    }

    const values = factor.dimensions
      .map((key) => scores.dimensions.find((dim) => dim.key === key)?.score)
      .filter((value): value is number => typeof value === 'number')
    const score = values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : 0

    return { id: factor.id, name: factor.name, weight, score, dimensions: factor.dimensions }
  })
}

function weightedPriority(dimensions: DimScore[], factors: FactorScore[]): DimScore[] {
  const weights = new Map<string, number>()
  for (const factor of factors) {
    for (const key of factor.dimensions) {
      weights.set(key, Math.max(weights.get(key) ?? 0, factor.weight))
    }
  }
  return [...dimensions].sort((a, b) => {
    const left = (100 - a.score) * (1 + (weights.get(a.key) ?? 0) / 10)
    const right = (100 - b.score) * (1 + (weights.get(b.key) ?? 0) / 10)
    return right - left
  })
}

function priorityFactor(factors: FactorScore[]): FactorScore {
  const actionable = factors.filter((factor) => factor.id !== 'c1_5')
  return [...actionable].sort(
    (a, b) => b.weight * (100 - b.score) - a.weight * (100 - a.score)
  )[0]
}

function needPriority(
  survey: Survey,
  answers: Answers
): { name: string; weight: number } | null {
  const question = survey.questions.find((q) => q.id === 'c2')
  if (!question || question.type !== 'matrix') return null
  const value = answers.c2
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const rows = (question.rows ?? [])
    .map((row) => ({ name: row.label, weight: Number(record[row.id]) || 0 }))
    .filter((row) => row.weight > 0)

  // 新版 C2：1 = 最缺，5 = 最不缺，取最低分；五项都不低于 4 分就不再指出缺口。
  if (question.anchors?.high === '不缺') {
    const lowest = [...rows].sort((a, b) => a.weight - b.weight)[0]
    if (!lowest || lowest.weight >= 4) return null
    return lowest
  }

  // 旧版问卷：5 = 最缺，保持原来的取法。
  return [...rows].sort((a, b) => b.weight - a.weight)[0] ?? null
}

interface BuildInput {
  survey: Survey
  answers: Answers
  scores: ScoreResult
  template: ReportTemplate
  name: string
  slug: string
  createdAt: string
  claimed: boolean
  overrides?: ReportOverrides
}

export function buildReport(input: BuildInput): ReportPayload {
  const { survey, answers, scores, template, name, slug, createdAt, claimed, overrides } = input
  const copy = template.copy
  const dimensions = scores.dimensions
  const lowest = sortedDimensions(ACTIONABLE(dimensions), 'asc')[0]
  const highest = sortedDimensions(dimensions, 'desc')[0]
  const tierRule = tierRuleOf(survey, scores.tier)
  const date = formatDate(createdAt)

  const baseVars: Vars = {
    name,
    date,
    tier: scores.tier,
    tierLabel: tierRule.label,
    tierLine: tierRule.line,
    total: scores.total,
    low: lowest?.name ?? '',
    lowScore: lowest?.score ?? 0,
    top: highest?.name ?? '',
    topScore: highest?.score ?? 0
  }

  const blocks: ReportBlock[] = []

  for (const module of template.modules) {
    if (!module.enabled) continue
    const block = buildModule(module.key, {
      survey,
      answers,
      scores,
      template,
      name,
      slug,
      createdAt,
      claimed,
      overrides,
      baseVars,
      lowest,
      highest,
      date
    })
    if (block) blocks.push(block)
  }

  if (overrides?.closing?.trim()) {
    blocks.push({ type: 'note', title: '写在最后', text: overrides.closing.trim() })
  }

  return {
    slug,
    name,
    createdAt,
    surveyTitle: survey.title,
    signature: template.theme.signature || '',
    blocks,
    theme: template.theme,
    claim: copy.claim,
    footer: copy.footer,
    claimed
  }
}

interface ModuleContext {
  survey: Survey
  answers: Answers
  scores: ScoreResult
  template: ReportTemplate
  name: string
  slug: string
  createdAt: string
  claimed: boolean
  overrides?: ReportOverrides
  baseVars: Vars
  lowest: DimScore
  highest: DimScore
  date: string
}

function buildModule(key: ModuleKey, ctx: ModuleContext): ReportBlock | null {
  const { survey, answers, scores, template, overrides, baseVars, lowest, date } = ctx
  const copy = template.copy

  if (key === 'hero') {
    const summarySource = overrides?.diagnosis?.trim()
      ? overrides.diagnosis.trim()
      : render(copy.hero.noQuote, baseVars)

    return {
      type: 'hero',
      eyebrow: render(copy.hero.eyebrow, { ...baseVars, date }),
      title: copy.hero.title,
      summary: summarySource,
      tier: scores.tier,
      tierLabel: tierRuleOf(survey, scores.tier).label,
      tierLine: render(copy.hero.tierLine, {
        ...baseVars,
        tierLine: tierRuleOf(survey, scores.tier).line
      }),
      total: template.theme.showTotal ? scores.total : null
    }
  }

  if (key === 'target') {
    const locationFields = textFields(answers.a4)
    const targetFields = textFields(answers.a8)
    const hometown = locationFields[0] ?? ''
    const studyCity = locationFields[1] ?? ''
    const city = targetFields[0] || hometown || studyCity
    const cityReason = targetFields[2] ?? ''
    const major = typeof answers.a2 === 'string' ? answers.a2.trim() : ''
    const role =
      targetFields[1] || (major ? `${major}相关岗位` : copy.target.missingRole)
    const salaryQuestion = survey.questions.find((q) => q.id === 'a7')
    const salary = answerLabel(salaryQuestion, answers.a7)
    const priority = answerLabel(
      survey.questions.find((q) => q.id === 'a9'),
      answers.a9
    )
    const goalQuestion = survey.questions.find((q) => q.id === 'a10')
    const goalAnswer = answers.a10
    const goalRecord =
      goalAnswer && typeof goalAnswer === 'object' && !Array.isArray(goalAnswer)
        ? (goalAnswer as { choice?: unknown; note?: unknown; other?: unknown })
        : null
    const goalChoice =
      typeof goalRecord?.choice === 'string'
        ? (goalQuestion?.options?.find((option) => option.id === goalRecord.choice)?.label ?? '')
        : ''
    const goalOther =
      typeof goalRecord?.other === 'string' ? goalRecord.other.trim() : ''
    const goal = goalChoice ? (goalOther ? `${goalChoice}：${goalOther}` : goalChoice) : ''
    const goalNote = typeof goalRecord?.note === 'string' ? goalRecord.note.trim() : ''

    const sorted = sortedDimensions(scores.dimensions, 'desc')
    const advantages = sorted.slice(0, 3).map((dim) => ({
      key: dim.key,
      name: dim.name,
      score: dim.score
    }))
    const gaps = weightedPriority(ACTIONABLE(scores.dimensions), factorScores(answers, scores))
      .slice(0, 3)
      .map((dim) => ({ key: dim.key, name: dim.name, score: dim.score }))

    let cityNote = ''
    if (city) {
      const vars = { ...baseVars, city, hometown, studyCity, role }
      if (hometown && samePlace(city, hometown)) {
        cityNote = render(copy.target.cityNoteHometown, vars)
      } else if (studyCity && samePlace(city, studyCity)) {
        cityNote = render(copy.target.cityNoteStudy, vars)
      } else {
        cityNote = render(copy.target.cityNoteOther, vars)
      }
    }

    const threshold = copy.target.salaryBands[String(answers.a7 ?? '')] ?? ''
    const salaryNote = threshold
      ? render(copy.target.salaryNote, {
          ...baseVars,
          salary,
          threshold,
          role,
          city,
          low: gaps[0]?.name ?? baseVars.low,
          lowScore: gaps[0]?.score ?? baseVars.lowScore
        })
      : ''

    return {
      type: 'target',
      title: copy.target.title,
      subtitle: copy.target.subtitle,
      labels: {
        city: copy.target.cityLabel,
        role: copy.target.roleLabel,
        salary: copy.target.salaryLabel,
        hometown: copy.target.hometownLabel,
        priority: copy.target.priorityLabel,
        goal: copy.target.goalLabel,
        reason: copy.target.reasonLabel
      },
      city,
      role,
      salary,
      hometown,
      priority,
      goal,
      goalNote,
      cityReason,
      cityNote,
      advantageTitle: copy.target.advantageTitle,
      advantages,
      gapTitle: copy.target.gapTitle,
      gaps,
      salaryTitle: copy.target.salaryTitle,
      salaryNote,
      closing: render(copy.target.closing, baseVars)
    }
  }

  if (key === 'radar') {
    return {
      type: 'radar',
      title: copy.radar.title,
      subtitle: copy.radar.subtitle,
      dimensions: scores.dimensions
    }
  }

  if (key === 'strengths') {
    const top = sortedDimensions(scores.dimensions, 'desc').slice(0, 3)
    return {
      type: 'strengths',
      title: copy.strengths.title,
      subtitle: copy.strengths.subtitle,
      items: top.map((dim) => ({
        key: dim.key,
        name: dim.name,
        score: dim.score,
        text:
          template.dimensions[dim.key]?.strength ||
          render(copy.strengths.item, { name: dim.name, score: dim.score })
      }))
    }
  }

  if (key === 'gaps') {
    const bottom = weightedPriority(
      ACTIONABLE(scores.dimensions),
      factorScores(answers, scores)
    ).slice(0, 3)
    return {
      type: 'gaps',
      title: copy.gaps.title,
      subtitle: copy.gaps.subtitle,
      items: bottom.map((dim) => {
        const dimCopy = template.dimensions[dim.key]
        return {
          key: dim.key,
          name: dim.name,
          score: dim.score,
          what: render(dimCopy?.gap.what || '一项可以马上开始的动作', { name: dim.name }),
          how: render(dimCopy?.gap.how || '从身边能接触到的入口开始，不要等准备好', {
            name: dim.name
          }),
          when: render(dimCopy?.gap.when || '这周内', { name: dim.name })
        }
      })
    }
  }

  if (key === 'consistency') {
    const paragraphs: string[] = []
    for (const dimension of scores.dimensions) {
      const selfQuestion = survey.questions.find(
        (q) => q.dimension === dimension.key && q.role === 'self'
      )
      const behaviorQuestions = survey.questions.filter(
        (q) => q.dimension === dimension.key && q.role === 'behavior'
      )
      if (!selfQuestion || behaviorQuestions.length === 0) continue

      const self = scores.detail[selfQuestion.id]
      const behaviorValues = behaviorQuestions
        .map((q) => scores.detail[q.id])
        .filter((v): v is number => typeof v === 'number')
      if (typeof self !== 'number' || behaviorValues.length === 0) continue
      const behavior = behaviorValues.reduce((a, b) => a + b, 0) / behaviorValues.length
      if (!(self >= 4 && behavior <= 2.5 && self - behavior >= 1.5)) continue

      const evidence = behaviorQuestions
        .map((q) => `「${q.title}」选了「${answerLabel(q, answers[q.id])}」`)
        .join('，')
      const source = template.dimensions[dimension.key]?.consistency || copy.consistency.item
      paragraphs.push(
        render(source, {
          ...baseVars,
          name: dimension.name,
          dim: dimension.name,
          score: dimension.score,
          self: Math.round(self),
          behavior: Math.round(behavior * 10) / 10,
          evidence
        })
      )
    }

    if (paragraphs.length === 0) return null
    return {
      type: 'consistency',
      title: copy.consistency.title,
      intro: render(copy.consistency.intro, baseVars),
      paragraphs,
      closing: render(copy.consistency.closing, baseVars)
    }
  }

  if (key === 'cognition') {
    const factors = factorScores(answers, scores)
    const top = [...factors].sort((a, b) => b.weight - a.weight)[0]
    const lightest = [...factors].sort((a, b) => a.weight - b.weight)[0]
    const priority = priorityFactor(factors)
    const need = needPriority(survey, answers)

    const paragraphs = [
      render(copy.cognition.weights, {
        ...baseVars,
        weights: factors.map((factor) => `${factor.name} ${factor.weight}`).join('、')
      }),
      render(copy.cognition.intro, {
        ...baseVars,
        top: top.name,
        topWeight: top.weight,
        lightest: lightest.name,
        lightWeight: lightest.weight
      }),
      render(copy.cognition.compare, {
        ...baseVars,
        top: top.name,
        topWeight: top.weight,
        topScore: top.score
      }),
      render(copy.cognition.lightest, {
        ...baseVars,
        lightest: lightest.name,
        lightWeight: lightest.weight,
        lightScore: lightest.score
      })
    ]

    const extra = copy.cognition.options[top.id]
    if (extra) paragraphs.push(render(extra, baseVars))
    if (need) {
      paragraphs.push(
        render(copy.cognition.needLine, {
          ...baseVars,
          need: need.name,
          needWeight: need.weight
        })
      )
    }
    paragraphs.push(render(copy.cognition.closing, { ...baseVars, priority: priority.name }))
    return { type: 'cognition', title: copy.cognition.title, paragraphs }
  }

  if (key === 'actions') {
    const items: string[] = []
    const push = (text: string) => {
      const clean = text.trim()
      if (clean && !items.includes(clean)) items.push(clean)
    }
    for (const dim of weightedPriority(
      ACTIONABLE(scores.dimensions),
      factorScores(answers, scores)
    )) {
      const action = template.dimensions[dim.key]?.action30
      if (action) push(render(action, { ...baseVars, name: dim.name, dim: dim.name }))
      if (items.length >= 3) break
    }
    for (const fallback of copy.actions.fallback) {
      if (items.length >= 3) break
      push(fallback)
    }
    return {
      type: 'actions',
      title: copy.actions.title,
      subtitle: copy.actions.subtitle,
      items: items.slice(0, 3),
      closing: render(copy.actions.closing, baseVars)
    }
  }

  return null
}
