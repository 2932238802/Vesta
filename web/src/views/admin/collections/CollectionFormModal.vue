<template>
  <div class="modal-backdrop" @mousedown.self="emit('close')">
    <form class="modal card" @submit.prevent="emit('submit')">
      <header class="modal-head">
        <h2>{{ form.id ? '编辑收藏' : '新增收藏' }}</h2>
        <button class="icon-btn" type="button" aria-label="关闭" @click="emit('close')">×</button>
      </header>

      <div class="kind-picker" role="group" aria-label="收藏类型">
        <button
          v-for="kind in kinds"
          :key="kind"
          class="kind-choice"
          :class="{ on: form.kind === kind }"
          type="button"
          @click="form.kind = kind"
        >
          {{ kindLabel(kind) }}
        </button>
      </div>

      <label class="field">
        <span>标题</span>
        <input v-model="form.title" maxlength="200" placeholder="可不填，默认取内容开头">
      </label>

      <label v-if="form.kind === 'link'" class="field">
        <span>链接</span>
        <input
          v-model="form.url"
          type="url"
          maxlength="2000"
          placeholder="https://mp.weixin.qq.com/..."
        >
      </label>

      <div v-else class="field">
        <span>{{ form.kind === 'script' ? '咨询稿原文' : '内容' }}</span>
        <RichTextEditor
          v-model="form.content"
          :disabled="saving"
          :placeholder="form.kind === 'script' ? '粘贴完整咨询稿，保留原始对话和分段' : '粘贴金句或片段，可直接加粗、列表、链接'"
        />
      </div>

      <div class="form-row">
        <label class="field">
          <span>出处 / 作者</span>
          <input v-model="form.source" maxlength="200" placeholder="例如：9.18 吕新蕊咨询稿">
        </label>
        <label class="field">
          <span>标签</span>
          <input v-model="form.tagsText" placeholder="用逗号分隔，例如：开场, 信任">
        </label>
      </div>

      <label class="field">
        <span>备注</span>
        <textarea
          v-model="form.summary"
          rows="3"
          maxlength="2000"
          placeholder="为什么收藏 / 适合什么场景用"
        ></textarea>
      </label>

      <label v-if="form.kind !== 'link'" class="field">
        <span>原文链接（可选）</span>
        <input v-model="form.url" type="url" maxlength="2000" placeholder="https://...">
      </label>

      <label class="check-row">
        <input v-model="form.pinned" type="checkbox">
        <span>置顶</span>
      </label>

      <p v-if="error" class="form-error">{{ error }}</p>

      <footer class="modal-actions">
        <button class="btn ghost" type="button" @click="emit('close')">取消</button>
        <button class="btn" type="submit" :disabled="saving">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </footer>
    </form>
  </div>
</template>

<script setup lang="ts">
import {
  consultCollectionKindLabels,
  consultCollectionKinds
} from '@shared/consult-collection'
import RichTextEditor from '../components/RichTextEditor.vue'
import { kindLabel } from './useCollections'
import type { CollectionForm } from './useCollections'

defineProps<{
  form: CollectionForm
  saving: boolean
  error: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit'): void
}>()

const kinds = consultCollectionKinds
</script>

<style scoped src="./collectionFormModal.css"></style>
