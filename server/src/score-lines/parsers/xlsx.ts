import * as XLSX from 'xlsx'
import type { Parser, ParsedMetric } from './types'
import { batchFromMetrics, rowsToMetrics } from './table'

export const xlsxParser: Parser = {
  id: 'xlsx@1',
  async parse({ content, context }) {
    const data =
      typeof content === 'string' ? Buffer.from(content, 'binary') : Buffer.from(content)
    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(data, { type: 'buffer' })
    } catch (error) {
      return { batches: [], issues: [`Excel 无法解析：${(error as Error).message}`] }
    }
    const metrics: ParsedMetric[] = []
    const issues: string[] = []
    for (const name of workbook.SheetNames.slice(0, 5)) {
      const sheet = workbook.Sheets[name]
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: ''
      }) as unknown[][]
      const result = rowsToMetrics(rows)
      metrics.push(...result.metrics)
      issues.push(...result.issues.map((issue) => `${name}：${issue}`))
    }
    if (metrics.length === 0) {
      return { batches: [], issues: ['Excel 里没有识别到科目分数', ...issues.slice(0, 5)] }
    }
    return { batches: [batchFromMetrics(metrics, context)], issues: [] }
  }
}
