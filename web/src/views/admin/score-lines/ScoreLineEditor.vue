<template>
  <Modal
    :open="true"
    :title="props.set ? '编辑分数线' : '新增分数线'"
    eyebrow="分数线"
    wide
    @close="requestClose"
  >
    <form class="score-form" @submit.prevent="save">
      <div class="field-row">
        <label class="field">
          <span>类型</span>
          <select v-model="form.categoryId" class="select">
            <option v-for="category in props.categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>年份（可空）</span>
          <input
            v-model="form.year"
            class="input"
            type="number"
            min="0"
            max="2100"
            placeholder="留空表示未标年份"
          >
        </label>
      </div>

      <label class="field">
        <span>标题</span>
        <input
          v-model="form.title"
          class="input"
          maxlength="120"
          placeholder="例如：2026 考研国家线（A 区）"
        >
      </label>

      <div class="field-row">
        <label class="field">
          <span>地区（可空）</span>
          <input v-model="form.region" class="input" maxlength="20" placeholder="A 区 / 全国 / 浙江">
        </label>
        <label class="field">
          <span>来源</span>
          <input v-model="form.sourceName" class="input" maxlength="80" placeholder="教育部 / 省考试院">
        </label>
      </div>

      <label class="field">
        <span>来源链接（可空）</span>
        <input
          v-model="form.sourceUrl"
          class="input"
          type="url"
          maxlength="500"
          placeholder="https://… 官方原文"
        >
      </label>

      <label class="field">
        <span>说明（可空）</span>
        <textarea
          v-model="form.note"
          class="textarea"
          rows="2"
          maxlength="500"
          placeholder="口径说明、适用专业等"
        ></textarea>
      </label>

      <div class="entries">
        <div class="entry-head">
          <span>条目</span>
          <span>分数</span>
          <span>满分（可选）</span>
          <span>备注（可选）</span>
          <span></span>
        </div>
        <div v-for="(row, index) in form.entries" :key="index" class="entry-row">
          <input
            v-model="row.label"
            class="input entry-label"
            maxlength="40"
            placeholder="总分 / 英语一"
            :aria-label="`第 ${index + 1} 条名称`"
          >
          <input
            v-model="row.value"
            class="input entry-value"
            type="number"
            step="any"
            placeholder="273"
            :aria-label="`第 ${index + 1} 条分数`"
          >
          <input
            v-model="row.maxValue"
            class="input entry-max"
            type="number"
            step="any"
            placeholder="500"
            :aria-label="`第 ${index + 1} 条满分`"
          >
          <input
            v-model="row.note"
            class="input entry-note"
            maxlength="100"
            placeholder="备注"
            :aria-label="`第 ${index + 1} 条备注`"
          >
          <button
            class="remove"
            type="button"
            aria-label="删除这一行"
            title="删除这一行"
            @click="removeEntry(index)"
          >×</button>
        </div>
        <button class="btn ghost small add-row" type="button" @click="addEntry">
          ＋ 添加一行
        </button>
      </div>

      <p v-if="formError" class="form-error">{{ formError }}</p>
    </form>

    <template #footer>
      <button class="btn ghost" type="button" :disabled="saving" @click="requestClose">取消</button>
      <button class="btn" type="button" :disabled="saving" @click="save">
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { api } from '@/api'
import type { ScoreLineCategory, ScoreLineInput, ScoreLineSet } from '@/api'
import { validateScoreLineInput } from '@shared/score-line'
import Modal from '@/components/Modal.vue'

interface EntryRow {
  label: string
  value: string
  maxValue: string
  note: string
}

const props = defineProps<{
  set: ScoreLineSet | null
  categories: ScoreLineCategory[]
  defaultCategory: string
}>()
const emit = defineEmits<{
  (event: 'close'): void
  (event: 'saved', value: ScoreLineSet): void
}>()

function blankRow(): EntryRow {
  return { label: '', value: '', maxValue: '', note: '' }
}

function initialEntries(): EntryRow[] {
  const entries = props.set?.entries ?? []
  if (entries.length === 0) return [blankRow()]
  return entries.map((entry) => ({
    label: entry.label,
    value: String(entry.value),
    maxValue: entry.maxValue === undefined ? '' : String(entry.maxValue),
    note: entry.note ?? ''
  }))
}

const form = reactive({
  categoryId: props.set?.categoryId || props.defaultCategory || props.categories[0]?.id || '',
  title: props.set?.title ?? '',
  year: props.set && props.set.year > 0 ? String(props.set.year) : '',
  region: props.set?.region ?? '',
  sourceName: props.set?.sourceName ?? '',
  sourceUrl: props.set?.sourceUrl ?? '',
  note: props.set?.note ?? '',
  entries: initialEntries()
})

const formError = ref('')
const saving = ref(false)

function buildInput(): ScoreLineInput {
  // Vue 对 type="number" 的 v-model 会自动转成数字，空值仍是 ''；
  // 统一用 String() 读取，避免 runtime 在字符串上调用 trim()。
  const year = String(form.year ?? '').trim()
  return {
    categoryId: form.categoryId,
    title: form.title,
    year: year ? Number(year) : 0,
    region: form.region,
    sourceName: form.sourceName,
    sourceUrl: form.sourceUrl,
    note: form.note,
    entries: form.entries.map((row) => {
      const value = String(row.value ?? '').trim()
      const maxValue = String(row.maxValue ?? '').trim()
      return {
        label: row.label,
        value: value ? Number(value) : Number.NaN,
        maxValue: maxValue ? Number(maxValue) : null,
        note: row.note
      }
    })
  }
}

function addEntry() {
  form.entries.push(blankRow())
}

function removeEntry(index: number) {
  form.entries.splice(index, 1)
  // 不允许 0 条：删到空时补一行空行，避免出现无法提交的空表单。
  if (form.entries.length === 0) form.entries.push(blankRow())
}

function requestClose() {
  if (saving.value) return
  emit('close')
}

async function save() {
  if (saving.value) return
  formError.value = ''
  const input = buildInput()
  const errors = validateScoreLineInput(input)
  if (errors.length) {
    formError.value = errors[0]
    return
  }

  saving.value = true
  try {
    const result = props.set
      ? await api.updateScoreLine(props.set.id, input)
      : await api.createScoreLine(input)
    emit('saved', result.set)
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.score-form {
  display: grid;
  gap: 14px;
}

.entries {
  display: grid;
  gap: 8px;
  margin-top: 4px;
}

.entry-head,
.entry-row {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 0.8fr) minmax(0, 1fr) 32px;
  gap: 8px;
  align-items: center;
}

.entry-head {
  color: var(--ink-3);
  font-size: 11px;
  letter-spacing: 0.06em;
  padding: 0 2px;
}

.remove {
  width: 30px;
  height: 30px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: transparent;
  color: var(--ink-3);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.remove:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.add-row {
  justify-self: start;
  margin-top: 2px;
}

.form-error {
  color: var(--danger);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 700px) {
  .entry-head {
    display: none;
  }

  .entry-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 12px;
    align-items: stretch;
  }

  .entry-label,
  .entry-note {
    grid-column: 1 / -1;
  }

  .remove {
    grid-column: 2;
    justify-self: end;
  }
}
</style>
