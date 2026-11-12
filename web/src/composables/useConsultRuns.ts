import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  api,
  type ConsultBeat,
  type ConsultBeatKind,
  type ConsultContext,
  type ConsultOutcome,
  type ConsultRun,
  type ConsultRunSection
} from '@/api'
import { confirmAction } from '@/useConfirm'
import { useUnsavedChanges } from '@/useUnsavedChanges'

export interface PurposeTemplateSummary {
  id: string
  name: string
  season: string
  description: string
  stats: { purposes: number; optional: number; gaps: number }
}

export interface ConsultAiState {
  configured: boolean
  model: string
}

export function useConsultRuns() {
  const loading = ref(true)
  const loadingRuns = ref(false)
  const loadError = ref('')
  const actionError = ref('')
  const busy = ref(false)
  const feedbackBusy = ref(false)
  const purposeTemplates = ref<PurposeTemplateSummary[]>([])
  const activePurposeTemplateId = ref('')
  const purposeTemplateId = ref('')
  const userName = ref('')
  const profile = ref('')
  const targetLength = ref(30000)
  const runs = ref<ConsultRun[]>([])
  const selectedRunId = ref('')
  const toast = ref('')
  const ai = ref<ConsultAiState>({ configured: false, model: '' })
  const openSectionSeq = ref(0)
  const dirtySections = ref<Record<number, boolean>>({})
  const pendingOptions = ref<Record<number, string>>({})
  const moduleBusy = ref(0)
  const savingSeq = ref(0)
  const editorError = ref('')
  const exporting = ref<'' | 'docx' | 'html' | 'txt'>('')
  const historyCollapsed = ref(localStorage.getItem('vesta.consult.history.collapsed') === '1')

  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let pollRunId = ''

  const selectedRun = computed(() => runs.value.find((run) => run.id === selectedRunId.value) ?? null)
  const anyDirty = computed(() => Object.values(dirtySections.value).some(Boolean))
  const savingAll = ref(false)

  useUnsavedChanges(anyDirty, '咨询稿还有未保存的模块修改，确定离开？')

  function context(): ConsultContext {
    return {
      name: userName.value.trim(),
      profile: profile.value.trim()
    }
  }

  async function load() {
    loading.value = true
    loadError.value = ''
    try {
      const result = await api.consult()
      purposeTemplates.value = result.purposeTemplates
      activePurposeTemplateId.value = result.activePurposeTemplateId
      purposeTemplateId.value = result.activePurposeTemplateId || result.purposeTemplates[0]?.id || ''
      ai.value = result.ai
      await loadRuns(false)
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : '读取失败'
    } finally {
      loading.value = false
    }
  }

  async function loadRuns(showError = true) {
    loadingRuns.value = true
    try {
      const result = await api.consultRuns()
      runs.value = result.runs
      if (!selectedRunId.value && result.runs.length) {
        selectRun(result.runs[0])
        if (result.runs[0].status === 'queued' || result.runs[0].status === 'running') {
          startPolling(result.runs[0].id)
        }
      }
    } catch (error) {
      if (showError) actionError.value = error instanceof Error ? error.message : '读取历史失败'
    } finally {
      loadingRuns.value = false
    }
  }

  async function selectRun(run: ConsultRun) {
    selectedRunId.value = run.id
    openSectionSeq.value = 0
    editorError.value = ''
    try {
      const result = await api.consultRun(run.id)
      if (selectedRunId.value !== run.id) return
      replaceRun(result.run)
      openSectionSeq.value = result.run.sections.find((section) => section.status === 'ready')?.seq ?? 0
    } catch (error) {
      if (selectedRunId.value === run.id) {
        editorError.value = error instanceof Error ? error.message : '读取模块失败'
      }
    }
  }

  // 再点一次选中的记录就收起详情，避免历史多了以后一直挂着一大块内容。
  function toggleRun(run: ConsultRun) {
    if (selectedRunId.value === run.id) {
      collapseRun()
      return
    }
    void selectRun(run)
  }

  function collapseRun() {
    selectedRunId.value = ''
    openSectionSeq.value = 0
  }

  function toggleHistory() {
    historyCollapsed.value = !historyCollapsed.value
    localStorage.setItem('vesta.consult.history.collapsed', historyCollapsed.value ? '1' : '0')
  }

  async function exportRun(format: 'docx' | 'html' | 'txt') {
    const run = selectedRun.value
    if (!run || exporting.value) return
    exporting.value = format
    editorError.value = ''
    try {
      const blob = await api.exportConsultRun(run.id, format)
      const name = (run.context.name || '').trim().replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 24)
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const filename = `咨询稿${name ? `-${name}` : ''}-${date}.${format}`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      flash(`${format === 'docx' ? 'Word' : format.toUpperCase()} 已导出`)
    } catch (error) {
      editorError.value = error instanceof Error ? error.message : '导出失败'
    } finally {
      exporting.value = ''
    }
  }

  function replaceRun(run: ConsultRun) {
    const index = runs.value.findIndex((item) => item.id === run.id)
    if (index >= 0) runs.value[index] = run
    else runs.value = [run, ...runs.value]
    dirtySections.value = {}
    pendingOptions.value = {}
  }

  function toggleSection(seq: number) {
    openSectionSeq.value = openSectionSeq.value === seq ? 0 : seq
  }

  function collapseModules() {
    openSectionSeq.value = 0
  }

  function markDirty(seq: number) {
    dirtySections.value = { ...dirtySections.value, [seq]: true }
  }

  function selectOption(section: ConsultRunSection, optionId: string) {
    const next = { ...pendingOptions.value }
    if (optionId === section.selectedOptionId) delete next[section.seq]
    else next[section.seq] = optionId
    pendingOptions.value = next
  }

  function sectionPayload(section: ConsultRunSection) {
    const modular = section.options.length > 0 || section.beats.length > 0
    return modular
      ? {
          title: section.title,
          goal: section.goal,
          notes: section.notes,
          beats: section.beats
        }
      : {
          title: section.title,
          goal: section.goal,
          notes: section.notes,
          content: section.content
        }
  }

  async function saveSection(section: ConsultRunSection) {
    const run = selectedRun.value
    if (!run) return
    savingSeq.value = section.seq
    editorError.value = ''
    try {
      const result = await api.saveConsultSection(run.id, section.seq, sectionPayload(section))
      replaceRun(result.run)
      openSectionSeq.value = section.seq
      flash('本模块已保存')
    } catch (error) {
      editorError.value = error instanceof Error ? error.message : '保存模块失败'
    } finally {
      savingSeq.value = 0
    }
  }

  async function saveAll() {
    const run = selectedRun.value
    if (!run || savingAll.value) return
    const pending = run.sections
      .filter((section) => dirtySections.value[section.seq])
      .map((section) => ({ seq: section.seq, body: sectionPayload(section) }))
    if (!pending.length) return
    savingAll.value = true
    editorError.value = ''
    try {
      let latest = run
      for (const job of pending) {
        const result = await api.saveConsultSection(run.id, job.seq, job.body)
        latest = result.run
      }
      replaceRun(latest)
      openSectionSeq.value = pending.at(-1)?.seq ?? openSectionSeq.value
      flash('已保存全部修改')
    } catch (error) {
      editorError.value = error instanceof Error ? error.message : '保存模块失败'
    } finally {
      savingAll.value = false
    }
  }

  async function discardChanges() {
    const run = selectedRun.value
    if (!run) return
    try {
      const result = await api.consultRun(run.id)
      if (selectedRunId.value !== run.id) return
      replaceRun(result.run)
      flash('已放弃未保存的修改')
    } catch (error) {
      editorError.value = error instanceof Error ? error.message : '读取模块失败'
    }
  }

  async function rewriteByOption(section: ConsultRunSection) {
    const run = selectedRun.value
    const optionId = pendingOptions.value[section.seq]
    if (!run || !optionId) return
    if (dirtySections.value[section.seq]) {
      const ok = await confirmAction({
        title: '覆盖未保存的修改',
        message: '本模块还有没保存的修改，按新打法重写会覆盖。',
        confirmText: '继续重写',
        cancelText: '取消',
        danger: true
      })
      if (!ok) return
    }
    moduleBusy.value = section.seq
    editorError.value = ''
    try {
      const result = await api.rewriteConsultSectionBeats(run.id, section.seq, optionId)
      replaceRun(result.run)
      openSectionSeq.value = section.seq
      flash('已按新打法重写本模块')
    } catch (error) {
      editorError.value = error instanceof Error ? error.message : '重写模块失败'
    } finally {
      moduleBusy.value = 0
    }
  }

  async function regenerateSection(section: ConsultRunSection) {
    const run = selectedRun.value
    if (!run) return
    const ok = await confirmAction({
      title: '重新生成模块',
      message: '重新给三种打法会覆盖这个模块现在的节拍。',
      confirmText: '重新生成',
      cancelText: '取消',
      danger: true
    })
    if (!ok) return
    moduleBusy.value = section.seq
    editorError.value = ''
    try {
      const result = await api.regenerateConsultSection(run.id, section.seq)
      replaceRun(result.run)
      openSectionSeq.value = section.seq
      flash('这个模块已重新生成')
    } catch (error) {
      editorError.value = error instanceof Error ? error.message : '重写模块失败'
    } finally {
      moduleBusy.value = 0
    }
  }

  async function addSection(afterSeq?: number) {
    const run = selectedRun.value
    if (!run) return
    editorError.value = ''
    try {
      const result = await api.addConsultSection(run.id, { afterSeq })
      replaceRun(result.run)
      openSectionSeq.value = (afterSeq ?? result.run.sections.at(-1)?.seq ?? 0) + 1
      flash('已加一个空模块')
    } catch (error) {
      editorError.value = error instanceof Error ? error.message : '新增模块失败'
    }
  }

  async function deleteSection(section: ConsultRunSection) {
    const run = selectedRun.value
    if (!run) return
    const ok = await confirmAction({
      title: '删除模块',
      message: `删除“${section.title}”？这个模块的节拍会一起删掉。`,
      confirmText: '删除',
      cancelText: '取消',
      danger: true
    })
    if (!ok) return
    editorError.value = ''
    try {
      const result = await api.deleteConsultSection(run.id, section.seq)
      replaceRun(result.run)
      openSectionSeq.value = Math.max(0, section.seq - 1)
      flash('模块已删除')
    } catch (error) {
      editorError.value = error instanceof Error ? error.message : '删除模块失败'
    }
  }

  function addBeat(section: ConsultRunSection, kind: ConsultBeatKind) {
    const beat: ConsultBeat = {
      id: `local_${Date.now().toString(36)}_${section.beats.length}`,
      kind,
      text: '',
      when: kind === 'branch' ? '如果她说……' : undefined
    }
    section.beats.push(beat)
    markDirty(section.seq)
  }

  function removeBeat(section: ConsultRunSection, index: number) {
    section.beats.splice(index, 1)
    markDirty(section.seq)
  }

  function stopPolling() {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = undefined
    pollRunId = ''
  }

  function startPolling(runId: string) {
    if (pollRunId === runId && pollTimer) return
    stopPolling()
    pollRunId = runId
    const poll = async () => {
      if (pollRunId !== runId) return
      try {
        const result = await api.consultRun(runId)
        replaceRun(result.run)
        if (result.run.status === 'queued' || result.run.status === 'running') {
          pollTimer = setTimeout(poll, 2000)
          return
        }
        stopPolling()
        busy.value = false
        if (result.run.status === 'ready') {
          flash('咨询稿已生成')
        } else {
          actionError.value = result.run.error || '这次生成失败了，可以重试'
        }
      } catch (error) {
        stopPolling()
        busy.value = false
        actionError.value = error instanceof Error ? error.message : '读取生成进度失败'
      }
    }
    busy.value = true
    void poll()
  }

  async function generate() {
    actionError.value = ''
    if (!purposeTemplateId.value) {
      actionError.value = '咨询树还没有可用模板，请先生成咨询树数据'
      return
    }
    busy.value = true
    try {
      const result = await api.generateConsult({
        context: context(),
        targetLength: targetLength.value,
        mode: 'purpose',
        purposeTemplateId: purposeTemplateId.value
      })
      if (result.run) {
        replaceRun(result.run)
        selectRun(result.run)
        startPolling(result.run.id)
      } else {
        busy.value = false
      }
    } catch (error) {
      actionError.value = error instanceof Error ? error.message : '生成失败'
      busy.value = false
    }
  }

  async function retryRun() {
    if (!selectedRun.value) return
    actionError.value = ''
    busy.value = true
    try {
      const result = await api.retryConsultRun(selectedRun.value.id)
      replaceRun(result.run)
      startPolling(result.run.id)
    } catch (error) {
      actionError.value = error instanceof Error ? error.message : '重试失败'
      busy.value = false
    }
  }

  async function recordOutcome(outcome: Exclude<ConsultOutcome, ''>) {
    const run = selectedRun.value
    if (!run || run.outcome) return
    feedbackBusy.value = true
    actionError.value = ''
    try {
      const result = await api.setConsultOutcome(run.id, { outcome })
      const index = runs.value.findIndex((item) => item.id === run.id)
      if (index >= 0) {
        runs.value[index] = {
          ...runs.value[index],
          outcome: result.outcome,
          outcomeNodeId: result.outcomeNodeId,
          outcomeAt: new Date().toISOString()
        }
      }
      flash('反馈已记录，系统以后会选得更准')
    } catch (error) {
      actionError.value = error instanceof Error ? error.message : '记录失败'
    } finally {
      feedbackBusy.value = false
    }
  }

  async function copyOutput() {
    if (!selectedRun.value?.output) return
    if (Object.values(dirtySections.value).some(Boolean)) {
      flash('有模块还没保存，先保存再复制全文')
      return
    }
    try {
      await navigator.clipboard.writeText(selectedRun.value.output)
      flash('咨询稿已复制')
    } catch {
      flash('复制失败，请手动选择文字')
    }
  }

  function flash(message: string) {
    toast.value = message
    setTimeout(() => {
      toast.value = ''
    }, 2000)
  }

  onMounted(load)
  onUnmounted(stopPolling)

  return {
    loading,
    loadingRuns,
    loadError,
    actionError,
    busy,
    feedbackBusy,
    purposeTemplates,
    activePurposeTemplateId,
    purposeTemplateId,
    userName,
    profile,
    targetLength,
    runs,
    selectedRunId,
    selectedRun,
    toast,
    ai,
    openSectionSeq,
    dirtySections,
    pendingOptions,
    anyDirty,
    moduleBusy,
    savingSeq,
    editorError,
    exporting,
    savingAll,
    historyCollapsed,
    load,
    loadRuns,
    selectRun,
    toggleRun,
    collapseRun,
    toggleHistory,
    exportRun,
    toggleSection,
    collapseModules,
    markDirty,
    selectOption,
    saveSection,
    saveAll,
    discardChanges,
    rewriteByOption,
    regenerateSection,
    addSection,
    deleteSection,
    addBeat,
    removeBeat,
    generate,
    retryRun,
    recordOutcome,
    copyOutput,
    flash
  }
}
