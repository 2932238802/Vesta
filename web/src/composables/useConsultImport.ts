import { ref, watch, type Ref } from 'vue'
import {
  api,
  type AdminSubmissionDetail,
  type AdminSubmissionSummary
} from '@/api'
import { confirmAction } from '@/useConfirm'

interface ConsultImportOptions {
  profile: Ref<string>
  userName: Ref<string>
  flash: (message: string) => void
}

export function useConsultImport(options: ConsultImportOptions) {
  const importOpen = ref(false)
  const importLoading = ref(false)
  const importError = ref('')
  const importSearch = ref('')
  const importSubmissions = ref<AdminSubmissionSummary[]>([])
  const importingSubmissionId = ref('')

  let importTimer: ReturnType<typeof setTimeout> | undefined

  watch(importSearch, () => {
    if (!importOpen.value) return
    if (importTimer) clearTimeout(importTimer)
    importTimer = setTimeout(() => void loadImportSubmissions(), 280)
  })

  async function openImport() {
    importOpen.value = true
    importError.value = ''
    await loadImportSubmissions()
  }

  function closeImport() {
    if (importingSubmissionId.value) return
    importOpen.value = false
    importError.value = ''
  }

  async function loadImportSubmissions() {
    importLoading.value = true
    importError.value = ''
    try {
      const result = await api.submissions({ q: importSearch.value.trim() })
      importSubmissions.value = result.submissions
    } catch (error) {
      importError.value = error instanceof Error ? error.message : '读取答卷失败'
    } finally {
      importLoading.value = false
    }
  }

  function profileFromSubmission(detail: AdminSubmissionDetail): string {
    const lines: string[] = []
    if (detail.note) lines.push(`备注：${detail.note}`)
    if (detail.channel) lines.push(`渠道：${detail.channel}`)
    lines.push(`问卷结果：${detail.total} 分（${detail.tier} 档）`)

    for (const group of detail.groups) {
      const answers = detail.answers.filter((answer) => answer.group === group.title && answer.value)
      if (!answers.length) continue
      lines.push('', `【${group.title}】`)
      for (const answer of answers) {
        lines.push(`${answer.code} ${answer.title}：${answer.value}`)
      }
    }
    return lines.join('\n').trim()
  }

  async function importSubmission(item: AdminSubmissionSummary) {
    if (options.profile.value.trim()) {
      const ok = await confirmAction({
        title: '覆盖来访者情况',
        message: '导入会用这份答卷覆盖当前“来访者情况”。',
        confirmText: '覆盖导入',
        cancelText: '取消',
        danger: true
      })
      if (!ok) return
    }
    importingSubmissionId.value = item.id
    importError.value = ''
    try {
      const detail = await api.submission(item.id)
      options.profile.value = profileFromSubmission(detail)
      if (!options.userName.value.trim()) options.userName.value = detail.name
      importOpen.value = false
      options.flash('问卷内容已导入')
    } catch (error) {
      importError.value = error instanceof Error ? error.message : '导入失败'
    } finally {
      importingSubmissionId.value = ''
    }
  }

  return {
    importOpen,
    importLoading,
    importError,
    importSearch,
    importSubmissions,
    importingSubmissionId,
    openImport,
    closeImport,
    importSubmission
  }
}
