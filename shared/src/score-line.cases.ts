import assert from 'node:assert/strict'
import {
  SCORELINE_HISTORY_YEARS,
  SCORELINE_MAX_IMPORT_BATCHES,
  batchChecksum,
  normalizeImportBatch,
  resolveSubject,
  validateImportPayload
} from './score-line'
import type { ExamType } from './score-line'
import {
  POSTGRAD_TRACKS,
  UPGRADE_TRACKS,
  normalizeDimension
} from './score-line-dimension'
import type { DimensionKind } from './score-line-dimension'
import { normalizeProvince, provinceRegion, provinces } from './score-line-region'

// 31 个省级地区 + A/B 区
assert.equal(provinces.length, 31)
assert.equal(new Set(provinces.map((item) => item.name)).size, 31, '省份不能重复')
assert.equal(normalizeProvince('浙江省'), '浙江')
assert.equal(normalizeProvince(' 内蒙古自治区 '), '内蒙古')
assert.equal(normalizeProvince('广西壮族自治区'), '广西')
assert.equal(normalizeProvince('北京市'), '北京')
assert.equal(normalizeProvince('新疆维吾尔自治区'), '新疆')
assert.equal(normalizeProvince('香港特别行政区'), '')
assert.equal(provinceRegion('浙江'), 'A区')
assert.equal(provinceRegion('广东省'), 'A区')
assert.equal(provinceRegion('内蒙古'), 'B区')
assert.equal(provinceRegion('新疆维吾尔自治区'), 'B区')
assert.equal(provinceRegion(''), '')
const aCount = provinces.filter((item) => provinceRegion(item.name) === 'A区').length
const bCount = provinces.filter((item) => provinceRegion(item.name) === 'B区').length
assert.equal(aCount, 21, 'A 区 21 个省级地区')
assert.equal(bCount, 10, 'B 区 10 个省级地区')
assert.equal(SCORELINE_HISTORY_YEARS, 10)
console.log('✓ 省份 / A-B 区 / 历史年限')

// 科目归一化
const subjects: [string, string][] = [
  ['总分线', 'total'],
  ['总成绩', 'total'],
  ['思想政治理论', 'politics'],
  ['英语（一）', 'english1'],
  ['英语二', 'english2'],
  ['数学（二）', 'math2'],
  ['业务课一', 'major1'],
  ['专业课二', 'major2'],
  ['大学英语', 'english'],
  ['计算机基础', 'computer'],
  ['大学语文', 'chinese'],
  ['高等数学', 'math'],
  ['专业综合', 'major']
]
for (const [input, expected] of subjects) {
  assert.equal(resolveSubject(input)?.code, expected, `${input} → ${expected}`)
}
assert.equal(resolveSubject('不存在的科目'), null)
console.log('✓ 科目 code 归一化')

// 批次 / 科类字典：按考试分表，别名归一，认不出不猜
assert.equal(POSTGRAD_TRACKS.length, 14, '考研 14 个学科门类')
assert.equal(UPGRADE_TRACKS.length, 13, '专升本 13 个科类')
const dimensionCases: [DimensionKind, ExamType, string, string][] = [
  ['category', 'postgrad', '学硕', '学硕'],
  ['category', 'postgrad', '学术学位', '学硕'],
  ['category', 'postgrad', '学硕类', '学硕'],
  ['category', 'postgrad', '专业学位', '专硕'],
  ['category', 'upgrade', '建档立卡', '建档立卡'],
  ['category', 'upgrade', '退役大学生士兵', '退役士兵'],
  ['category', 'upgrade', '免试生', '免试'],
  ['track', 'upgrade', '文史类', '文史'],
  ['track', 'upgrade', '经济管理类', '经管'],
  ['track', 'upgrade', '教育学', '教育'],
  ['track', 'postgrad', '工学（学硕）', '工学'],
  ['track', 'postgrad', '医学[10]⑥', '医学'],
  ['track', 'postgrad', '交叉学科', '交叉学科']
]
for (const [kind, exam, input, expected] of dimensionCases) {
  assert.deepEqual(
    normalizeDimension(kind, exam, input),
    { value: expected, matched: true },
    `${exam} ${kind}：${input} → ${expected}`
  )
}
const dimensionMisses: [DimensionKind, ExamType, string][] = [
  ['track', 'postgrad', '文史'],
  ['track', 'upgrade', '理学'],
  ['category', 'postgrad', '普通类'],
  ['track', 'postgrad', '认不出的词'],
  ['category', 'upgrade', '']
]
for (const [kind, exam, input] of dimensionMisses) {
  assert.deepEqual(
    normalizeDimension(kind, exam, input),
    { value: '', matched: false },
    `${exam} ${kind}：${input || '(空)'} 不应猜`
  )
}
console.log('✓ 批次 / 科类字典与归一化（含考试分表、正反例）')

