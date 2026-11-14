import assert from 'node:assert/strict'
import {
  normalizeScoreLineInput,
  scoreLineCategories,
  validateScoreLineInput
} from './score-line'

const valid = {
  categoryId: 'postgrad',
  title: '2026 考研国家线（A 区）',
  year: 2026,
  region: 'A 区',
  sourceName: '教育部',
  sourceUrl: 'https://example.com/official',
  note: '',
  entries: [
    { label: '总分', value: 273, maxValue: 500 },
    { label: '英语一', value: 38, maxValue: 100 }
  ]
}

function expectOk(name: string, input: unknown) {
  const errors = validateScoreLineInput(input)
  assert.deepEqual(errors, [], `${name}：应通过，实际 ${errors.join(' / ')}`)
}

function expectError(name: string, input: unknown, expected: string) {
  const errors = validateScoreLineInput(input)
  assert.ok(errors.includes(expected), `${name}：应包含「${expected}」，实际 ${errors.join(' / ')}`)
}

expectOk('最小合法输入', valid)
expectOk('年份留空', { ...valid, year: 0 })
expectOk('可选字段留空', {
  categoryId: 'cet',
  title: '2026 年 6 月四级',
  year: 2026,
  sourceName: '中国教育考试网',
  entries: [{ label: '总分', value: 425 }]
})

expectError('缺标题', { ...valid, title: '' }, '请填写标题')
expectError('标题超长', { ...valid, title: 'x'.repeat(121) }, '标题最多 120 个字')
expectError('未知类型', { ...valid, categoryId: 'unknown' }, '请选择分数线类型')
expectError('年份越界', { ...valid, year: 1999 }, '年份需在 2000–2100 之间，或留空')
expectError('年份非整数', { ...valid, year: 2026.5 }, '年份需在 2000–2100 之间，或留空')
expectError('地区超长', { ...valid, region: 'x'.repeat(21) }, '地区最多 20 个字')
expectError('缺来源', { ...valid, sourceName: '' }, '请填写来源')
expectError('来源超长', { ...valid, sourceName: 'x'.repeat(81) }, '来源最多 80 个字')
expectError('链接协议不对', { ...valid, sourceUrl: 'ftp://example.com' }, '来源链接需以 http:// 或 https:// 开头')
expectError('说明超长', { ...valid, note: 'x'.repeat(501) }, '说明最多 500 个字')
expectError('条目为空', { ...valid, entries: [] }, '至少填写一条分数线')
expectError(
  '条目超 100',
  { ...valid, entries: Array.from({ length: 101 }, () => ({ label: '总分', value: 1 })) },
  '最多 100 条分数线'
)
expectError('条目名为空', { ...valid, entries: [{ label: '', value: 1 }] }, '第 1 条：名称不能为空')
expectError(
  '条目名超长',
  { ...valid, entries: [{ label: 'x'.repeat(41), value: 1 }] },
  '第 1 条：名称最多 40 个字'
)
expectError('分数为 NaN', { ...valid, entries: [{ label: '总分', value: Number.NaN }] }, '第 1 条：分数需在 0–1000 之间')
expectError('分数为负', { ...valid, entries: [{ label: '总分', value: -1 }] }, '第 1 条：分数需在 0–1000 之间')
expectError('分数超 1000', { ...valid, entries: [{ label: '总分', value: 1001 }] }, '第 1 条：分数需在 0–1000 之间')
expectError(
  '满分小于分数',
  { ...valid, entries: [{ label: '总分', value: 500, maxValue: 400 }] },
  '第 1 条：分数不能大于满分'
)
expectError(
  '满分为 0',
  { ...valid, entries: [{ label: '总分', value: 0, maxValue: 0 }] },
  '第 1 条：满分需大于 0 且不超过 1000'
)
expectError(
  '备注超长',
  { ...valid, entries: [{ label: '总分', value: 1, note: 'x'.repeat(101) }] },
  '第 1 条：备注最多 100 个字'
)
expectError('非对象输入', null, '请求格式不对')

const normalized = normalizeScoreLineInput({
  categoryId: ' postgrad ',
  title: ' 2026 考研国家线 ',
  year: '2026',
  sourceName: '教育部',
  entries: [{ label: ' 总分 ', value: '273', maxValue: '500' }, { label: '英语一', value: 38 }]
})
assert.equal(normalized.categoryId, 'postgrad')
assert.equal(normalized.title, '2026 考研国家线')
assert.equal(normalized.year, 2026)
assert.equal(normalized.region, '')
assert.equal(normalized.entries[0].maxValue, 500)
assert.equal(normalized.entries[1].maxValue, undefined)

assert.ok(scoreLineCategories.length >= 5, '首批类型不少于 5 个')
assert.equal(new Set(scoreLineCategories.map((item) => item.id)).size, scoreLineCategories.length, '类型 id 不能重复')

console.log(`分数线校验用例通过：${scoreLineCategories.length} 个类型，合法 / 非法 / 归一化用例全部通过`)
