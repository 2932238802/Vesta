import assert from 'node:assert/strict'
import { currentCycleKey, cycleLabel, cycleRange, cycleStartKey } from './cycle'

interface CycleCase {
  name: string
  at: string
  expected: string
}

/** 交付用期次边界用例；运行：npx tsx shared/src/cycle.cases.ts */
export const CYCLE_CASES: CycleCase[] = [
  { name: '周三 00:00 是新一期起点', at: '2026-11-10T16:00:00Z', expected: '2026-11-11' },
  { name: '周二 23:59:59 属于上一期', at: '2026-11-10T15:59:59Z', expected: '2026-11-04' },
  { name: '下周二 23:59:59 仍是本期尾巴', at: '2026-11-17T15:59:59Z', expected: '2026-11-11' },
  { name: '下周三 00:00 进入下一期', at: '2026-11-17T16:00:00Z', expected: '2026-11-18' },
  { name: '周四落在本期', at: '2026-11-12T04:00:00Z', expected: '2026-11-11' },
  { name: '周五落在本期', at: '2026-11-13T04:00:00Z', expected: '2026-11-11' },
  { name: '周六落在本期', at: '2026-11-14T04:00:00Z', expected: '2026-11-11' },
  { name: '周日落在本期', at: '2026-11-15T04:00:00Z', expected: '2026-11-11' },
  { name: '周一落在本期', at: '2026-11-16T04:00:00Z', expected: '2026-11-11' },
  { name: '周二落在本期', at: '2026-11-17T04:00:00Z', expected: '2026-11-11' },
  { name: '跨月 10/21 周三', at: '2026-10-21T04:00:00Z', expected: '2026-10-21' },
  { name: '跨月 10/28 周三', at: '2026-10-28T04:00:00Z', expected: '2026-10-28' },
  { name: '跨年 12/30 周三', at: '2026-12-30T04:00:00Z', expected: '2026-12-30' },
  { name: '时区：UTC 字符串按上海墙钟归期', at: '2026-11-10T16:30:00Z', expected: '2026-11-11' },
  { name: '邀请时间决定归期，提交晚不跳期', at: '2026-11-12T04:00:00Z', expected: '2026-11-11' }
]

for (const item of CYCLE_CASES) {
  assert.equal(cycleStartKey(item.at), item.expected, item.name)
}

assert.deepEqual(cycleRange('2026-11-11'), { start: '2026-11-11', end: '2026-11-17' })
assert.deepEqual(cycleRange('2026-10-28'), { start: '2026-10-28', end: '2026-11-03' })
assert.equal(cycleLabel('2026-11-11'), '11/11–11/17')
assert.equal(cycleLabel('2026-10-28'), '10/28–11/03')
assert.equal(cycleLabel('2026-12-30'), '12/30–01/05')
assert.equal(cycleStartKey('not-a-date'), '')
assert.equal(cycleRange('not-a-date').start, '')
assert.equal(currentCycleKey(new Date('2026-11-10T16:30:00Z')), '2026-11-11')

console.log(`周期用例通过：${CYCLE_CASES.length} 组 + 区间 / 文案 / 无效输入 / 当前期次`)
