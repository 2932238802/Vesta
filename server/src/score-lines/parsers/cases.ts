import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'
import { htmlTableParser } from './html'
import { jsonParser } from './json'
import { metricsFromText, parseScore, rowsToMetrics } from './table'
import type { ParsedMetric, ParserContext } from './types'
import { xlsxParser } from './xlsx'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string) => fs.readFileSync(path.join(here, '__fixtures__', name), 'utf8')

const context: ParserContext = {
  sourceId: 'test',
  sourceName: '浙江省教育考试院',
  sourceUrl: 'https://example.com/line',
  exam: 'upgrade',
  province: '浙江',
  year: 2025
}

function metric(result: { metrics: ParsedMetric[] }, code: string) {
  return result.metrics.find((item) => item.subjectCode === code)
}

const normal = await htmlTableParser.parse({
  parserId: 'html-table@1',
  content: fixture('normal.html'),
  contentType: 'text/html',
  url: context.sourceUrl,
  context
})
assert.equal(normal.batches.length, 1)
assert.equal(normal.batches[0].year, 2025)
assert.equal(normal.batches[0].province, '浙江')
assert.equal(metric(normal.batches[0], 'total')?.value, 180)
assert.equal(metric(normal.batches[0], 'total')?.fullScore, 300)
assert.equal(metric(normal.batches[0], 'english')?.value, 60)
assert.equal(metric(normal.batches[0], 'computer')?.value, 70)
console.log('✓ HTML 标准表头')

const noHeader = await htmlTableParser.parse({
  parserId: 'html-table@1',
  content: fixture('no-header.html'),
  contentType: 'text/html',
  url: context.sourceUrl,
  context
})
assert.equal(noHeader.batches.length, 1)
assert.equal(metric(noHeader.batches[0], 'total')?.value, 160)
assert.equal(metric(noHeader.batches[0], 'chinese')?.value, 65)
console.log('✓ HTML 缺表头')

const changed = await htmlTableParser.parse({
  parserId: 'html-table@1',
  content: fixture('changed.html'),
  contentType: 'text/html',
  url: context.sourceUrl,
  context
})
assert.equal(changed.batches.length, 1)
assert.equal(metric(changed.batches[0], 'total')?.value, 190)
const minimum = changed.batches[0].metrics.find((item) => item.isMinimum)
assert.ok(minimum, '录取最低分应单独标记')
assert.equal(minimum?.minimumType, 'admit')
console.log('✓ HTML 格式变化 + 最低分标记')

assert.deepEqual(parseScore('320/500'), { value: 320, fullScore: 500 })
assert.deepEqual(parseScore('３２０ 分'), { value: 320, fullScore: null })
assert.equal(parseScore('—'), null)
assert.equal(parseScore(''), null)
const textMetrics = metricsFromText('总分 273\n英语（一） 38\n政治 50\n总分 312 录取最低分')
assert.equal(textMetrics.find((item) => item.subjectCode === 'total')?.value, 273)
assert.equal(textMetrics.find((item) => item.subjectCode === 'english1')?.value, 38)
assert.equal(textMetrics.find((item) => item.minimumType === 'admit')?.value, 312)
console.log('✓ 分数解析 + 纯文本科目识别')

const workbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.aoa_to_sheet([
    ['科目', '分数', '满分'],
    ['总分', 200, 300],
    ['英语', 70, 100]
  ]),
  '分数线'
)
const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
const excel = await xlsxParser.parse({
  parserId: 'xlsx@1',
  content: buffer,
  contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  url: context.sourceUrl,
  context
})
assert.equal(excel.batches.length, 1)
assert.equal(metric(excel.batches[0], 'total')?.value, 200)
assert.equal(metric(excel.batches[0], 'english')?.value, 70)
console.log('✓ Excel 解析')

const json = await jsonParser.parse({
  parserId: 'json@1',
  content: JSON.stringify({
    batches: [
      {
        scope: 'provincial',
        exam: 'upgrade',
        year: 2025,
        province: '浙江',
        metrics: [{ subjectName: '总分', value: 180, fullScore: 300 }]
      }
    ]
  }),
  contentType: 'application/json',
  url: context.sourceUrl,
  context
})
assert.equal(json.batches.length, 1)
assert.equal(json.batches[0].metrics[0].value, 180)
console.log('✓ JSON 解析')

const empty = await htmlTableParser.parse({
  parserId: 'html-table@1',
  content: '<html><body><p>没有表格</p></body></html>',
  contentType: 'text/html',
  url: context.sourceUrl,
  context
})
assert.equal(empty.batches.length, 0)
assert.ok(empty.issues.length > 0, '没有表格时要明确失败，不返回空批次冒充成功')
console.log('✓ 解析失败明确报错')

const direct = rowsToMetrics([['科目', '分数'], ['总分', '100']])
assert.equal(direct.metrics.length, 1)
console.log('\n分数线解析器用例全部通过')
