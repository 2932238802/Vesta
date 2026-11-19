<template>
  <div class="basics-page">
    <AdminPageHeader
      eyebrow="咨询"
      title="大学常识"
    >
      <template #actions>
        <span class="count">{{ topics.length }} 个话题</span>
        <button class="btn" type="button" @click="startCreate">＋ 新建话题</button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="card empty">正在读取大学常识…</div>
    <div v-else-if="loadError" class="card empty">
      <p class="empty-title">{{ loadError }}</p>
      <p class="quiet">请检查网络后重试。</p>
      <button class="btn ghost small empty-action" type="button" @click="reload">重新读取</button>
    </div>

    <div v-else class="basics-wiki" :class="{ reading: isReading }">
      <TopicRail
        v-model:query="query"
        :topics="filteredTopics"
        :selected-id="activeId"
        :draggable="!query.trim()"
        @select="selectTopic"
        @reorder="onReorder"
      />

      <section class="basics-main" aria-live="polite">
        <p v-if="pageError" class="notice">{{ pageError }}</p>

        <template v-if="activeId">
          <div v-if="topicLoading" class="card empty">正在读取话题…</div>
          <div v-else-if="topicError" class="card empty">
            <p class="empty-title">{{ topicError }}</p>
            <p class="quiet">请检查网络后重试。</p>
            <div class="empty-actions">
              <button class="btn ghost small" type="button" @click="retryTopic">重试</button>
              <button class="btn ghost small" type="button" @click="backToList">返回话题列表</button>
            </div>
          </div>
          <TopicView
            v-else-if="topic"
            :topic="topic"
            @back="backToList"
            @edit="startEdit"
            @delete="askDelete"
          />
          <div v-else class="card empty">正在读取话题…</div>
        </template>

        <div v-else class="card empty welcome">
          <p class="empty-title">还没有话题</p>
          <p class="quiet">先新建一个话题，例如“入党的流程”。之后可以在这里继续补充。</p>
          <button class="btn small empty-action" type="button" @click="startCreate">
            新建话题
          </button>
        </div>
      </section>
    </div>

    <TopicEditorModal
      :open="editorOpen"
      :topic="editing"
      :saving="saving"
      :error="formError"
      @close="closeEditor"
      @submit="submitTopic"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ConsultTopic, ConsultTopicInput } from '@/api'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import { confirmAction } from '@/useConfirm'
import TopicEditorModal from './basics/TopicEditorModal.vue'
import TopicRail from './basics/TopicRail.vue'
import TopicView from './basics/TopicView.vue'
import { useBasics } from './basics/useBasics'

const route = useRoute()
const router = useRouter()
const store = useBasics()
const {
  topics,
  loading,
  loadError,
  topic,
  topicLoading,
  topicError,
  query,
  filteredTopics,
  load,
  fetchTopic,
  loadTopic,
  clearTopic,
  createTopic,
  updateTopic,
  removeTopic,
  reorderTopics
} = store

const pageError = ref('')
const editorOpen = ref(false)
const editing = ref<ConsultTopic | null>(null)
const saving = ref(false)
const formError = ref('')

const selectedId = computed(() =>
  typeof route.params.id === 'string' ? route.params.id : ''
)
// 未带 id 时默认打开第一个话题；列表仍按服务端顺序展示。
const activeId = computed(() => selectedId.value || topics.value[0]?.id || '')
const isReading = computed(() => Boolean(selectedId.value))

async function reload() {
  await load()
  await syncTopic()
}

async function syncTopic() {
  pageError.value = ''
  if (!activeId.value) {
    clearTopic()
    return
  }
  if (topic.value?.id === activeId.value) return
  await loadTopic(activeId.value)
}

function selectTopic(id: string) {
  if (id === selectedId.value) return
  void router.push({ name: 'admin-consult-basics-topic', params: { id } })
}

function backToList() {
  void router.push({ name: 'admin-consult-basics' })
}

function retryTopic() {
  if (activeId.value) void loadTopic(activeId.value)
}

function startCreate() {
  editing.value = null
  formError.value = ''
  editorOpen.value = true
}

async function startEdit() {
  if (!activeId.value) return
  pageError.value = ''
  try {
    editing.value =
      topic.value?.id === activeId.value
        ? topic.value
        : await fetchTopic(activeId.value)
    formError.value = ''
    editorOpen.value = true
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '读取话题失败'
  }
}

function closeEditor() {
  if (saving.value) return
  editorOpen.value = false
  formError.value = ''
}

async function submitTopic(input: ConsultTopicInput) {
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      editing.value = await updateTopic(editing.value.id, input)
    } else {
      const created = await createTopic(input)
      await router.push({ name: 'admin-consult-basics-topic', params: { id: created.id } })
    }
    editorOpen.value = false
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function askDelete() {
  if (!activeId.value) return
  const preview =
    (topic.value?.id === activeId.value ? topic.value.title : '') ||
    topics.value.find((item) => item.id === activeId.value)?.title ||
    ''
  const title = preview.length > 40 ? `${preview.slice(0, 40)}…` : preview
  const ok = await confirmAction({
    title: '删除话题',
    message: `删除「${title}」？删除后不能恢复。`,
    confirmText: '删除',
    cancelText: '取消',
    danger: true
  })
  if (!ok) return
  const id = activeId.value
  pageError.value = ''
  try {
    await removeTopic(id)
    if (selectedId.value === id) backToList()
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '删除失败'
  }
}

async function onReorder(ids: string[]) {
  pageError.value = ''
  try {
    await reorderTopics(ids)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    pageError.value = message
      ? `保存顺序失败，已恢复原顺序：${message}`
      : '保存顺序失败，已恢复原顺序'
  }
}

watch(activeId, () => {
  void syncTopic()
})

onMounted(async () => {
  await load()
  await syncTopic()
})
</script>

<style src="./consultBasics.css"></style>
