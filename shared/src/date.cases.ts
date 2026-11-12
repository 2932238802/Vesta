import assert from 'node:assert/strict'
import { describeDistance, isOlderThanMonths } from './date'

interface DistanceCase {
  name: string
  from: string
  to: string
  expected: string
}

/** 交付用时间距离用例表；运行：npx tsx shared/src/date.cases.ts */
export const DISTANCE_CASES: DistanceCase[] = [
  { name: '同一天', from: '2026-11-12', to: '2026-11-12', expected: '今天' },
  { name: '不足一个月', from: '2026-11-12', to: '2026-11-30', expected: '不到一个月' },
  { name: '1—11 个月', from: '2026-11-12', to: '2027-02-12', expected: '3 个月' },
  { name: '跨年 12 个月', from: '2025-12-31', to: '2026-12-31', expected: '一年' },
  { name: '整年', from: '2024-01-01', to: '2025-01-01', expected: '一年' },
  { name: '一年半', from: '2026-11-12', to: '2028-05-12', expected: '一年半' },
  { name: '整两年', from: '2024-01-01', to: '2026-01-01', expected: '两年' },
  { name: '整三年', from: '2026-11-12', to: '2029-11-12', expected: '三年' },
  { name: '闰日到次年 2 月 28 日', from: '2024-02-29', to: '2025-02-28', expected: '11 个月' },
  { name: '闰日到次年 3 月 1 日', from: '2024-02-29', to: '2025-03-01', expected: '一年' },
  { name: '1 月 31 日到下个月月底', from: '2024-01-31', to: '2024-02-29', expected: '不到一个月' },
  { name: '1 月 31 日到 3 月 31 日', from: '2024-01-31', to: '2024-03-31', expected: '2 个月' },
  { name: '1 月 31 日到 4 月 30 日', from: '2024-01-31', to: '2024-04-30', expected: '2 个月' },
  { name: '跨年 11 月 30 日到 2 月 28 日', from: '2024-11-30', to: '2025-02-28', expected: '2 个月' },
  { name: '同月同日跨一年', from: '2024-05-01', to: '2025-05-01', expected: '一年' },
  { name: '过去不足一个月', from: '2026-11-12', to: '2026-11-01', expected: '已过去 不到一个月' },
  { name: '过去整三个月', from: '2026-01-01', to: '2025-10-01', expected: '已过去 3 个月' },
  { name: '过去整两年', from: '2026-05-01', to: '2024-05-01', expected: '已过去 两年' },
  { name: '过去整一年半', from: '2026-05-12', to: '2024-11-12', expected: '已过去 一年半' }
]

export function runDistanceCases(): void {
  for (const item of DISTANCE_CASES) {
    assert.equal(describeDistance(item.from, item.to), item.expected, item.name)
  }

  assert.equal(isOlderThanMonths('2024-01-01', 18, '2025-07-01'), true, '恰好 18 个月算旧')
  assert.equal(isOlderThanMonths('2024-01-01', 18, '2025-06-30'), false, '不足 18 个月不算旧')
  assert.equal(isOlderThanMonths('2024-01-01', 18, '2024-12-31'), false, '未来日期不算旧')
}

const directRun = process.argv[1]?.replace(/\\/g, '/').endsWith('/shared/src/date.cases.ts')
if (directRun) {
  runDistanceCases()
  console.log(`时间距离用例通过：${DISTANCE_CASES.length} 组 + 3 组旧岗位边界`)
}
