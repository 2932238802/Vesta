<template>
  <div class="question">
    <div class="q-head">
      <span class="q-index">{{ displayIndex }}</span>
      <div class="q-copy">
        <h3 class="q-title">
          {{ question.title }}
          <span v-if="!question.required" class="optional">选填</span>
        </h3>
        <p v-if="question.hint" class="q-hint">{{ question.hint }}</p>
      </div>
    </div>

    <div v-if="isRating" class="rating">
      <div v-if="question.anchors" class="anchors">
        <span><b>1</b>{{ question.anchors.low }}</span>
        <span class="right"><b>5</b>{{ question.anchors.high }}</span>
      </div>
      <div class="scale" role="radiogroup" :aria-label="question.title">
        <button
          v-for="(option, i) in question.options"
          :key="option.id"
          type="button"
          :class="{ active: modelValue === option.id }"
          :aria-pressed="modelValue === option.id"
          @click="update(option.id)"
        >
          {{ i + 1 }}
        </button>
      </div>
    </div>

    <div
      v-else-if="question.type === 'single' || question.type === 'choiceText'"
      class="options"
      role="radiogroup"
    >
      <button
        v-for="option in question.options"
        :key="option.id"
        type="button"
        class="option"
        :class="{ active: isSelected(option.id) }"
        :aria-pressed="isSelected(option.id)"
        @click="selectOption(option.id)"
      >
        <span class="dot" />
        <span>{{ option.label }}</span>
      </button>
    </div>

    <div v-else-if="question.type === 'multi'" class="options">
      <button
        v-for="option in question.options"
        :key="option.id"
        type="button"
        class="option"
        :class="{ active: isChecked(option.id) }"
        :aria-pressed="isChecked(option.id)"
        @click="toggle(option.id)"
      >
        <span class="box" />
        <span>{{ option.label }}</span>
      </button>
      <p v-if="limitHit" class="limit-hint">
        最多选 {{ question.maxSelect }} 项，先取消一项
      </p>
    </div>

    <div v-else-if="question.type === 'matrix'" class="matrix">
      <div class="matrix-row matrix-head">
        <span class="matrix-label" />
        <div class="matrix-scale">
          <span v-for="n in scale" :key="n">{{ n }}</span>
        </div>
      </div>
      <div v-if="question.anchors" class="matrix-row matrix-anchors">
        <span class="matrix-label" />
        <div class="matrix-anchor-scale">
          <span>1 · {{ question.anchors.low }}</span>
          <span>{{ question.anchors.high }} · {{ scale.length }}</span>
        </div>
      </div>
      <div
        v-for="row in question.rows"
        :key="row.id"
        class="matrix-row"
        :class="{ missing: invalid && matrixValue[row.id] === undefined }"
      >
        <span class="matrix-label">{{ row.label }}</span>
        <div class="matrix-scale" role="radiogroup" :aria-label="row.label">
          <button
            v-for="n in scale"
            :key="n"
            type="button"
            :class="{ active: matrixValue[row.id] === n }"
            :aria-pressed="matrixValue[row.id] === n"
            @click="setMatrix(row.id, n)"
          >
            {{ n }}
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="question.type === 'text'" class="text-inputs">
      <template v-if="question.fields?.length">
        <label
          v-for="(field, i) in question.fields"
          :key="field"
          class="split-field"
          :class="{ 'field-missing': invalid && !(textValues[i] ?? '').trim() }"
        >
          <span>{{ field }}</span>
          <input
            class="input"
            type="text"
            :value="textValues[i] ?? ''"
            :placeholder="field"
            maxlength="300"
            @input="updateField(i, ($event.target as HTMLInputElement).value)"
          />
        </label>
      </template>
      <textarea
        v-else
        class="textarea"
        :class="{ 'field-missing': invalid && !String(modelValue ?? '').trim() }"
        rows="3"
        maxlength="600"
        :value="typeof modelValue === 'string' ? modelValue : ''"
        :placeholder="question.placeholder ?? '写在这里'"
        @input="update(($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <div v-else-if="question.type === 'number'" class="number-input">
      <input
        class="input"
        type="number"
        inputmode="numeric"
        :value="typeof modelValue === 'number' ? modelValue : ''"
        @input="updateNumber(($event.target as HTMLInputElement).value)"
      />
    </div>

    <div v-if="question.type === 'choiceText'" class="note-field">
      <label
        v-if="isOtherSelected"
        class="split-field other-field"
        :class="{ 'field-missing': invalid && !choiceNote.other.trim() }"
      >
        <span>{{ question.otherLabel || '其他（请填写）' }}</span>
        <input
          class="input"
          type="text"
          :value="choiceNote.other"
          :placeholder="question.otherPlaceholder ?? '写清你的情况'"
          maxlength="300"
          @input="updateOther(($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="split-field">
        <span>{{ question.noteLabel || '补充一句' }}</span>
        <input
          class="input"
          type="text"
          :value="choiceNote.note"
          :placeholder="question.notePlaceholder ?? '一句话即可'"
          maxlength="300"
          @input="updateNote(($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

    <p v-if="invalid" class="invalid">{{ invalidMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AnswerValue, Question } from '@shared/types'

const props = defineProps<{
  question: Question
  modelValue: AnswerValue
  index?: number
  invalid?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: AnswerValue): void
  (event: 'touch', id: string): void
}>()

