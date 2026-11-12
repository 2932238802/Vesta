<template>
  <div class="question">
    <div v-if="hasTags" class="q-head">
      <span v-if="question.type === 'multi'" class="tag multi">多选</span>
      <span v-if="question.type === 'multi' && question.maxSelect" class="tag">
        最多 {{ question.maxSelect }} 项
      </span>
      <span v-if="!question.required" class="optional">选填</span>
    </div>

    <div v-if="isRating" class="rating">
      <div v-if="question.anchors" class="anchors">
        <span><b>1</b>{{ question.anchors.low }}</span>
        <span class="right"><b>5</b>{{ question.anchors.high }}</span>
      </div>
      <div
        class="scale"
        :class="{ 'has-error': invalid }"
        role="radiogroup"
        :aria-label="question.title"
        @keydown="onRadioKeydown($event, 'rating')"
      >
        <button
          v-for="(option, i) in question.options"
          :key="option.id"
          type="button"
          role="radio"
          :class="{ active: modelValue === option.id }"
          :aria-checked="modelValue === option.id"
          :tabindex="tabIndexFor('rating', i, modelValue === option.id, modelValue !== null && modelValue !== undefined && modelValue !== '')"
          :disabled="disabled"
          @click="update(option.id)"
        >
          {{ i + 1 }}
        </button>
      </div>
    </div>

    <div
      v-else-if="question.type === 'single' || question.type === 'choiceText'"
      class="options"
      :class="{ 'has-error': invalid }"
      role="radiogroup"
      :aria-label="question.title"
      @keydown="onRadioKeydown($event, 'single')"
    >
      <button
        v-for="(option, i) in question.options"
        :key="option.id"
        type="button"
        role="radio"
        class="option"
        :class="{ active: isSelected(option.id) }"
        :aria-checked="isSelected(option.id)"
        :tabindex="tabIndexFor('single', i, isSelected(option.id), isSelected(option.id) || question.options.some((item) => isSelected(item.id)))"
        :disabled="disabled"
        @click="selectOption(option.id)"
      >
        <span class="indicator" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="12" height="12">
            <path
              d="M3 8.5l3.2 3.2L13 4.8"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="option-label">{{ option.label }}</span>
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
        :disabled="disabled"
        @click="toggle(option.id)"
      >
        <span class="indicator" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="12" height="12">
            <path
              d="M3 8.5l3.2 3.2L13 4.8"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="option-label">{{ option.label }}</span>
      </button>
      <p v-if="limitHit" class="limit-hint" aria-live="polite">
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
        <div
          class="matrix-scale"
          role="radiogroup"
          :aria-label="row.label"
          @keydown="onRadioKeydown($event, `matrix:${row.id}`)"
        >
          <button
            v-for="n in scale"
            :key="n"
            type="button"
            role="radio"
            :class="{ active: matrixValue[row.id] === n }"
            :aria-checked="matrixValue[row.id] === n"
            :tabindex="tabIndexFor(`matrix:${row.id}`, n - 1, matrixValue[row.id] === n, matrixValue[row.id] !== undefined)"
            :disabled="disabled"
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
      <template v-if="question.range">
        <div class="slider-row">
          <input
            class="slider"
            type="range"
            :min="question.range.min"
            :max="question.range.max"
            :step="question.range.step"
            :value="typeof modelValue === 'number' ? modelValue : question.range.min"
            :disabled="disabled"
            @input="updateNumber(($event.target as HTMLInputElement).value)"
          />
          <span class="slider-value">{{ typeof modelValue === 'number' ? modelValue : question.range.min }}</span>
        </div>
      </template>
      <input
        v-else
        class="input"
        type="number"
        inputmode="numeric"
        :value="typeof modelValue === 'number' ? modelValue : ''"
        :disabled="disabled"
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

    <p v-if="invalid" class="invalid" role="alert">{{ invalidMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AnswerValue, Question } from '@shared/types'

const props = defineProps<{
  question: Question
  modelValue: AnswerValue
  index?: number
  invalid?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: AnswerValue): void
  (event: 'touch', id: string): void
}>()

const isRating = computed(
  () => props.question.type === 'single' && props.question.display === 'rating'
)

