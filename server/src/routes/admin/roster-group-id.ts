export interface RosterGroupChoice {
  id: string
  is_default: number
}

/**
 * 名单只允许按用户自建分组筛选。默认组在界面隐藏，旧链接带入默认组 id 时
 * 按“全部”处理（返回空串），避免出现“有过滤但没有任何 chip 选中”的隐形状态。
 */
export function selectRosterGroupId(
  groups: readonly RosterGroupChoice[],
  requestedGroupId: string
): string {
  if (!requestedGroupId) return ''
  const group = groups.find((item) => item.id === requestedGroupId)
  return group && !group.is_default ? group.id : ''
}
