import { ref } from 'vue'
import { api, type AdminRosterGroup, type AdminRosterRow } from '@/api'
import { confirmAction } from '@/useConfirm'
import type { RosterState } from './useRoster'

export type GroupDialogMode = 'manage' | 'pick'

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export function useRosterGroups(state: RosterState) {
  const groupDialogOpen = ref(false)
  const groupDialogMode = ref<GroupDialogMode>('manage')
  const groupTargetIds = ref<string[]>([])
  const groupSaving = ref(false)
  const groupDeletingId = ref('')

  function openCreateGroup() {
    groupDialogMode.value = 'manage'
    groupTargetIds.value = []
    groupDialogOpen.value = true
  }

  function openManageGroups() {
    groupDialogMode.value = 'manage'
    groupTargetIds.value = []
    groupDialogOpen.value = true
  }

  function openPickGroups(inviteIds: string[]) {
    if (inviteIds.length === 0) return
    groupDialogMode.value = 'pick'
    groupTargetIds.value = [...new Set(inviteIds)]
    groupDialogOpen.value = true
  }

  function closeGroupDialog() {
    groupDialogOpen.value = false
    groupTargetIds.value = []
  }

  /** 新建后切到新组；失败只提示，不动现有名单。 */
  async function createGroup(name: string): Promise<boolean> {
    const trimmed = name.trim().slice(0, 24)
    if (!trimmed) {
      state.flash('分组名称不能为空')
      return false
    }
    groupSaving.value = true
    try {
      const result = await api.createRosterGroup(trimmed)
      closeGroupDialog()
      state.flash(`已新建分组「${result.group.name}」`)
      state.selectGroup(result.group.id)
      return true
    } catch (err) {
      state.flash(errorText(err, '新建分组失败'))
      return false
    } finally {
      groupSaving.value = false
    }
  }

  /** 加入分组弹窗里的「新建并加入」：组创建成功但加入失败时，组保留。 */
  async function createGroupAndJoin(name: string) {
    const trimmed = name.trim().slice(0, 24)
    if (!trimmed) {
      state.flash('分组名称不能为空')
      return
    }
    const ids = groupTargetIds.value
    groupSaving.value = true
    let group: AdminRosterGroup
    try {
      group = (await api.createRosterGroup(trimmed)).group
    } catch (err) {
      state.flash(errorText(err, '新建分组失败'))
      groupSaving.value = false
      return
    }
    await joinGroup(group.id, ids, group.name)
  }

  async function joinGroup(groupId: string, ids: string[], groupName: string) {
    groupSaving.value = true
    try {
      const result = await api.addRosterGroupMembers(groupId, ids)
      closeGroupDialog()
      state.removeFromSelections(ids)
      await state.load()
      state.flash(
        result.added > 0 ? `已加入「${groupName}」${result.added} 人` : `这些人已在「${groupName}」里`
      )
    } catch (err) {
      state.flash(errorText(err, '加入分组失败'))
    } finally {
      groupSaving.value = false
    }
  }

  async function assignSelected(groupId: string) {
    if (!groupId) return
    // 选“全部”时实际写入隐藏的默认组，提示文案仍用“全部”。
    const isAll = groupId === state.defaultGroupId.value
    const group = state.groups.value.find((item) => item.id === groupId)
    await joinGroup(groupId, groupTargetIds.value, isAll ? '全部' : group?.name ?? '分组')
  }

  function rowsByIds(ids: string[]): AdminRosterRow[] {
    const wanted = new Set(ids)
    return [...state.roster.value, ...state.archive.value].filter((row) => wanted.has(row.id))
  }

  async function removeRows(rows: AdminRosterRow[]) {
    const groupId = state.groupId.value
    if (!groupId || rows.length === 0) return
    const onlyHere = rows.filter((row) => row.groups.length <= 1).length
    const message =
      onlyHere > 0
        ? `移出选中的 ${rows.length} 人？其中 ${onlyHere} 人没有其他分组，会进入归档。`
        : `移出选中的 ${rows.length} 人？他们仍在其他分组里。`
    const ok = await confirmAction({
      title: '移出分组',
      message,
      confirmText: '移出'
    })
    if (!ok) return

    const ids = rows.map((row) => row.id)
    groupSaving.value = true
    try {
      const result = await api.removeRosterGroupMembers(groupId, ids)
      state.removeFromSelections(ids)
      await state.load()
      state.flash(
        result.archived > 0
          ? `已移出 ${result.removed} 人，其中 ${result.archived} 人进入归档`
          : `已移出 ${result.removed} 人`
      )
    } catch (err) {
      state.flash(errorText(err, '移出分组失败'))
    } finally {
      groupSaving.value = false
    }
  }

  async function removeSelectedFromCurrentGroup() {
    await removeRows(rowsByIds([...state.selected.value]))
  }

  async function deleteGroup(group: AdminRosterGroup) {
    const ok = await confirmAction({
      title: '删除分组',
      message: `删除分组「${group.name}」？组内共 ${group.totalCount} 人，只在组内的人会进入归档，学员和答卷不会被删除。`,
      confirmText: '删除分组',
      danger: true
    })
    if (!ok) return

    groupDeletingId.value = group.id
    try {
      const result = await api.deleteRosterGroup(group.id)
      if (state.groupId.value === group.id) state.selectGroup('')
      else await state.load()
      state.flash(
        result.archived > 0
          ? `已删除分组，${result.archived} 人进入归档`
          : `已删除分组「${group.name}」`
      )
    } catch (err) {
      state.flash(errorText(err, '删除分组失败'))
    } finally {
      groupDeletingId.value = ''
    }
  }

  return {
    groupDialogOpen,
    groupDialogMode,
    groupTargetIds,
    groupSaving,
    groupDeletingId,
    openCreateGroup,
    openManageGroups,
    openPickGroups,
    closeGroupDialog,
    createGroup,
    createGroupAndJoin,
    assignSelected,
    removeSelectedFromCurrentGroup,
    removeFromCurrentGroup: removeRows,
    deleteGroup
  }
}

export type RosterGroupsState = ReturnType<typeof useRosterGroups>