const hasTags = computed(
  () => props.question.type === 'multi' || !props.question.required
)

const roving = ref<Record<string, number>>({})

function tabIndexFor(key: string, index: number, selected: boolean, hasSelection: boolean): number {
  if (selected) return 0
  const stored = roving.value[key]
  if (stored !== undefined) return stored === index ? 0 : -1
  return hasSelection ? -1 : index === 0 ? 0 : -1
}

// 方向键只移动焦点，Space/Enter 交给按钮原生点击选中；键盘不自动跳题。
function onRadioKeydown(event: KeyboardEvent, key: string) {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return
  }
  const container = event.currentTarget as HTMLElement
  const items = Array.from(
    container.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])')
  )
  if (!items.length) return
  const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLElement))
  let nextIndex = currentIndex
  if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = items.length - 1
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + items.length) % items.length
  } else {
    nextIndex = (currentIndex + 1) % items.length
  }
  event.preventDefault()
  roving.value[key] = nextIndex
  items[nextIndex]?.focus()
}

watch(
  () => [props.question.id, props.question.title],
  () => {
    roving.value = {}
  }
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
  padding: 0 0 16px;
}

.q-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.optional {
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-2);
}

.tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.7;
  white-space: nowrap;
}

.tag.multi {
  color: #fff;
  background: var(--accent);
}

.rating {
  margin-top: 16px;
}

.anchors {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
  color: var(--ink-2);
  line-height: 1.5;
  margin-bottom: 10px;
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
  font-weight: 500;
  color: var(--ink);
}

.scale {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.scale button {
  height: 48px;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-2);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.scale button:hover:not(:disabled) {
  border-color: var(--line-strong);
  background: var(--tint);
}

.scale button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.scale button:focus-visible,
.matrix-scale button:focus-visible,
.option:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.options {
  margin-top: 14px;
  display: grid;
  gap: 8px;
}

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  text-align: left;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  font-size: 16px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  word-break: break-word;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.option:hover:not(:disabled) {
  border-color: var(--line-strong);
  background: var(--tint);
}

.option.active {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
  background: var(--accent-soft);
  color: var(--ink);
}

.option.active:hover:not(:disabled) {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.options.has-error .option:not(.active),
.scale.has-error button:not(.active) {
  border-color: var(--danger);
}

.option-label {
  flex: 1;
  min-width: 0;
}

.indicator {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: var(--surface);
  color: transparent;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

/* 单选是圆形，多选沿用方框语义（多选按钮带 aria-pressed） */
.option[aria-pressed] .indicator {
  border-radius: 5px;
}

.option.active .indicator {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.limit-hint {
  margin-top: 2px;
  font-size: 13px;
  color: var(--danger);
}

.matrix {
  margin-top: 16px;
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
  font-size: 12px;
  color: var(--ink-2);
  padding-bottom: 2px;
}

.matrix-label {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-2);
}

.matrix-row.missing {
  box-shadow: inset 2px 0 0 var(--danger);
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
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink-2);
}

.matrix-anchor-scale span:last-child {
  text-align: right;
}

.matrix-scale button {
  height: 44px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-2);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.matrix-scale button:hover:not(:disabled) {
  border-color: var(--line-strong);
  background: var(--tint);
}

.matrix-scale button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.text-inputs {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.split-field {
  display: grid;
  gap: 5px;
}

.input,
.textarea {
  scroll-margin-bottom: 90px;
}

.question .textarea {
  min-height: 120px;
}

.split-field span {
  font-size: 13px;
  color: var(--ink-2);
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
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.number-input {
  margin-top: 14px;
  max-width: 260px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 100%;
}

.slider {
  flex: 1;
  height: 44px;
  accent-color: var(--accent);
}

.slider-value {
  min-width: 28px;
  text-align: center;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

.option:disabled,
.scale button:disabled,
.matrix-scale button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.invalid {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--danger);
}

@media (max-width: 560px) {
  .question {
    padding-bottom: 12px;
  }

  .matrix-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .matrix-head {
    display: none;
  }

  .matrix-label {
    font-size: 14px;
  }

  .anchors {
    font-size: 13px;
  }

  .anchors span {
    max-width: 48%;
  }
}
</style>
