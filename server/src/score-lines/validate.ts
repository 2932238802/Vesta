import type { NormalizedBatch, ScoreLineMetric } from '../../../shared/src/score-line'

/** 同比变化超过 30% 或解析置信度低 → 复核页标红，但仍允许保存为 pending。 */
export function anomalyIssues(
  batch: NormalizedBatch,
  previous: ScoreLineMetric[]
): string[] {
  const issues: string[] = []
  if (batch.confidence < 0.8) {
    issues.push(`解析置信度偏低（${batch.confidence.toFixed(2)}）`)
  }
  const previousMap = new Map(previous.map((metric) => [metric.subjectCode, metric.value]))
  for (const metric of batch.metrics) {
    if (metric.isMinimum === 1) continue
    const before = previousMap.get(metric.subjectCode)
    if (before === undefined || before === 0) continue
    const change = Math.abs(metric.value - before) / before
    if (change > 0.3) {
      issues.push(
        `${metric.subjectName} 同比变化 ${(change * 100).toFixed(0)}%（${before} → ${metric.value}）`
      )
    }
  }
  return issues
}

/** 抓取批次的最小写库检查；共享导入校验之外再挡一次范围错误。 */
export function batchValueIssues(batch: NormalizedBatch): string[] {
  const issues: string[] = []
  if (!Number.isInteger(batch.year) || batch.year < 2000 || batch.year > 2100) {
    issues.push('年份不在 2000–2100 之间')
  }
  if (!['national', 'provincial', 'school', 'program'].includes(batch.scope)) {
    issues.push('分数线范围非法')
  }
  if (batch.metrics.length === 0) issues.push('没有指标')
  for (const metric of batch.metrics) {
    if (!Number.isFinite(metric.value) || metric.value < 0 || metric.value > 1000) {
      issues.push(`${metric.subjectName} 分数越界`)
    }
    if (
      metric.fullScore !== null &&
      (metric.fullScore <= 0 || metric.fullScore > 1000 || metric.value > metric.fullScore)
    ) {
      issues.push(`${metric.subjectName} 满分或分数关系不合法`)
    }
    if (metric.isMinimum === 1 && !metric.minimumType) {
      issues.push(`${metric.subjectName} 最低分缺少类型`)
    }
  }
  return issues
}
