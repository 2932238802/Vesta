<template>
  <Modal :open="open" title="管理专业" eyebrow="专业知识汇总" wide @close="emit('close')">
    <div class="major-manage">
      <div class="manage-head">
        <p class="major-hint">专业顺序会立即生效；专业下还有知识点时不能删除。</p>
        <button class="btn ghost small" type="button" :disabled="busy" @click="add">
          新增专业
        </button>
      </div>

      <p v-if="error" class="knowledge-form-error">{{ error }}</p>

      <p v-if="!majors.length" class="major-state">还没有专业，先新增一个。</p>
      <ul v-else class="major-manage-list">
        <li v-for="(major, index) in majors" :key="major.id" class="major-manage-row">
          <span class="order-index">{{ index + 1 }}</span>
          <div class="major-manage-info">
            <strong>{{ major.name }}</strong>
            <span>{{ major.count }} 个知识点</span>
          </div>
          <div class="major-manage-actions">
            <button class="link-btn" type="button" :disabled="busy" @click="rename(major)">
              改名
            </button>
            <button
              class="link-btn"
              type="button"
              title="上移"
              :disabled="busy || index === 0"
              @click="emit('move', major.id, -1)"
            >↑</button>
            <button
              class="link-btn"
              type="button"
              title="下移"
              :disabled="busy || index === majors.length - 1"
              @click="emit('move', major.id, 1)"
            >↓</button>
            <button
              class="link-btn danger"
              type="button"
              :disabled="busy || major.count > 0"
              :title="major.count > 0 ? `专业下还有 ${major.count} 个知识点` : '删除专业'"
              @click="remove(major)"
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
import { watch } from 'vue'
import { KNOWLEDGE_MAJOR_NAME_MAX } from '@shared/knowledge'
import Modal from '@/components/Modal.vue'
import type { KnowledgeMajor } from '@/api'
import { confirmAction, promptAction } from '@/useConfirm'

const props = defineProps<{
  open: boolean
  majors: KnowledgeMajor[]
  busy?: boolean
  error?: string
  autoAdd?: boolean
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'add', name: string): void
  (event: 'rename', id: string, name: string): void
  (event: 'move', id: string, offset: -1 | 1): void
  (event: 'remove', id: string): void
}>()

watch(
  () => props.open,
  (open) => {
    if (open && props.autoAdd) void add()
  }
)

async function add() {
  const name = await promptAction({
    title: '新建专业',
    message: '新专业会排在最后，之后可以上下调序。',
    input: { label: '专业名', placeholder: '例如：护理', maxlength: KNOWLEDGE_MAJOR_NAME_MAX, required: true },
    confirmText: '新建'
  })
  if (name) emit('add', name)
}

async function rename(major: KnowledgeMajor) {
  const name = await promptAction({
    title: '专业改名',
    message: '改名后左侧专业栏与知识点归属会同步更新。',
    input: { label: '专业名', value: major.name, maxlength: KNOWLEDGE_MAJOR_NAME_MAX, required: true },
    confirmText: '保存'
  })
  if (name) emit('rename', major.id, name)
}

async function remove(major: KnowledgeMajor) {
  if (major.count > 0) return
  const ok = await confirmAction({
    title: '删除专业',
    message: `删除空专业「${major.name}」？`,
    confirmText: '删除',
    danger: true
  })
  if (ok) emit('remove', major.id)
}
</script>
