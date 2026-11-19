<template>
  <div class="collections-page">
    <AdminPageHeader eyebrow="咨询" title="收藏栏">
      <template #actions>
        <span class="count">{{ items.length }} 条收藏</span>
        <button class="btn ghost" type="button" :disabled="importing" @click="pickDocx">
          {{ importing ? '导入中…' : '导入 Word' }}
        </button>
        <input
          ref="fileInput"
          class="file-input"
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          @change="onFilesPicked"
        >
        <button class="btn" type="button" @click="startCreate(filter)">新增收藏</button>
      </template>
    </AdminPageHeader>

    <CollectionsToolbar
      v-model:filter="filter"
      v-model:query="query"
      :tabs="tabs"
      :count-for="countFor"
    />

    <p v-if="importMessage" class="state-line">{{ importMessage }}</p>
    <p v-if="importError" class="state-line error">{{ importError }}</p>

    <p v-if="loading" class="state-line">正在读取收藏…</p>
    <p v-else-if="loadError" class="state-line error">{{ loadError }}</p>

    <div v-else-if="!filtered.length" class="card empty">
      <p class="empty-title">
        {{ query.trim() ? '没有匹配的收藏' : items.length ? '这个分类还没有收藏' : '还没有收藏' }}
      </p>
      <p class="quiet">
        可以把咨询里的金句、成交稿片段、公众号文章放到这里。之后咨询稿生成器也可以读取这些内容。
      </p>
      <button v-if="!items.length" class="btn" type="button" @click="startCreate(filter)">
        新增第一条
      </button>
    </div>

    <div v-else class="collection-grid">
      <CollectionCard
        v-for="item in filtered"
        :key="item.id"
        :item="item"
        :copied-id="copiedId"
        @open="openDetail"
        @pin="togglePin"
        @edit="startEdit"
        @delete="remove"
        @copy="copy"
      />
    </div>

    <CollectionFormModal
      v-if="form"
      :form="form"
      :saving="saving"
      :error="formError"
      @close="closeForm"
      @submit="save"
    />
  </div>
</template>

<script setup lang="ts">
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import CollectionsToolbar from './collections/CollectionsToolbar.vue'
import CollectionCard from './collections/CollectionCard.vue'
import CollectionFormModal from './collections/CollectionFormModal.vue'
import { useCollections } from './collections/useCollections'

const {
  items,
  loading,
  loadError,
  filter,
  query,
  copiedId,
  form,
  formError,
  saving,
  fileInput,
  importing,
  importMessage,
  importError,
  tabs,
  filtered,
  countFor,
  pickDocx,
  onFilesPicked,
  startCreate,
  startEdit,
  closeForm,
  save,
  togglePin,
  remove,
  copy,
  openDetail
} = useCollections()
</script>

<style scoped src="./consultCollections.css"></style>
