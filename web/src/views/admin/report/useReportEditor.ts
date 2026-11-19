import { computed, onMounted, ref } from 'vue'
import type { ModuleKey, ReportPayload, ReportTemplate, Survey } from '@shared/types'
import { validateTemplate } from '@shared/validate'
import { api } from '@/api'
import { useSaveHotkey } from '@/useHotkeys'
import { useUnsavedChanges } from '@/useUnsavedChanges'

const MODULE_LABELS: Record<ModuleKey, string> = {
  hero: '一句话诊断',
  target: '目标与距离',
  radar: '九维雷达图',
  strengths: '三项最高分',
  gaps: '三项最低分',
  consistency: '自评与行为对照',
  cognition: '认知提示',
  actions: '接下来 30 天'
}

export const salaryBands = [
  { key: 'a7_1', label: '3000 以下' },
  { key: 'a7_2', label: '3000 到 5000' },
  { key: 'a7_3', label: '5000 到 8000' },
  { key: 'a7_4', label: '8000 到 12000' },
  { key: 'a7_5', label: '12000 以上' }
]

export function moduleLabel(key: ModuleKey): string {
  return MODULE_LABELS[key] ?? key
}

/** 报告设置页的本地状态、保存与预览；页面和子组件共用同一份模板对象。 */
export function useReportEditor() {
  const template = ref<ReportTemplate | null>(null)
  const survey = ref<Survey | null>(null)
  const loading = ref(true)
  const saving = ref(false)
  const previewing = ref(false)
  const error = ref('')
  const toast = ref('')
  const tab = ref<'copy' | 'theme' | 'dimensions' | 'claim'>('copy')
  const initialJson = ref('')
  const previewOpen = ref(false)
  const preview = ref<ReportPayload | null>(null)
  const previewError = ref('')

  const dirty = computed(
    () => Boolean(template.value) && JSON.stringify(template.value) !== initialJson.value
  )

  useUnsavedChanges(dirty, '报告设置还有未保存的修改，确定离开？')
  useSaveHotkey(() => {
    if (dirty.value && !saving.value) void save()
  }, () => dirty.value && !saving.value)

  const dimensionRows = computed(() => {
    const value = template.value
    if (!value) return []
    const names = new Map((survey.value?.dimensions ?? []).map((d) => [d.key, d.name]))
    return Object.keys(value.dimensions).map((key) => ({
      key,
      name: names.get(key) ?? key
    }))
  })

  const previewStyle = computed<Record<string, string>>(() => ({
    '--accent': preview.value?.theme.accent ?? '#2f5d46',
    '--paper': preview.value?.theme.paper ?? '#f7f4ed'
  }))

  onMounted(async () => {
    try {
      const [templateResult, surveyResult] = await Promise.all([api.template(), api.survey()])
      template.value = structuredClone(templateResult.template)
      survey.value = surveyResult.survey
      initialJson.value = JSON.stringify(template.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '读取失败'
    } finally {
      loading.value = false
    }
  })

  function flash(message: string) {
    toast.value = message
    window.setTimeout(() => {
      if (toast.value === message) toast.value = ''
    }, 2200)
  }

  function addFallback() {
    template.value?.copy.actions.fallback.push('补一条 30 天内能验证的动作')
  }

  function removeFallback(index: number) {
    template.value?.copy.actions.fallback.splice(index, 1)
  }

  async function save() {
    const value = template.value
    if (!value) return
    error.value = ''
    const errors = validateTemplate(value)
    if (errors.length) {
      error.value = errors[0]
      return
    }
    saving.value = true
    try {
      const result = await api.saveTemplate(value)
      template.value = structuredClone(result.template)
      initialJson.value = JSON.stringify(template.value)
      flash(`已保存 v${result.template.version}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '保存失败'
    } finally {
      saving.value = false
    }
  }

  function discard() {
    if (!initialJson.value) return
    template.value = JSON.parse(initialJson.value) as ReportTemplate
    error.value = ''
    flash('已放弃未保存的修改')
  }

  async function openPreview() {
    if (!template.value) return
    previewError.value = ''
    preview.value = null
    previewOpen.value = true
    previewing.value = true
    try {
      preview.value = await api.previewReport({
        template: template.value,
        survey: survey.value ?? undefined
      })
    } catch (err) {
      previewError.value = err instanceof Error ? err.message : '预览失败'
    } finally {
      previewing.value = false
    }
  }

  return {
    template,
    survey,
    loading,
    saving,
    previewing,
    error,
    toast,
    tab,
    previewOpen,
    preview,
    previewError,
    dirty,
    dimensionRows,
    previewStyle,
    moduleLabel,
    addFallback,
    removeFallback,
    save,
    discard,
    openPreview
  }
}

export type ReportEditorActions = ReturnType<typeof useReportEditor>
