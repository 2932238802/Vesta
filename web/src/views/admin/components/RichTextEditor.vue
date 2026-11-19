<template>
  <div class="rich-text-editor" :class="{ 'is-disabled': disabled }">
    <div class="rte-toolbar" role="toolbar" aria-label="正文格式">
      <button
        v-for="item in toolbar"
        :key="item.key"
        class="rte-btn"
        type="button"
        :title="item.label"
        :disabled="disabled"
        @mousedown.prevent
        @click="item.action"
      >{{ item.label }}</button>
    </div>

    <div
      ref="surface"
      class="rte-surface"
      :contenteditable="!disabled"
      :data-placeholder="placeholder"
      role="textbox"
      aria-label="正文编辑器"
      aria-multiline="true"
      :aria-disabled="disabled"
      @input="syncFromDom"
      @paste.prevent="onPaste"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { renderMarkdown } from '@/markdown'
import { htmlToMarkdown } from './htmlToMarkdown'

const props = withDefaults(
  defineProps<{
    modelValue: string
    disabled?: boolean
    maxlength?: number
    placeholder?: string
  }>(),
  { disabled: false, maxlength: undefined, placeholder: '' }
)

const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()

const surface = ref<HTMLElement | null>(null)
let lastMarkdown = props.modelValue ?? ''

function applyMarkdown(markdown: string): void {
  const el = surface.value
  if (!el) return
  el.innerHTML = renderMarkdown(markdown ?? '')
  lastMarkdown = markdown ?? ''
}

function emitMarkdown(markdown: string): void {
  lastMarkdown = markdown
  emit('update:modelValue', markdown)
}

function syncFromDom(): void {
  const el = surface.value
  if (!el || props.disabled) return
  const markdown = htmlToMarkdown(el.innerHTML)
  if (props.maxlength != null && markdown.length > props.maxlength) {
    // 与 textarea 的 maxlength 行为一致：超出上限的输入不落盘，恢复上一次内容。
    applyMarkdown(lastMarkdown)
    return
  }
  emitMarkdown(markdown)
}

function runCommand(command: string, value?: string): void {
  if (props.disabled) return
  if (document.activeElement !== surface.value) surface.value?.focus()
  document.execCommand(command, false, value)
  syncFromDom()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function insertLink(): void {
  if (props.disabled) return
  const el = surface.value
  if (!el) return

  const selection = window.getSelection()
  const selected = selection?.toString() ?? ''
  const range =
    selection && selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null

  const raw = window.prompt('链接地址（只支持 http/https）', 'https://')
  if (raw == null) return
  const url = raw.trim()
  if (!/^https?:\/\/\S+$/i.test(url)) {
    window.alert('链接地址需要以 http:// 或 https:// 开头')
    return
  }

  el.focus()
  if (range) {
    selection?.removeAllRanges()
    selection?.addRange(range)
  }
  if (selected) {
    document.execCommand('createLink', false, url)
  } else {
    const label = escapeHtml(url)
    document.execCommand('insertHTML', false, `<a href="${escapeHtml(url)}">${label}</a>`)
  }
  syncFromDom()
}

const toolbar: { key: string; label: string; action: () => void }[] = [
  { key: 'p', label: '正文', action: () => runCommand('formatBlock', 'p') },
  { key: 'h2', label: '二级标题', action: () => runCommand('formatBlock', 'h2') },
  { key: 'h3', label: '三级标题', action: () => runCommand('formatBlock', 'h3') },
  { key: 'bold', label: '加粗', action: () => runCommand('bold') },
  { key: 'italic', label: '斜体', action: () => runCommand('italic') },
  { key: 'ul', label: '无序列表', action: () => runCommand('insertUnorderedList') },
  { key: 'ol', label: '有序列表', action: () => runCommand('insertOrderedList') },
  { key: 'quote', label: '引用', action: () => runCommand('formatBlock', 'blockquote') },
  { key: 'link', label: '链接', action: insertLink }
]

function onPaste(event: ClipboardEvent): void {
  if (props.disabled) return
  const el = surface.value
  if (!el) return
  const text = event.clipboardData?.getData('text/plain') ?? ''
  el.focus()
  if (!text) return
  // 只插入纯文本：逐行转义后用 <br> 保留换行，外部 HTML 与样式全部丢弃。
  const html = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('<br>')
  document.execCommand('insertHTML', false, html)
  syncFromDom()
}

watch(
  () => props.modelValue,
  (value) => {
    const next = value ?? ''
    if (next === lastMarkdown) return
    applyMarkdown(next)
  }
)

onMounted(() => applyMarkdown(props.modelValue ?? ''))
</script>

<style scoped>
.rich-text-editor {
  display: grid;
  min-width: 0;
  max-width: 100%;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  overflow: hidden;
}

.rich-text-editor:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.rte-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.rte-btn {
  flex: 0 0 auto;
  padding: 5px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-2);
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
  cursor: pointer;
}

.rte-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--ink);
}

.rte-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.rte-surface {
  min-width: 0;
  min-height: 220px;
  max-height: 56vh;
  padding: 14px 16px;
  overflow-x: hidden;
  overflow-y: auto;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.8;
  overflow-wrap: anywhere;
  word-break: break-word;
  outline: none;
}

.rte-surface:empty::before {
  content: attr(data-placeholder);
  color: var(--ink-3);
  pointer-events: none;
}

.rte-surface :deep(p) {
  margin: 0 0 12px;
}

.rte-surface :deep(h2),
.rte-surface :deep(h3) {
  margin: 20px 0 8px;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.rte-surface :deep(h2) {
  font-size: 19px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--line);
}

.rte-surface :deep(h3) {
  font-size: 16px;
}

.rte-surface :deep(ul),
.rte-surface :deep(ol) {
  margin: 8px 0 12px;
  padding-left: 24px;
}

.rte-surface :deep(li) {
  margin: 4px 0;
}

.rte-surface :deep(blockquote) {
  margin: 12px 0;
  padding: 2px 0 2px 14px;
  border-left: 3px solid #d8c7a8;
  color: var(--ink-2);
}

.rte-surface :deep(a) {
  color: var(--accent);
  text-decoration: underline;
}

.rte-surface :deep(pre) {
  max-width: 100%;
  overflow-x: auto;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--paper);
  font-size: 12.5px;
}

.rte-surface :deep(img) {
  max-width: 100%;
  height: auto;
}

.is-disabled .rte-surface {
  background: var(--paper);
  color: var(--ink-3);
}

@media (max-width: 640px) {
  .rte-surface {
    min-height: 180px;
    padding: 12px;
  }
}
</style>
