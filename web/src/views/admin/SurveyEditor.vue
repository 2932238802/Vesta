<template>
  <div class="survey-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">问卷</p>
        <h1 class="page-title">题目、选项与计分</h1>
      </div>
      <div class="head-actions">
        <span v-if="dirty" class="chip warn">未保存</span>
        <button class="btn ghost small" type="button" @click="previewOpen = true">预览</button>
        <button class="btn small" type="button" :disabled="saving || !dirty" @click="save">
          {{ saving ? '保存中' : '保存并发布' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="card empty">正在读取问卷</div>
    <div v-else-if="!survey" class="card empty">{{ error || '问卷加载失败' }}</div>

    <template v-else>
      <p v-if="error" class="notice">{{ error }}</p>

      <div class="tabs">
        <button type="button" :class="{ on: tab === 'questions' }" @click="tab = 'questions'">
          题目
        </button>
        <button type="button" :class="{ on: tab === 'meta' }" @click="tab = 'meta'">
          维度与档位
        </button>
      </div>

      <div v-if="tab === 'questions'" class="editor-grid">
        <aside class="card builder">
          <header class="builder-head">
            <span>分组与题目</span>
            <button class="btn quiet" type="button" @click="addGroup">+ 分组</button>
          </header>

          <div v-for="group in survey.groups" :key="group.id" class="group-block">
            <div
              class="group-row"
              :class="{ on: selected?.kind === 'group' && selected.id === group.id }"
              @click="select('group', group.id)"
            >
              <span class="code">{{ group.code }}</span>
              <span class="group-title">{{ group.title }}</span>
              <span class="count">{{ questionsOf(group.id).length }}</span>
            </div>
            <div class="q-rows">
              <button
                v-for="question in questionsOf(group.id)"
                :key="question.id"
                type="button"
                class="q-row"
                :class="{ on: selected?.kind === 'question' && selected.id === question.id }"
                @click="select('question', question.id)"
              >
                <span class="code">{{ question.code }}</span>
                <span class="q-title">{{ question.title || '未命名题目' }}</span>
              </button>
              <button type="button" class="add-q" @click="addQuestion(group.id)">
                + 加一道题
              </button>
            </div>
          </div>
        </aside>

        <section class="card panel">
          <template v-if="selectedQuestion">
            <header class="panel-head">
              <div>
                <p class="eyebrow">编辑题目</p>
                <h2>{{ selectedQuestion.code }} · {{ selectedQuestion.title || '未命名' }}</h2>
              </div>
              <div class="row-actions">
                <button class="btn quiet" type="button" @click="moveQuestion(selectedQuestion.id, -1)">
                  上移
                </button>
                <button class="btn quiet" type="button" @click="moveQuestion(selectedQuestion.id, 1)">
                  下移
                </button>
                <button class="btn quiet danger-text" type="button" @click="removeQuestion(selectedQuestion.id)">
                  删除
                </button>
              </div>
            </header>

            <div class="form-grid">
              <label class="field">
                <span>题号</span>
                <input v-model="selectedQuestion.code" class="input" type="text" maxlength="12" />
              </label>
              <label class="field">
                <span>所属分组</span>
                <select v-model="selectedQuestion.groupId" class="select">
                  <option v-for="group in survey.groups" :key="group.id" :value="group.id">
                    {{ group.code }} · {{ group.title }}
                  </option>
                </select>
              </label>
              <label class="field full">
                <span>题目</span>
                <input v-model="selectedQuestion.title" class="input" type="text" maxlength="200" />
              </label>
              <label class="field full">
                <span>提示（可选）</span>
                <input v-model="selectedQuestion.hint" class="input" type="text" maxlength="200" />
              </label>
              <label class="field">
                <span>题型</span>
                <select
                  v-model="selectedQuestion.type"
                  class="select"
                  @change="onTypeChange"
                >
                  <option value="single">单选</option>
                  <option value="choiceText">单选 + 一句描述</option>
                  <option value="multi">多选</option>
                  <option value="text">文本</option>
                  <option value="number">数字</option>
                  <option value="matrix">矩阵打分</option>
                </select>
              </label>
              <label class="field">
                <span>计入维度</span>
                <select
                  :value="selectedQuestion.dimension ?? ''"
                  class="select"
                  @change="setDimension(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">不计分</option>
                  <option v-for="dim in survey.dimensions" :key="dim.key" :value="dim.key">
                    {{ dim.name }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>题目作用</span>
                <select
                  :value="selectedQuestion.role ?? ''"
                  class="select"
                  @change="setRole(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">普通</option>
                  <option value="self">自评</option>
                  <option value="behavior">行为锚点</option>
                  <option value="context">背景信息</option>
                </select>
              </label>
              <label class="field">
                <span>是否必答</span>
                <span class="check inline-check">
                  <input v-model="selectedQuestion.required" type="checkbox" />
                  必答
                </span>
              </label>
            </div>

            <div v-if="selectedQuestion.type === 'single'" class="sub-block">
              <label class="check">
                <input
                  type="checkbox"
                  :checked="selectedQuestion.display === 'rating'"
                  @change="toggleRating"
                />
                五分制刻度（1 到 5 分）
              </label>

              <div v-if="selectedQuestion.display === 'rating'" class="form-grid">
                <label class="field">
                  <span>1 分是什么样</span>
                  <input
                    :value="selectedQuestion.anchors?.low ?? ''"
                    class="input"
                    type="text"
                    @input="setAnchor('low', ($event.target as HTMLInputElement).value)"
                  />
                </label>
                <label class="field">
                  <span>5 分是什么样</span>
                  <input
                    :value="selectedQuestion.anchors?.high ?? ''"
                    class="input"
                    type="text"
                    @input="setAnchor('high', ($event.target as HTMLInputElement).value)"
                  />
                </label>
              </div>
            </div>

            <div
              v-if="
                selectedQuestion.type === 'single' ||
                selectedQuestion.type === 'choiceText' ||
                selectedQuestion.type === 'multi'
              "
              class="options-block"
            >
              <div class="options-head">
                <span>选项与分值</span>
                <button class="btn quiet" type="button" @click="addOption">+ 选项</button>
              </div>
              <div
                v-for="(option, index) in selectedQuestion.options"
                :key="option.id"
                class="option-row"
              >
                <span class="option-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <input v-model="option.label" class="input" type="text" maxlength="120" />
                <input
                  class="input score-input"
                  type="number"
                  step="0.5"
                  placeholder="不计分"
                  :value="option.score ?? ''"
                  @input="setOptionScore(option, ($event.target as HTMLInputElement).value)"
                />
                <button
                  class="btn quiet danger-text"
                  type="button"
                  :disabled="(selectedQuestion.options?.length ?? 0) <= 2"
                  @click="removeOption(option.id)"
                >
                  删除
                </button>
              </div>
            </div>

            <div v-if="selectedQuestion.type === 'choiceText'" class="sub-block">
              <div class="form-grid">
                <label class="field">
                  <span>描述标签</span>
                  <input
                    v-model="selectedQuestion.noteLabel"
                    class="input"
                    type="text"
                    maxlength="60"
                  />
                </label>
                <label class="field">
                  <span>描述提示</span>
                  <input
                    v-model="selectedQuestion.notePlaceholder"
                    class="input"
                    type="text"
                    maxlength="120"
                  />
                </label>
                <label class="field">
                  <span>其他项标签</span>
                  <input
                    v-model="selectedQuestion.otherLabel"
                    class="input"
                    type="text"
                    maxlength="60"
                  />
                </label>
                <label class="field">
                  <span>其他项提示</span>
                  <input
                    v-model="selectedQuestion.otherPlaceholder"
                    class="input"
                    type="text"
                    maxlength="120"
                  />
                </label>
              </div>
            </div>

            <div v-if="selectedQuestion.type === 'multi'" class="sub-block">
              <label class="field narrow">
                <span>最多可选</span>
                <input
                  :value="selectedQuestion.maxSelect ?? ''"
                  class="input"
                  type="number"
                  min="1"
                  @input="setMaxSelect(($event.target as HTMLInputElement).value)"
                />
              </label>
            </div>

            <div v-if="selectedQuestion.type === 'matrix'" class="sub-block">
              <div class="options-head">
                <span>评分项与关联维度</span>
                <button class="btn quiet" type="button" @click="addRow">+ 评分项</button>
              </div>
              <div
                v-for="(row, index) in selectedQuestion.rows"
                :key="row.id"
                class="option-row matrix-row-edit"
              >
                <span class="option-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <input v-model="row.label" class="input" type="text" maxlength="120" />
                <select
                  :value="row.dimension ?? ''"
                  class="select"
                  @change="setRowDimension(row, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">不关联维度</option>
                  <option v-for="dim in survey.dimensions" :key="dim.key" :value="dim.key">
                    {{ dim.name }}
                  </option>
                </select>
                <button
                  class="btn quiet danger-text"
                  type="button"
                  :disabled="(selectedQuestion.rows?.length ?? 0) <= 2"
                  @click="removeRow(row.id)"
                >
                  删除
                </button>
              </div>
              <div class="form-grid">
                <label class="field narrow">
                  <span>评分上限</span>
                  <input
                    :value="selectedQuestion.scale ?? 5"
                    class="input"
                    type="number"
                    min="2"
                    max="10"
                    @input="setScale(($event.target as HTMLInputElement).value)"
                  />
                </label>
              </div>
            </div>

            <div v-if="selectedQuestion.type === 'text'" class="sub-block form-grid">
              <label class="field">
                <span>输入框（逗号分隔）</span>
                <input
                  :value="(selectedQuestion.fields ?? []).join('，')"
                  class="input"
                  type="text"
                  placeholder="例：家乡，读书城市"
                  @input="setFields(($event.target as HTMLInputElement).value)"
                />
              </label>
              <label class="field">
                <span>占位提示</span>
                <input v-model="selectedQuestion.placeholder" class="input" type="text" />
              </label>
            </div>
          </template>

          <template v-else-if="selectedGroup">
            <header class="panel-head">
              <div>
                <p class="eyebrow">编辑分组</p>
                <h2>{{ selectedGroup.code }} · {{ selectedGroup.title }}</h2>
              </div>
              <div class="row-actions">
                <button class="btn quiet" type="button" @click="moveGroup(selectedGroup.id, -1)">
                  上移
                </button>
                <button class="btn quiet" type="button" @click="moveGroup(selectedGroup.id, 1)">
                  下移
                </button>
                <button class="btn quiet danger-text" type="button" @click="removeGroup(selectedGroup.id)">
                  删除
                </button>
              </div>
            </header>

            <div class="form-grid">
              <label class="field">
                <span>分组代号</span>
                <input v-model="selectedGroup.code" class="input" type="text" maxlength="4" />
              </label>
              <label class="field">
                <span>分组名称</span>
                <input v-model="selectedGroup.title" class="input" type="text" maxlength="80" />
              </label>
              <label class="field full">
                <span>说明（可选）</span>
                <input v-model="selectedGroup.subtitle" class="input" type="text" maxlength="200" />
              </label>
            </div>

            <div class="sub-block">
              <button class="btn ghost small" type="button" @click="addQuestion(selectedGroup.id)">
                加一道题
              </button>
            </div>
          </template>

          <div v-else class="empty">未选择</div>
        </section>
      </div>

      <div v-else class="meta-grid">
        <section class="card panel">
          <header class="panel-head">
            <h2>问卷信息</h2>
          </header>
          <div class="form-grid">
            <label class="field full">
              <span>标题</span>
              <input v-model="survey.title" class="input" type="text" maxlength="80" />
            </label>
            <label class="field">
              <span>预计用时（分钟）</span>
              <input v-model.number="survey.estimatedMinutes" class="input" type="number" min="1" max="60" />
            </label>
            <label class="field full">
              <span>说明，一行一句</span>
              <textarea v-model="survey.intro" class="textarea" rows="4" />
            </label>
          </div>
        </section>

        <section class="card panel">
          <header class="panel-head">
            <h2>维度与权重</h2>
            <button class="btn quiet" type="button" @click="addDimension">+ 维度</button>
          </header>
          <div class="dim-list">
            <div v-for="dim in survey.dimensions" :key="dim.key" class="dim-row">
              <span class="dim-key">{{ dim.key }}</span>
              <input v-model="dim.name" class="input" type="text" maxlength="40" />
              <input
                v-model.number="dim.weight"
                class="input weight-input"
                type="number"
                min="0"
                step="1"
              />
              <button class="btn quiet danger-text" type="button" @click="removeDimension(dim.key)">
                删除
              </button>
            </div>
          </div>
        </section>

        <section class="card panel">
          <header class="panel-head">
            <h2>档位</h2>
          </header>
          <div class="tier-list">
            <div v-for="tier in survey.tiers" :key="tier.tier" class="tier-row">
              <span class="tier-mark">{{ tier.tier }}</span>
              <input
                v-model.number="tier.min"
                class="input tier-min"
                type="number"
                min="0"
                max="100"
              />
              <input v-model="tier.label" class="input" type="text" maxlength="60" />
              <input v-model="tier.line" class="input" type="text" maxlength="120" />
            </div>
          </div>
        </section>
      </div>
    </template>

    <Modal :open="previewOpen" title="预览问卷" eyebrow="学员看到的样子" wide @close="previewOpen = false">
      <div class="preview">
        <h2 class="preview-title serif">{{ survey?.title }}</h2>
        <div v-for="group in survey?.groups" :key="group.id" class="preview-group">
          <p class="eyebrow">{{ group.code }} · {{ group.title }}</p>
          <h3>{{ group.title }}</h3>
          <QuestionField
            v-for="(question, i) in questionsOf(group.id)"
            :key="question.id"
            v-model="previewAnswers[question.id]"
            :question="question"
            :index="i + 1"
          />
        </div>
      </div>
    </Modal>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { Answers, Question, Survey } from '@shared/types'
import { validateSurvey } from '@shared/validate'
import { api } from '@/api'
import Modal from '@/components/Modal.vue'
import QuestionField from '@/components/QuestionField.vue'
import { useUnsavedChanges } from '@/useUnsavedChanges'

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
    flash(`已发布 v${result.survey.version}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    saving.value = false
  }
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
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

.page-title {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

.tabs button {
  border: 0;
  background: transparent;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--ink-3);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tabs button.on {
  color: var(--ink);
  border-bottom-color: var(--accent);
}

.editor-grid {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.builder {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 60px);
  overflow-y: auto;
  padding: 16px 12px 18px;
}

.builder-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 10px;
  font-size: 12px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}

.group-block {
  margin-top: 8px;
}

.group-row {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}

.group-row:hover,
.q-row:hover {
  background: rgba(0, 0, 0, 0.03);
}

.group-row.on {
  background: var(--accent-soft);
  color: var(--accent);
}

.code {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--ink-3);
}

.group-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  font-size: 10.5px;
  color: var(--ink-3);
}

.q-rows {
  margin-left: 14px;
  padding-left: 8px;
  border-left: 1px solid var(--line);
  display: grid;
  gap: 1px;
}

.q-row {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 6px;
  align-items: baseline;
  padding: 6px 8px;
  border: 0;
  background: transparent;
  border-radius: 6px;
  text-align: left;
  font-size: 12px;
  color: var(--ink-2);
}

.q-row.on {
  background: rgba(47, 93, 70, 0.08);
  color: var(--ink);
}

.q-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-q {
  border: 0;
  background: transparent;
  text-align: left;
  padding: 6px 8px;
  font-size: 11.5px;
  color: var(--ink-3);
}

.add-q:hover {
  color: var(--accent);
}

.panel {
  padding: 24px 26px 28px;
  min-height: 420px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
}

.panel-head h2 {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 500;
}

.row-actions {
  display: flex;
  gap: 2px;
}

.danger-text {
  color: var(--danger);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-grid .full {
  grid-column: 1 / -1;
}

.inline-check {
  height: 44px;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0 14px;
  background: var(--surface);
}

.sub-block {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}

.options-block {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}

.options-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--ink-3);
}

.option-row {
  display: grid;
  grid-template-columns: 30px 1fr 96px auto;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
}

.option-index {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--ink-3);
}

.score-input {
  font-family: var(--mono);
  font-size: 13px;
}

.narrow {
  max-width: 160px;
}

.meta-grid {
  display: grid;
  gap: 14px;
}

.dim-list,
.tier-list {
  display: grid;
  gap: 8px;
}

.dim-row {
  display: grid;
  grid-template-columns: 70px 1fr 90px auto;
  gap: 8px;
  align-items: center;
}

.dim-key {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
}

.weight-input {
  font-family: var(--mono);
}

.tier-row {
  display: grid;
  grid-template-columns: 32px 76px 1fr 1.2fr;
  gap: 8px;
  align-items: center;
}

.tier-mark {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--accent);
}

.tier-min {
  font-family: var(--mono);
}

.preview {
  max-height: 70vh;
  overflow-y: auto;
}

.preview-title {
  font-size: 26px;
  font-weight: 500;
  margin-bottom: 26px;
}

.preview-group {
  padding-top: 22px;
}

.preview-group h3 {
  margin-top: 6px;
  font-size: 19px;
  font-weight: 500;
}

@media (max-width: 1080px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .builder {
    position: static;
    max-height: 320px;
  }
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .option-row {
    grid-template-columns: 24px 1fr 76px auto;
  }

  .dim-row {
    grid-template-columns: 52px 1fr 70px auto;
  }

  .tier-row {
    grid-template-columns: 26px 64px 1fr;
  }

  .tier-row .input:last-child {
    grid-column: 2 / -1;
  }
}
</style>
