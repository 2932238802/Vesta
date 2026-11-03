import type { AnswerValue, Answers, Question, ScoreResult, Survey } from './types'

export function rawScore(question: Question, value: AnswerValue): number | null {
  if (value === null || value === undefined) return null
  if (question.type === 'single') {
    const option = question.options?.find((o) => o.id === value)
    return option?.score ?? null
  }
  if (question.type === 'multi') {
    if (!Array.isArray(value)) return null
    const scores = question.options
      ?.filter((o) => value.includes(o.id))
      .map((o) => o.score)
      .filter((s): s is number => typeof s === 'number')
    if (!scores || scores.length === 0) return null
    return scores.reduce((a, b) => a + b, 0) / scores.length
  }
  return null
}

export function computeScores(survey: Survey, answers: Answers): ScoreResult {
  const detail: Record<string, number | null> = {}

  for (const question of survey.questions) {
    detail[question.id] = rawScore(question, answers[question.id] ?? null)
  }

  const dimensions = survey.dimensions.map((dimension) => {
    const values = survey.questions
      .filter((q) => q.dimension === dimension.key)
      .map((q) => detail[q.id])
      .filter((v): v is number => typeof v === 'number')

    const average = values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0

    return {
      key: dimension.key,
      name: dimension.name,
      weight: dimension.weight,
      score: Math.round((average / 5) * 100)
    }
  })

  // C2 这类矩阵题用于调整维度在总分里的比重。
  // 新版语义：1 = 最缺，5 = 最不缺（anchors.high 为“不缺”），分数越低权重越高；
  // 旧版问卷没有这个 anchors，仍按 5 = 最缺处理，保证历史答卷不受影响。
  const needWeights = new Map<string, number>()
  for (const question of survey.questions) {
    if (question.type !== 'matrix') continue
    const lowerMeansMoreNeed = question.anchors?.high === '不缺'
    const value = answers[question.id]
    for (const row of question.rows ?? []) {
      if (!row.dimension) continue
      let rating: number | null = null
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const num = Number((value as Record<string, unknown>)[row.id])
        if (Number.isFinite(num)) rating = Math.min(Math.max(num, 1), 5)
      }
      if (rating === null) continue
      const gap = lowerMeansMoreNeed ? 3 - rating : rating - 3
      const multiplier = 1 + gap * 0.15
      needWeights.set(row.dimension, Math.max(needWeights.get(row.dimension) ?? 1, multiplier))
    }
  }

  const weighted = dimensions.map((dimension) => ({
    ...dimension,
    effectiveWeight:
      Math.round(dimension.weight * (needWeights.get(dimension.key) ?? 1) * 10) / 10
  }))

  const weightSum = weighted.reduce((sum, d) => sum + (d.effectiveWeight ?? d.weight), 0) || 1
  const total = Math.round(
    weighted.reduce((sum, d) => sum + d.score * (d.effectiveWeight ?? d.weight), 0) / weightSum
  )

  const tierRule =
    [...survey.tiers].sort((a, b) => b.min - a.min).find((t) => total >= t.min) ??
    survey.tiers[survey.tiers.length - 1]

  return { total, tier: tierRule.tier, dimensions: weighted, detail }
}

export function tierRuleOf(survey: Survey, tier: string) {
  return survey.tiers.find((t) => t.tier === tier) ?? survey.tiers[survey.tiers.length - 1]
}
