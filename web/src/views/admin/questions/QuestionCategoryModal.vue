<template>
  <Modal :open="open" title="管理分类" eyebrow="有效的提问" wide @close="emit('close')">
    <div class="category-manage">
      <div class="manage-head">
        <p class="hint">分类顺序会立即生效；分类下还有提问时不能删除。</p>
        <button class="btn ghost small" type="button" :disabled="busy" @click="add">
          新增分类
        </button>
      </div>

      <p v-if="error" class="form-error">{{ error }}</p>

      <p v-if="!categories.length" class="state-line">还没有分类，先新增一个。</p>
      <ul v-else class="category-list">
        <li v-for="(category, index) in categories" :key="category.id" class="category-row">
          <span class="order-index">{{ index + 1 }}</span>
          <div class="category-info">
            <strong>{{ category.name }}</strong>
            <span>{{ category.count }} 个提问</span>
          </div>
          <div class="category-actions">
            <button class="link-btn" type="button" :disabled="busy" @click="rename(category)">
              改名
            </button>
            <button
              class="link-btn"
              type="button"
              title="上移"
              :disabled="busy || index === 0"
              @click="emit('move', category.id, -1)"
            >↑</button>
            <button
              class="link-btn"
              type="button"
              title="下移"
              :disabled="busy || index === categories.length - 1"
              @click="emit('move', category.id, 1)"
            >↓</button>
            <button
              class="link-btn danger"
              type="button"
              :disabled="busy || category.count > 0"
              :title="category.count > 0 ? `分类下还有 ${category.count} 个提问` : '删除分类'"
              @click="remove(category)"
            >删除</button>
          </div>
        </li>
      </ul>
    </div>

    <template #footer>
      <button class="btn ghost small" type="button" @click="emit('close')">关闭</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue'
import type { ConsultQuestionCategory } from '@/api'
import { confirmAction, promptAction } from '@/useConfirm'

defineProps<{
  open: boolean
  categories: ConsultQuestionCategory[]
  busy?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'add', name: string): void
  (event: 'rename', id: string, name: string): void
  (event: 'move', id: string, offset: -1 | 1): void
  (event: 'remove', id: string): void
}>()

async function add() {
  const name = await promptAction({
    title: '新增分类',
    message: '新分类会排在最后，之后可以上下调序。',
    input: { label: '分类名', placeholder: '例如：开场、目标、动力', maxlength: 30, required: true },
    confirmText: '新增'
  })
  if (name) emit('add', name)
}

async function rename(category: ConsultQuestionCategory) {
  const name = await promptAction({
    title: '分类改名',
    message: '改名后分类栏与提问卡片会同步更新。',
    input: { label: '分类名', value: category.name, maxlength: 30, required: true },
    confirmText: '保存'
  })
  if (name) emit('rename', category.id, name)
}

async function remove(category: ConsultQuestionCategory) {
  if (category.count > 0) return
  const ok = await confirmAction({
    title: '删除分类',
    message: `删除空分类「${category.name}」？`,
    confirmText: '删除',
    danger: true
  })
  if (ok) emit('remove', category.id)
}
</script>

<style scoped>
.category-manage {
  display: grid;
  gap: 14px;
}

.manage-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.hint {
  color: var(--ink-3);
  font-size: 12.5px;
  line-height: 1.6;
}

.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.category-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
}

.order-index {
  width: 22px;
  flex-shrink: 0;
  color: var(--ink-3);
  font-family: var(--mono);
  font-size: 11px;
}

.category-info {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.category-info strong {
  font-size: 13.5px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.category-info span {
  color: var(--ink-3);
  font-size: 11.5px;
}

.category-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.link-btn {
  border: 0;
  background: transparent;
  padding: 4px 7px;
  border-radius: 7px;
  color: var(--ink-2);
  font-size: 12px;
}

.link-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
  color: var(--ink);
}

.link-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.link-btn.danger:hover:not(:disabled) {
  color: var(--danger);
  background: #f8eae6;
}

.form-error {
  color: var(--danger);
  font-size: 13px;
}

@media (max-width: 560px) {
  .category-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .category-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
