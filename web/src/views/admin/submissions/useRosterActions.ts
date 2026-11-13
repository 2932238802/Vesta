import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, type AdminRosterRow } from '@/api'
import type { RowMenuItem } from '@/components/row-menu'
import { confirmAction } from '@/useConfirm'
import { inviteUrl, writeClipboard } from './rosterMeta'
import type { RosterState } from './useRoster'

export function useRosterActions(state: RosterState) {
  const router = useRouter()
  const { q, selected, week, category, load, flash } = state

  const exporting = ref(false)
  const savingStatus = ref('')
  const deletingId = ref('')
  const deletingInviteId = ref('')
  const batchDeleting = ref(false)

  async function removeSelected() {
    const ids = [...selected.value]
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
      await load()
      flash(`已删除 ${ids.length} 条记录`)
    } catch (err) {
      flash(err instanceof Error ? err.message : '批量删除失败')
    } finally {
      batchDeleting.value = false
    }
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
    if (row.submissionId) {
      const items: RowMenuItem[] = []
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
    const items: RowMenuItem[] = []
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
    if (key === 'detail') {
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

  async function exportCsv() {
    exporting.value = true
    try {
      const blob = await api.exportSubmissions({
        q: q.value.trim(),
        week: week.value,
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
    deletingId,
    deletingInviteId,
    batchDeleting,
    removeSelected,
    copyLink,
    openInvite,
    openRow,
    rowMenuItems,
    onRowMenu,
    removeInvite,
    removeSubmission,
    rotate,
    changeStatus,
    exportCsv
  }
}