const validBatch = {
  scope: 'program',
  exam: 'postgrad',
  year: 2025,
  province: '浙江',
  schoolId: 'sch_1',
  programId: 'prg_1',
  category: '学硕',
  track: '工学',
  title: '2025 示例大学计算机学硕复试线',
  sourceName: '示例大学研究生院',
  sourceUrl: 'https://example.com/line',
  metrics: [
    { subjectCode: 'total', subjectName: '总分', fullScore: 500, value: 320 },
    { subjectName: '政治', fullScore: 100, value: 50 },
    { subjectName: '英语（一）', fullScore: 100, value: 50 },
    { subjectName: '总分', fullScore: 500, value: 312, isMinimum: 1, minimumType: 'admit' }
  ]
}

function expectOk(name: string, payload: unknown) {
  assert.deepEqual(validateImportPayload(payload), [], `${name} 应通过`)
}
function expectError(name: string, payload: unknown, expected: string) {
  const errors = validateImportPayload(payload)
  assert.ok(errors.some((item) => item.includes(expected)), `${name} 应包含「${expected}」，实际 ${errors.join(' / ')}`)
}

expectOk('合法导入', { batches: [validBatch] })
expectOk('国家线不绑院校', {
  batches: [{ ...validBatch, scope: 'national', schoolId: '', programId: '', province: '' }]
})
expectError('空批次', { batches: [] }, '至少导入一条分数线')
expectError('批次过多', { batches: Array(SCORELINE_MAX_IMPORT_BATCHES + 1).fill(validBatch) }, '一次最多导入')
expectError('范围非法', { batches: [{ ...validBatch, scope: 'other' }] }, '范围需为')
expectError('考试非法', { batches: [{ ...validBatch, exam: 'cet' }] }, '考试类型需为')
expectError('年份越界', { batches: [{ ...validBatch, year: 1999 }] }, '年份需在 2000–2100')
expectError('缺省份', { batches: [{ ...validBatch, province: '' }] }, '请选择省份')
expectError('专业线缺专业', { batches: [{ ...validBatch, programId: '' }] }, '专业线需要院校和专业')
expectError('国家线绑院校', { batches: [{ ...validBatch, scope: 'national' }] }, '国家线不能绑定院校或专业')
expectError('空指标', { batches: [{ ...validBatch, metrics: [] }] }, '至少一条指标')
expectError('指标过多', { batches: [{ ...validBatch, metrics: Array(101).fill(validBatch.metrics[0]) }] }, '最多 100')
expectError('科目认不出', { batches: [{ ...validBatch, metrics: [{ subjectName: '玄学科目', value: 50 }] }] }, '科目认不出')
expectError('负分', { batches: [{ ...validBatch, metrics: [{ subjectName: '总分', value: -1 }] }] }, '分数需在 0–1000')
expectError('超过满分', {
  batches: [{ ...validBatch, metrics: [{ subjectName: '总分', fullScore: 300, value: 301 }] }]
}, '分数不能大于满分')
expectError('最低分缺类型', {
  batches: [{ ...validBatch, metrics: [{ subjectName: '总分', value: 300, isMinimum: 1 }] }]
}, '最低分必须标明')
expectError('非最低分带类型', {
  batches: [{ ...validBatch, metrics: [{ subjectName: '总分', value: 300, minimumType: 'admit' }] }]
}, '非最低分不能带最低分类型')
expectError('重复指标', {
  batches: [{ ...validBatch, metrics: [{ subjectName: '总分', value: 300 }, { subjectCode: 'total', value: 301 }] }]
}, '同一科目和最低分类型重复')
expectError('链接协议', { batches: [{ ...validBatch, sourceUrl: 'ftp://example.com' }] }, '来源链接需以')
expectError('标题超长', { batches: [{ ...validBatch, title: 'x'.repeat(201) }] }, '标题最多 200')
console.log('✓ 导入校验正反例')

const normalized = normalizeImportBatch(validBatch)
assert.equal(normalized.province, '浙江')
assert.equal(normalized.region, 'A区')
assert.equal(normalized.metrics[0].subjectCode, 'total')
assert.equal(normalized.metrics[1].subjectCode, 'politics')
assert.equal(normalized.metrics[2].subjectCode, 'english1')
assert.equal(normalized.metrics[3].isMinimum, 1)
assert.equal(normalized.metrics[3].minimumType, 'admit')
assert.equal(normalized.confidence, 1)

const checksumA = batchChecksum(normalized)
const reordered = normalizeImportBatch({ ...validBatch, metrics: [...validBatch.metrics].reverse() })
assert.equal(batchChecksum(reordered), checksumA, 'checksum 不应受指标顺序影响')
assert.notEqual(
  batchChecksum(normalizeImportBatch({ ...validBatch, year: 2026 })),
  checksumA,
  '年份变化应改变 checksum'
)
console.log('✓ 归一化与 checksum 稳定性')

console.log('\n分数线 v3 共享用例全部通过')