const isRating = computed(
  () => props.question.type === 'single' && props.question.display === 'rating'
)

const displayIndex = computed(() =>
  typeof props.index === 'number' ? String(props.index).padStart(2, '0') : ''
)

const textValues = computed<string[]>(() =>
  Array.isArray(props.modelValue) ? props.modelValue : []
)

const scale = computed(() =>
  Array.from({ length: props.question.scale ?? 5 }, (_, index) => index + 1)
)

const matrixValue = computed<Record<string, number>>(() => {
  const value = props.modelValue
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, number>)
    : {}
})

const choiceNote = computed<{ choice: string; note: string; other: string }>(() => {
  const value = props.modelValue
  if (value && typeof value === 'object' && !Array.isArray(value) && 'choice' in value) {
    const record = value as { choice?: unknown; note?: unknown; other?: unknown }
    return {
      choice: typeof record.choice === 'string' ? record.choice : '',
      note: typeof record.note === 'string' ? record.note : '',
      other: typeof record.other === 'string' ? record.other : ''
    }
  }
  return { choice: '', note: '', other: '' }
})

const otherOptionId = computed(
  () => props.question.options?.find((option) => option.label === '其他')?.id ?? ''
)

const isOtherSelected = computed(
  () => Boolean(otherOptionId.value) && choiceNote.value.choice === otherOptionId.value
)

const limitHit = ref(false)

const matrixMissingCount = computed(
  () => (props.question.rows ?? []).filter((row) => matrixValue.value[row.id] === undefined).length
)

const invalidMessage = computed(() => {
  if (props.question.type === 'matrix' && matrixMissingCount.value > 0) {
    return `还有 ${matrixMissingCount.value} 项没打分`
  }
  if (props.question.type === 'choiceText' && isOtherSelected.value && !choiceNote.value.other.trim()) {
    return '选了「其他」，请写清具体内容'
  }
  if (props.question.type === 'text' && props.question.fields?.length) {
    return '还有空没填'
  }
  return '这道题还没完成'
})

function isSelected(id: string): boolean {
  return props.question.type === 'choiceText'
    ? choiceNote.value.choice === id
    : props.modelValue === id
}

function selectOption(id: string) {
  if (props.question.type === 'choiceText') {
    update({ choice: id, note: choiceNote.value.note, other: choiceNote.value.other })
  } else {
    update(id)
  }
}

function updateNote(value: string) {
  update({ choice: choiceNote.value.choice, note: value, other: choiceNote.value.other })
}

function updateOther(value: string) {
  update({ choice: choiceNote.value.choice, note: choiceNote.value.note, other: value })
}

function update(value: AnswerValue) {
  emit('touch', props.question.id)
  emit('update:modelValue', value)
}

function updateField(index: number, value: string) {
  const next = [...textValues.value]
  while (next.length < (props.question.fields?.length ?? 0)) next.push('')
  next[index] = value
  update(next)
}

function updateNumber(value: string) {
  update(value === '' ? null : Number(value))
}

function setMatrix(rowId: string, value: number) {
  update({ ...matrixValue.value, [rowId]: value })
}

function isChecked(id: string): boolean {
  return Array.isArray(props.modelValue) && props.modelValue.includes(id)
}

