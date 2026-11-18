import assert from 'node:assert/strict'
import { selectRosterGroupId } from './roster-group-id'

const groups = [
  { id: 'grp_default', is_default: 1 },
  { id: 'grp_a', is_default: 0 }
]

assert.equal(selectRosterGroupId(groups, ''), '')
assert.equal(selectRosterGroupId(groups, 'grp_default'), '', '默认组 id 应归一化为“全部”')
assert.equal(selectRosterGroupId(groups, 'grp_a'), 'grp_a', '用户自建组保持筛选')
assert.equal(selectRosterGroupId(groups, 'grp_unknown'), '', '非法组 id 回退“全部”')
assert.equal(selectRosterGroupId([], 'grp_a'), '', '没有有效组时回退“全部”')

console.log('✓ 名单 groupId 归一化用例通过：默认组 / 非法组 → 全部，用户组保持')
