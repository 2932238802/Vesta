import { computed, onMounted, reactive, ref } from 'vue'
import type { Answers, Question, Survey } from '@shared/types'
import { branchCoverageWarnings, validateSurvey } from '@shared/validate'
import { api } from '@/api'
import { useSaveHotkey } from '@/useHotkeys'
import { useUnsavedChanges } from '@/useUnsavedChanges'

/** 问卷设置页的本地状态与编辑动作；页面与子组件共用同一份数据。 */
export function useSurveyEditor() {
  const survey = ref<Survey | null>(null)
  const versions = ref(0)
  const loading = ref(true)
  const saving = ref(false)
  const error = ref('')
  const toast = ref('')
  const tab = ref<'questions' | 'meta'>('questions')
  const selected = ref<{ kind: 'group' | 'question'; id: string } | null>(null)
  const initialJson = ref('')
  const previewOpen = ref(false)
  const previewAnswers = reactive<Answers>({})

  const selectedQuestion = computed<Question | null>(() => {
    if (!survey.value || selected.value?.kind !== 'question') return null
    return survey.value.questions.find((q) => q.id === selected.value!.id) ?? null
  })

  const selectedGroup = computed(() => {
    if (!survey.value || selected.value?.kind !== 'group') return null
    return survey.value.groups.find((g) => g.id === selected.value!.id) ?? null
  })

  const dirty = computed(
    () => Boolean(survey.value) && JSON.stringify(survey.value) !== initialJson.value
  )

  useUnsavedChanges(dirty, '问卷还有未保存的修改，确定离开？')
  useSaveHotkey(() => {
    if (dirty.value && !saving.value) void save()
  }, () => dirty.value && !saving.value)

  function questionsOf(groupId: string): Question[] {
    return survey.value?.questions.filter((q) => q.groupId === groupId) ?? []
  }

  function select(kind: 'group' | 'question', id: string) {
    selected.value = { kind, id }
  }

  onMounted(async () => {
    try {
      const result = await api.survey()
      survey.value = structuredClone(result.survey)
      versions.value = result.versions
      initialJson.value = JSON.stringify(survey.value)
      selected.value = { kind: 'group', id: result.survey.groups[0]?.id ?? '' }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '读取失败'
    } finally {
      loading.value = false
    }
  })

  async function save() {
    if (!survey.value) return
    error.value = ''
    const errors = validateSurvey(survey.value)
    if (errors.length) {
      error.value = errors[0]
      return
    }
    saving.value = true
    try {
      const result = await api.saveSurvey(survey.value)
      survey.value = structuredClone(result.survey)
      initialJson.value = JSON.stringify(survey.value)
      versions.value += 1
      const warnings = branchCoverageWarnings(result.survey)
      flash(
        warnings.length
          ? `已发布 v${result.survey.version}；${warnings.join('；')}`
          : `已发布 v${result.survey.version}`
      )
    } catch (err) {
      error.value = err instanceof Error ? err.message : '保存失败'
    } finally {
      saving.value = false
    }
  }

  function discard() {
    if (!initialJson.value) return
    survey.value = JSON.parse(initialJson.value) as Survey
    error.value = ''
    flash('已放弃未保存的修改')
  }

  function addGroup() {
    if (!survey.value) return
    const id = `g_${Date.now().toString(36)}`
    const code = String.fromCharCode(65 + survey.value.groups.length)
    survey.value.groups.push({ id, code, title: '新的分组', subtitle: '' })
    select('group', id)
  }

  function removeGroup(id: string) {
    if (!survey.value) return
    if (questionsOf(id).length > 0) {
      flash('先删掉这个分组里的题目')
      return
    }
    if (survey.value.groups.length <= 1) {
      flash('至少保留一个分组')
      return
    }
    if (!confirm('删除这个分组？')) return
    survey.value.groups = survey.value.groups.filter((g) => g.id !== id)
    if (selected.value?.id === id) {
      selected.value = { kind: 'group', id: survey.value.groups[0].id }
    }
  }

  function moveGroup(id: string, dir: number) {
    if (!survey.value) return
    const list = survey.value.groups
    const index = list.findIndex((g) => g.id === id)
    const target = index + dir
    if (index < 0 || target < 0 || target >= list.length) return
    ;[list[index], list[target]] = [list[target], list[index]]
  }

  function addQuestion(groupId: string) {
    if (!survey.value) return
    const id = `q_${Date.now().toString(36)}`
    const code = `Q${survey.value.questions.length + 1}`
    const question: Question = {
      id,
      code,
      groupId,
      title: '新的题目',
      type: 'single',
      required: true,
      options: [
        { id: `${id}_1`, label: '选项一', score: 1 },
        { id: `${id}_2`, label: '选项二', score: 2 }
      ]
    }
    survey.value.questions.push(question)
    select('question', id)
  }

  function removeQuestion(id: string) {
    if (!survey.value) return
    if (!confirm('删除这道题？')) return
    survey.value.questions = survey.value.questions.filter((q) => q.id !== id)
    if (selected.value?.id === id) {
      selected.value = { kind: 'group', id: survey.value.groups[0]?.id ?? '' }
    }
  }

  function moveQuestion(id: string, dir: number) {
    if (!survey.value) return
    const question = survey.value.questions.find((q) => q.id === id)
    if (!question) return
    const list = questionsOf(question.groupId)
    const index = list.findIndex((q) => q.id === id)
    const target = list[index + dir]
    if (!target) return
    const a = survey.value.questions.findIndex((q) => q.id === id)
    const b = survey.value.questions.findIndex((q) => q.id === target.id)
    const questions = survey.value.questions
    ;[questions[a], questions[b]] = [questions[b], questions[a]]
  }

  function onTypeChange() {
    const question = selectedQuestion.value
    if (!question) return
    if (
      (question.type === 'single' || question.type === 'choiceText' || question.type === 'multi') &&
      !question.options?.length
    ) {
      question.options = [
        { id: `${question.id}_1`, label: '选项一', score: 1 },
        { id: `${question.id}_2`, label: '选项二', score: 2 }
      ]
    }
    if (question.type === 'multi' && !question.maxSelect) question.maxSelect = 6
    if (question.type === 'matrix') {
      question.scale = question.scale ?? 5
      if (!question.rows?.length) {
        question.rows = [
          { id: `${question.id}_1`, label: '评分项一' },
          { id: `${question.id}_2`, label: '评分项二' }
        ]
      }
    }
  }

  function addRow() {
    const question = selectedQuestion.value
    if (!question) return
    const rows = question.rows ?? (question.rows = [])
    rows.push({
      id: `${question.id}_${Date.now().toString(36)}`,
      label: `评分项 ${rows.length + 1}`
    })
  }

  function removeRow(id: string) {
    const question = selectedQuestion.value
    const rows = question?.rows
    if (!rows || rows.length <= 2) return
    question.rows = rows.filter((row) => row.id !== id)
  }

  function setRowDimension(
    row: { dimension?: string },
    value: string
  ) {
    if (value) row.dimension = value
    else delete row.dimension
  }

  function setScale(value: string) {
    const question = selectedQuestion.value
    if (!question) return
    question.scale = value === '' ? 5 : Math.min(Math.max(Number(value), 2), 10)
  }

  function toggleRating(event: Event) {
    const question = selectedQuestion.value
    if (!question) return
    const checked = (event.target as HTMLInputElement).checked
    if (checked) {
      question.display = 'rating'
      question.anchors = question.anchors ?? { low: '', high: '' }
      if (!question.options?.length) {
        question.options = [1, 2, 3, 4, 5].map((n) => ({
          id: `${question.id}_${n}`,
          label: `${n} 分`,
          score: n
        }))
      }
    } else {
      delete question.display
      delete question.anchors
    }
  }

  function setAnchor(key: 'low' | 'high', value: string) {
    const question = selectedQuestion.value
    if (!question) return
    question.anchors = { low: '', high: '', ...(question.anchors ?? {}), [key]: value }
  }

  function addOption() {
    const question = selectedQuestion.value
    if (!question) return
    question.options = question.options ?? []
    const index = question.options.length + 1
    question.options.push({
      id: `${question.id}_${Date.now().toString(36)}`,
      label: `选项 ${index}`,
      score: index
    })
  }

  function removeOption(id: string) {
    const question = selectedQuestion.value
    if (!question?.options || question.options.length <= 2) return
    question.options = question.options.filter((o) => o.id !== id)
  }

  function setOptionScore(option: { score: number | null }, value: string) {
    option.score = value === '' ? null : Number(value)
  }

  function setMaxSelect(value: string) {
    const question = selectedQuestion.value
    if (!question) return
    if (value === '') delete question.maxSelect
    else question.maxSelect = Math.max(1, Number(value))
  }

  function setFields(value: string) {
    const question = selectedQuestion.value
    if (!question) return
    const fields = value
      .split(/[,，]/)
      .map((field) => field.trim())
      .filter(Boolean)
    if (fields.length) question.fields = fields
    else delete question.fields
  }

  function setDimension(value: string) {
    const question = selectedQuestion.value
    if (!question) return
    if (value) question.dimension = value
    else delete question.dimension
  }

  function setRole(value: string) {
    const question = selectedQuestion.value
    if (!question) return
    if (value === 'self' || value === 'behavior' || value === 'context') question.role = value
    else delete question.role
  }

  function addDimension() {
    if (!survey.value) return
    const key = `d_${Date.now().toString(36)}`
    survey.value.dimensions.push({ key, name: '新的维度', weight: 10 })
  }

  function removeDimension(key: string) {
    if (!survey.value) return
    const used = survey.value.questions.some((q) => q.dimension === key)
    if (used) {
      flash('先把关联题目改成其他维度')
      return
    }
    if (!confirm('删除这个维度？')) return
    survey.value.dimensions = survey.value.dimensions.filter((d) => d.key !== key)
  }

  function flash(message: string) {
    toast.value = message
    setTimeout(() => {
      toast.value = ''
    }, 1800)
  }

  return {
    survey,
    versions,
    loading,
    saving,
    error,
    toast,
    tab,
    selected,
    previewOpen,
    previewAnswers,
    selectedQuestion,
    selectedGroup,
    dirty,
    questionsOf,
    select,
    save,
    discard,
    addGroup,
    removeGroup,
    moveGroup,
    addQuestion,
    removeQuestion,
    moveQuestion,
    onTypeChange,
    addRow,
    removeRow,
    setRowDimension,
    setScale,
    toggleRating,
    setAnchor,
    addOption,
    removeOption,
    setOptionScore,
    setMaxSelect,
    setFields,
    setDimension,
    setRole,
    addDimension,
    removeDimension,
    flash
  }
}

export type SurveyEditorActions = ReturnType<typeof useSurveyEditor>
