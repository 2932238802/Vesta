import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'
import { htmlTableParser } from './html'
import { decodeHtml, extractRedirect } from './html-shape'
import { categoryBatchesFromRows } from './category-table'
import { followTarget, selectCandidates } from '../discovery'
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

// 浙江真实页面：引导页 / 栏目页（2026-11-14 抓取快照）
const guide = await htmlTableParser.parse({
  parserId: 'html-table@1',
  content: fixture('zj-guide.html'),
  contentType: 'text/html',
  url: 'https://www.zjzs.net/',
  context
})
assert.equal(guide.batches.length, 0)
assert.equal(guide.failure?.code, 'no_table')
assert.ok(guide.redirect?.includes('/col/col27/index.html'), '引导页要能读出 onclick 跳转')
console.log('✓ 浙江引导页：0 表 + entry 跳转')

const column = await htmlTableParser.parse({
  parserId: 'html-table@1',
  content: fixture('zj-column.html'),
  contentType: 'text/html',
  url: 'https://www.zjzs.net/col/col48/index.html',
  context
})
assert.equal(column.batches.length, 0)
assert.equal(column.shape?.tables, 2)
assert.ok(
  column.linkItems?.some((item) => item.url.includes('/art/2026/5/7/art_49_12241.html')),
  '栏目页要发现 2026 分数线公告'
)
console.log('✓ 浙江栏目页：发现 2026 分数线公告')

const gbk = new TextEncoder().encode('中文')
const gbkBytes = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4])
assert.equal(decodeHtml(gbkBytes, 'text/html; charset=gbk'), '中文')
assert.equal(decodeHtml(gbk, 'text/html'), '中文')
console.log('✓ 编码：content-type 优先，回退 UTF-8')

assert.equal(
  extractRedirect(
    '<meta http-equiv="refresh" content="0; url=/a/index.html">',
    'https://example.com/'
  ),
  'https://example.com/a/index.html'
)
assert.equal(
  extractRedirect('<script>location.href = "/b/index.html"</script>', 'https://example.com/'),
  'https://example.com/b/index.html'
)
assert.equal(
  extractRedirect(
    '<div onclick="window.open(\'/c\',\'_self\')"></div>',
    'https://example.com/x/'
  ),
  'https://example.com/c'
)
console.log('✓ 引导页跳转：meta / script / onclick')

const categoryPage = await htmlTableParser.parse({
  parserId: 'html-table@1',
  content: fixture('zj-category.html'),
  contentType: 'text/html',
  url: 'https://www.zjzs.net/art/2026/5/7/art_49_12241.html',
  context
})
assert.equal(categoryPage.batches.length, 8)
assert.deepEqual(
  categoryPage.batches.map((batch) => batch.track),
  ['文史', '法学', '教育', '艺术', '理工', '经管', '农学', '医学']
)
assert.deepEqual(
  categoryPage.batches.map((batch) => batch.metrics[0].value),
  [222, 198, 226, 210, 182, 156, 214, 220]
)
assert.ok(categoryPage.batches.every((batch) => batch.scope === 'provincial'))
assert.ok(categoryPage.batches.every((batch) => batch.metrics[0].subjectCode === 'total'))
console.log('✓ 浙江公告页：类别 × 分数转置表 → 8 个批次')

const uprightCategory = categoryBatchesFromRows(
  [
    ['类别', '分数线'],
    ['文史', '222'],
    ['理工', '182'],
    ['医学', '220']
  ],
  context,
  '2026 年最低控制分数线'
)
assert.equal(uprightCategory.length, 3)
assert.equal(uprightCategory[0].track, '文史')
assert.equal(uprightCategory[0].metrics[0].value, 222)
console.log('✓ 类别表正置')

assert.equal(
  categoryBatchesFromRows(
    [
      ['文史', '法学', '教育', '艺术'],
      ['222', '198', '226', '210']
    ],
    context
  ).length,
  0,
  '缺少「分数线」行时不能猜'
)
assert.equal(
  categoryBatchesFromRows(
    [
      ['招考类别', '文史', '理工', '医学', '备注'],
      ['分数线', '222', '182', '220', '—']
    ],
    context
  ).length,
  3,
  '多一列备注不影响对齐'
)
assert.equal(categoryBatchesFromRows([], context).length, 0)
console.log('✓ 类别表缺行 / 备注列 / 空表')

const candidates = selectCandidates([
  { url: '/2025/line', text: '2025年最低控制分数线' },
  { url: '/2026/plan', text: '2026年招生计划' },
  { url: '/2026/line', text: '2026年最低控制分数线' },
  { url: '/2026/vote', text: '2026年征求志愿通告' }
])
assert.deepEqual(candidates, ['/2026/line', '/2026/plan', '/2026/vote'])
assert.equal(followTarget('/col/col27/index.html', 'https://www.zjzs.net/'), 'https://www.zjzs.net/col/col27/index.html')
assert.equal(followTarget('https://evil.example.com/x', 'https://www.zjzs.net/'), '')
console.log('✓ 发现队列：列表页取最新年 + 分数线优先 + 同域跳转')

const direct = rowsToMetrics([['科目', '分数'], ['总分', '100']])
assert.equal(direct.metrics.length, 1)
console.log('\n分数线解析器用例全部通过')
