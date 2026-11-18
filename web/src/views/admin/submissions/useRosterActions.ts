import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, type AdminRosterRow, type ConsultResult } from '@/api'
import type { RowMenuItem } from '@/components/row-menu'
import { confirmAction } from '@/useConfirm'
import { inviteUrl, writeClipboard } from './rosterMeta'
import type { RosterState } from './useRoster'

export interface RosterGroupHooks {
  openPickGroups(inviteIds: string[]): void
  removeFromGroup(rows: AdminRosterRow[]): void | Promise<void>
}

export function useRosterActions(state: RosterState, groupHooks?: RosterGroupHooks) {
  const router = useRouter()
  const { q, selected, archiveSelected, category, groupId, load, flash } = state

  const exporting = ref(false)
  const savingStatus = ref('')
  // 正在保存的单元格（`邀请id:字段`），只锁当前行控件，避免连点。
  const savingCell = ref('')
  const deletingId = ref('')
  const deletingInviteId = ref('')
  const batchDeleting = ref(false)

  async function removeIds(ids: string[]) {
    if (ids.length === 0) return
    const ok = await confirmAction({
      title: '批量删除记录',
      message: `删除选中的 ${ids.length} 条记录？答卷、报告和邀请链接都会一起删掉，删完不能恢复。`,
      confirmText: '删除',
      danger: true
    })
    if (!ok) return
    batchDeleting.value = true
    try {
      await api.batchDeleteRoster(ids)
      selected.value = new Set()
      archiveSelected.value = new Set()
      await load()
      flash(`已删除 ${ids.length} 条记录`)
    } catch (err) {
      flash(err instanceof Error ? err.message : '批量删除失败')
    } finally {
      batchDeleting.value = false
    }
  }

  async function removeSelected() {
    await removeIds([...selected.value])
  }

  async function removeArchiveSelected() {
    await removeIds([...archiveSelected.value])
  }

  async function copyLink(row: AdminRosterRow) {
    await writeClipboard(inviteUrl(row.token))
    flash('链接已复制')
  }

  function openInvite(row: AdminRosterRow) {
    window.open(inviteUrl(row.token), '_blank')
  }

  function openRow(row: AdminRosterRow, event: MouseEvent | KeyboardEvent) {
    if (!row.detailPath) return
    const target = event.target as HTMLElement | null
    if (
      target?.closest(
        'a, button, input, select, textarea, label, [data-row-ignore], [role="menu"], [role="menuitem"]'
      )
    ) {
      return
    }
    void router.push(row.detailPath)
  }

  function rowMenuItems(row: AdminRosterRow): RowMenuItem[] {
    const groupItems: RowMenuItem[] = [{ key: 'add-group', label: '加入分组…' }]
    if (groupId.value && row.groups.length > 0) {
      groupItems.push({ key: 'remove-group', label: '移出本组' })
    }
    if (row.submissionId) {
      const items: RowMenuItem[] = [...groupItems]
      if (row.detailPath) items.push({ key: 'detail', label: '查看答卷' })
      if (row.reportPath) items.push({ key: 'report', label: '打开报告' })
      items.push({
        key: 'delete-submission',
        label: deletingId.value === row.id ? '删除中…' : '删除答卷',
        danger: true,
        disabled: !!deletingId.value
      })
      return items
    }
    const items: RowMenuItem[] = [...groupItems]
    if (row.stage === 'expired') items.push({ key: 'rotate', label: '换新链接' })
    items.push({ key: 'copy', label: '复制链接' })
    if (row.stage !== 'expired') items.push({ key: 'open', label: '打开' })
    items.push({
      key: 'delete-invite',
      label: deletingInviteId.value === row.id ? '删除中…' : '删除记录',
      danger: true,
      disabled: !!deletingInviteId.value
    })
    return items
  }

  async function onRowMenu(row: AdminRosterRow, key: string) {
    if (key === 'add-group') {
      groupHooks?.openPickGroups([row.id])
    } else if (key === 'remove-group') {
      await groupHooks?.removeFromGroup([row])
    } else if (key === 'detail') {
      if (row.detailPath) void router.push(row.detailPath)
    } else if (key === 'report') {
      if (row.reportPath) window.open(row.reportPath, '_blank', 'noopener')
    } else if (key === 'copy') {
      await copyLink(row)
    } else if (key === 'open') {
      openInvite(row)
    } else if (key === 'rotate') {
      await rotate(row)
    } else if (key === 'delete-submission') {
      await removeSubmission(row)
    } else if (key === 'delete-invite') {
      await removeInvite(row)
    }
  }

  async function removeInvite(row: AdminRosterRow) {
    const who = row.name || '这条邀请记录'
    const ok = await confirmAction({
      title: '删除记录',
      message: `删除「${who}」这条记录？删除后链接失效，列表里不再显示。已提交的答卷不受影响，请先删答卷。`,
      confirmText: '删除',
      danger: true
    })
    if (!ok) return
    deletingInviteId.value = row.id
    try {
      await api.deleteInvite(row.inviteId)
      await load()
      flash('记录已删除')
    } catch (err) {
      flash(err instanceof Error ? err.message : '删除失败')
    } finally {
      deletingInviteId.value = ''
    }
  }

  async function removeSubmission(row: AdminRosterRow) {
    if (!row.submissionId) return
    const who = row.name || '这位学员'
    const ok = await confirmAction({
      title: '删除答卷',
      message: `删除「${who}」的答卷和报告？删除后这条邀请链接会回到「已打开」，可以重新填写。`,
      confirmText: '删除答卷',
      danger: true
    })
    if (!ok) return
    deletingId.value = row.id
    try {
      await api.deleteSubmission(row.submissionId)
      await load()
      flash('答卷已删除')
    } catch (err) {
      flash(err instanceof Error ? err.message : '删除失败')
    } finally {
      deletingId.value = ''
    }
  }

  async function rotate(row: AdminRosterRow) {
    const ok = await confirmAction({
      title: '换新链接',
      message: `给「${row.name || '这位学员'}」换一条新链接？旧链接会立即失效。`,
      confirmText: '换新链接'
    })
    if (!ok) return
    try {
      const result = await api.rotateInvite(row.inviteId)
      await writeClipboard(`${location.origin}${result.path}`)
      await load()
      flash('已换新链接并复制')
    } catch (err) {
      flash(err instanceof Error ? err.message : '操作失败')
    }
  }

  async function changeStatus(row: AdminRosterRow, event: Event) {
    if (!row.submissionId) return
    const target = event.target as HTMLSelectElement
    const value = target.value
    const previous = row.contactStatus ?? 'new'
    if (value === previous) return

    savingStatus.value = row.id
    try {
      await api.patchSubmission(row.submissionId, { contactStatus: value })
      await load()
      flash('联系状态已更新')
    } catch (err) {
      target.value = previous
      flash(err instanceof Error ? err.message : '更新失败')
    } finally {
      savingStatus.value = ''
    }
  }

  async function toggleConsulted(row: AdminRosterRow, event: Event) {
    const target = event.target as HTMLInputElement
    const next = target.checked
    const previousResult = row.consultResult
    if (!next && previousResult) {
      const ok = await confirmAction({
        title: '取消咨询标记',
        message: '取消后咨询结果会清空，确定吗？',
        confirmText: '取消标记',
        danger: true
      })
      if (!ok) {
        target.checked = true
        return
      }
    }

    savingCell.value = `${row.id}:consulted`
    row.consulted = next
    if (!next) row.consultResult = ''
    try {
      await api.patchRoster(row.inviteId, { consulted: next })
      await load()
      flash(next ? '已标记咨询' : '已取消咨询')
    } catch (err) {
      target.checked = !next
      row.consulted = !next
      row.consultResult = previousResult
      flash(err instanceof Error ? err.message : '更新失败')
      await load()
    } finally {
      savingCell.value = ''
    }
  }

  async function changeConsultResult(row: AdminRosterRow, event: Event) {
    const target = event.target as HTMLSelectElement
    const value = target.value as ConsultResult | ''
    const previous = row.consultResult
    if (value === previous) return

    savingCell.value = `${row.id}:consultResult`
    row.consultResult = value
    try {
      await api.patchRoster(row.inviteId, { consultResult: value })
      flash('咨询结果已更新')
    } catch (err) {
      row.consultResult = previous
      target.value = previous
      flash(err instanceof Error ? err.message : '更新失败')
    } finally {
      savingCell.value = ''
    }
  }

  async function changePriority(row: AdminRosterRow, event: Event) {
    const target = event.target as HTMLInputElement
    const value = target.value.trim().slice(0, 20)
    target.value = value
    const previous = row.priority
    if (value === previous) return

    savingCell.value = `${row.id}:priority`
    row.priority = value
    try {
      await api.patchRoster(row.inviteId, { priority: value })
      flash('优先级已更新')
    } catch (err) {
      row.priority = previous
      target.value = previous
      flash(err instanceof Error ? err.message : '更新失败')
    } finally {
      savingCell.value = ''
    }
  }

  async function exportCsv() {
    exporting.value = true
    try {
      const blob = await api.exportSubmissions({
        q: q.value.trim(),
        category: category.value
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `vesta-submissions-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      flash(err instanceof Error ? err.message : '导出失败')
    } finally {
      exporting.value = false
    }
  }

  return {
    exporting,
    savingStatus,
    savingCell,
    deletingId,
    deletingInviteId,
    batchDeleting,
    removeSelected,
    removeArchiveSelected,
    copyLink,
    openInvite,
    openRow,
    rowMenuItems,
    onRowMenu,
    removeInvite,
    removeSubmission,
    rotate,
    changeStatus,
    toggleConsulted,
    changeConsultResult,
    changePriority,
    exportCsv
  }
}