function toggle(id: string) {
  const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  const index = current.indexOf(id)
  if (index >= 0) {
    current.splice(index, 1)
  } else if (props.question.maxSelect && current.length >= props.question.maxSelect) {
    limitHit.value = true
    return
  } else {
    current.push(id)
  }
  limitHit.value = false
  update(current)
}
</script>

<style scoped>
.question {
  padding: 26px 0 30px;
  border-top: 1px solid var(--line);
}

.q-head {
  display: flex;
  gap: 14px;
  align-items: baseline;
}

.q-index {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.06em;
  min-width: 20px;
  padding-top: 4px;
}

.q-title {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.55;
  letter-spacing: 0;
}

.optional {
  margin-left: 8px;
  font-size: 11px;
  font-weight: 400;
  color: var(--ink-3);
  letter-spacing: 0.08em;
}

.q-hint {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.6;
}

.rating {
  margin-top: 20px;
  padding-left: 34px;
}

.anchors {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 11.5px;
  color: var(--ink-3);
  line-height: 1.55;
  margin-bottom: 12px;
}

.anchors span {
  display: flex;
  gap: 6px;
  max-width: 46%;
}

.anchors span.right {
  text-align: right;
  justify-content: flex-end;
}

.anchors b {
  font-family: var(--mono);
  font-weight: 500;
  color: var(--ink-2);
}

.scale {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.scale button {
  height: 48px;
  border-radius: 11px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--ink-2);
  font-family: var(--mono);
  font-size: 14px;
  transition: all 0.15s ease;
}

.scale button:hover {
  border-color: var(--ink-3);
}

.scale button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.options {
  margin-top: 16px;
  padding-left: 34px;
  display: grid;
  gap: 8px;
}

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-2);
  font-size: 14.5px;
  line-height: 1.5;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.option:hover {
  border-color: var(--line-strong);
}

.option.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--ink);
}

.dot,
.box {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: var(--surface);
  transition: all 0.15s ease;
}

.box {
  border-radius: 4px;
}

.option.active .dot {
  border: 4px solid var(--accent);
  background: #fff;
}

.option.active .box {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: inset 0 0 0 3px var(--accent-soft);
}

.limit-hint {
  margin-top: 2px;
  font-size: 12px;
  color: var(--danger);
}

.matrix {
  margin-top: 18px;
  padding-left: 34px;
  display: grid;
  gap: 8px;
}

.matrix-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 210px;
  align-items: center;
  gap: 14px;
}

.matrix-head {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
  padding-bottom: 2px;
}

.matrix-label {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-2);
}

.matrix-row.missing .matrix-label {
  color: var(--danger);
}

.matrix-scale {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.matrix-head .matrix-scale {
  text-align: center;
}

.matrix-anchors {
  margin-top: -2px;
}

.matrix-anchor-scale {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--ink-3);
}

.matrix-anchor-scale span:last-child {
  text-align: right;
}

.matrix-scale button {
  height: 38px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-2);
  font-family: var(--mono);
  font-size: 12.5px;
  transition: all 0.15s ease;
}

.matrix-scale button:hover {
  border-color: var(--ink-3);
}

.matrix-scale button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.text-inputs {
  margin-top: 16px;
  padding-left: 34px;
  display: grid;
  gap: 10px;
}

.split-field {
  display: grid;
  gap: 4px;
}

.split-field span {
  font-size: 11.5px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}

.field-missing > span {
  color: var(--danger);
}

.field-missing .input,
.input.field-missing,
.textarea.field-missing {
  border-color: var(--danger);
}

.note-field {
  margin-top: 16px;
  padding-left: 34px;
  display: grid;
  gap: 10px;
}

.number-input {
  margin-top: 16px;
  padding-left: 34px;
  max-width: 220px;
}

.invalid {
  margin: 10px 0 0 34px;
  font-size: 12px;
  color: var(--danger);
}

@media (max-width: 560px) {
  .question {
    padding: 22px 0 26px;
  }

  .q-title {
    font-size: 16px;
  }

  .rating,
  .options,
  .text-inputs,
  .note-field,
  .number-input,
  .matrix {
    padding-left: 0;
  }

  .matrix-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .matrix-head {
    display: none;
  }

  .matrix-label {
    font-size: 13.5px;
  }

  .invalid {
    margin-left: 0;
  }

  .anchors {
    font-size: 11px;
  }

  .anchors span {
    max-width: 48%;
  }

  .scale button {
    height: 46px;
  }
}
</style>
