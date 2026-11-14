import type { ParsedBatch, Parser } from './types'

function asBatch(raw: unknown, fallback: { exam: string; province: string; sourceName: string; sourceUrl: string }): ParsedBatch | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const metrics = Array.isArray(item.metrics) ? item.metrics : []
  if (metrics.length === 0) return null
  return {
    scope: (item.scope as ParsedBatch['scope']) ?? 'provincial',
    exam: (item.exam as ParsedBatch['exam']) ?? (fallback.exam as ParsedBatch['exam']),
    year: Number(item.year) || new Date().getFullYear(),
    province: String(item.province ?? fallback.province),
    region: String(item.region ?? ''),
    schoolId: String(item.schoolId ?? ''),
    programId: String(item.programId ?? ''),
    category: String(item.category ?? ''),
    track: String(item.track ?? ''),
    title: String(item.title ?? ''),
    sourceName: String(item.sourceName ?? fallback.sourceName),
    sourceUrl: String(item.sourceUrl ?? fallback.sourceUrl),
    publishedAt: String(item.publishedAt ?? ''),
    confidence: Number(item.confidence ?? 0.9),
    metrics: metrics as ParsedBatch['metrics']
  }
}

export const jsonParser: Parser = {
  id: 'json@1',
  async parse({ content, context }) {
    let parsed: unknown
    try {
      parsed = JSON.parse(typeof content === 'string' ? content : new TextDecoder().decode(content))
    } catch (error) {
      return {
        batches: [],
        issues: [`JSON 无法解析：${(error as Error).message}`],
        failure: { code: 'parse', detail: (error as Error).message }
      }
    }
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { batches?: unknown }).batches)
        ? ((parsed as { batches: unknown[] }).batches)
        : []
    if (list.length === 0) {
      return {
        batches: [],
        issues: ['JSON 里没有 batches'],
        failure: { code: 'unsupported_table', detail: 'JSON 里没有 batches' }
      }
    }
    const batches = list
      .map((item) =>
        asBatch(item, {
          exam: context.exam,
          province: context.province,
          sourceName: context.sourceName,
          sourceUrl: context.sourceUrl
        })
      )
      .filter((item): item is ParsedBatch => Boolean(item))
    if (batches.length === 0) {
      return {
        batches: [],
        issues: ['JSON 批次缺少 metrics'],
        failure: { code: 'unsupported_table', detail: 'JSON 批次缺少 metrics' }
      }
    }
    return { batches, issues: [] }
  }
}
