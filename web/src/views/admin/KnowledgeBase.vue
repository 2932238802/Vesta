<template>
  <div class="knowledge-page">
    <AdminPageHeader
      eyebrow="知识库 & 数据库"
      title="专业知识汇总"
    >
      <template #actions>
        <span class="count">{{ displayMajors.length }} 个专业 · {{ articles.length }} 个知识点</span>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="card empty">正在读取知识库…</div>
    <div v-else-if="loadError" class="card empty">
      <p class="empty-title">{{ loadError }}</p>
      <p class="quiet">请检查网络后重试。</p>
      <button class="btn ghost small empty-action" type="button" @click="reload">重新读取</button>
    </div>

    <div v-else class="knowledge-layout">
      <MajorRail
        :majors="displayMajors"
        :selected-id="selectedMajorId"
        @select="selectMajor"
        @add="openMajorModal(true)"
        @manage="openMajorModal(false)"
      />

      <section class="knowledge-main">
        <p v-if="pageError" class="notice">{{ pageError }}</p>

        <template v-if="articleId">
          <div v-if="articleLoading" class="card empty">正在读取知识点…</div>
          <div v-else-if="articleError" class="card empty">
            <p class="empty-title">{{ articleError }}</p>
            <p class="quiet">请检查网络后重试，或返回专业首页。</p>
            <div class="empty-actions">
              <button class="btn ghost small" type="button" @click="retryArticle">重试</button>
              <RouterLink
                class="btn ghost small"
                :to="{ name: 'admin-knowledge-major', params: { majorId: articleMajorId } }"
              >返回专业</RouterLink>
            </div>
          </div>
          <ArticleView
            v-else-if="article"
            :article="article"
            :major-name="majorName(article.majorId)"
          />
          <div v-else class="card empty">正在读取知识点…</div>
        </template>

        <MajorHome
          v-else-if="selectedMajor"
          :major="selectedMajor"
          :articles="selectedArticles"
          @open="openArticle"
          @create="startCreateArticle"
          @edit="startEditArticle"
          @delete="askDeleteArticle"
        />

        <div v-else-if="selectedMajorId" class="card empty">
          <p class="empty-title">没有找到这个专业</p>
          <p class="quiet">它可能已经被删除。</p>
          <RouterLink class="btn ghost small empty-action" :to="{ name: 'admin-knowledge' }">
            返回专业知识汇总
          </RouterLink>
        </div>

        <div v-else class="card empty welcome">
          <template v-if="!displayMajors.length">
            <p class="empty-title">先新建一个专业</p>
            <p class="quiet">例如“护理”“计算机”。建好专业后，再往里面添加知识点。</p>
            <button class="btn small empty-action" type="button" @click="openMajorModal(true)">
              新建专业
            </button>
          </template>
          <template v-else>
            <p class="empty-title">从左侧选择一个专业</p>
            <p class="quiet">选中专业后，可以浏览和添加这个专业的知识点。</p>
          </template>
        </div>
      </section>
    </div>

    <MajorModal
      :open="majorModalOpen"
      :majors="displayMajors"
      :busy="majorBusy"
      :error="majorError"
      :auto-add="majorAutoAdd"
      @close="closeMajorModal"
      @add="onAddMajor"
      @rename="onRenameMajor"
      @move="onMoveMajor"
      @remove="onRemoveMajor"
    />

    <ArticleEditorModal
      :open="articleModalOpen"
      :article="editingArticle"
      :majors="displayMajors"
      :default-major-id="selectedMajorId"
      :saving="saving"
      :error="formError"
      @close="closeArticleModal"
      @submit="submitArticle"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { KnowledgeArticle, KnowledgeArticleInput, KnowledgeArticleSummary } from '@/api'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import { confirmAction } from '@/useConfirm'
import ArticleEditorModal from './knowledge/ArticleEditorModal.vue'
import ArticleView from './knowledge/ArticleView.vue'
import MajorHome from './knowledge/MajorHome.vue'
import MajorModal from './knowledge/MajorModal.vue'
import MajorRail from './knowledge/MajorRail.vue'
import { useKnowledge } from './knowledge/useKnowledge'

const route = useRoute()
const router = useRouter()
const store = useKnowledge()
const {
  articles,
  loading,
  loadError,
  article,
  articleLoading,
  articleError,
  displayMajors,
  majorName,
  load,
  loadArticle,
  fetchArticle,
  clearArticle,
  addMajor,
  renameMajor,
  moveMajor,
  removeMajor,
  createArticle,
  updateArticle,
  removeArticle
} = store

const pageError = ref('')
const majorModalOpen = ref(false)
const majorAutoAdd = ref(false)
const majorBusy = ref(false)
const majorError = ref('')
const articleModalOpen = ref(false)
const editingArticle = ref<KnowledgeArticle | null>(null)
const saving = ref(false)
const formError = ref('')

const selectedMajorId = computed(() =>
  typeof route.params.majorId === 'string' ? route.params.majorId : ''
)
const articleId = computed(() =>
  typeof route.params.articleId === 'string' ? route.params.articleId : ''
)
const articleMajorId = computed(() =>
  article.value?.majorId ?? selectedMajorId.value
)
const selectedMajor = computed(
  () => displayMajors.value.find((major) => major.id === selectedMajorId.value) ?? null
)
const selectedArticles = computed(() =>
  selectedMajorId.value ? store.articlesOf(selectedMajorId.value) : []
)

async function reload() {
  await load()
  await syncArticle()
}

async function syncArticle() {
  pageError.value = ''
  if (!articleId.value) {
    clearArticle()
    return
  }
  if (article.value?.id === articleId.value) return
  await loadArticle(articleId.value)
}

function selectMajor(id: string) {
  if (id === selectedMajorId.value) return
  router.push({ name: 'admin-knowledge-major', params: { majorId: id } })
}

function openArticle(summary: KnowledgeArticleSummary) {
  router.push({
    name: 'admin-knowledge-article',
    params: { majorId: summary.majorId, articleId: summary.id }
  })
}

function retryArticle() {
  if (articleId.value) void loadArticle(articleId.value)
}

function openMajorModal(autoAdd: boolean) {
  majorAutoAdd.value = autoAdd
  majorError.value = ''
  majorModalOpen.value = true
}

function closeMajorModal() {
  if (majorBusy.value) return
  majorModalOpen.value = false
  majorError.value = ''
}

async function runMajorAction(action: () => Promise<void>) {
  majorBusy.value = true
  majorError.value = ''
  try {
    await action()
  } catch (error) {
    majorError.value = error instanceof Error ? error.message : '专业操作失败'
  } finally {
    majorBusy.value = false
  }
}

function onAddMajor(name: string) {
  void runMajorAction(async () => {
    const created = await addMajor(name)
    if (!selectedMajorId.value) {
      router.push({ name: 'admin-knowledge-major', params: { majorId: created.id } })
    }
  })
}

function onRenameMajor(id: string, name: string) {
  void runMajorAction(() => renameMajor(id, name))
}

function onMoveMajor(id: string, offset: -1 | 1) {
  void runMajorAction(() => moveMajor(id, offset))
}

function onRemoveMajor(id: string) {
  void runMajorAction(async () => {
    await removeMajor(id)
    if (selectedMajorId.value === id) router.push({ name: 'admin-knowledge' })
  })
}

function startCreateArticle() {
  editingArticle.value = null
  formError.value = ''
  articleModalOpen.value = true
}

async function startEditArticle(summary: KnowledgeArticleSummary) {
  pageError.value = ''
  try {
    editingArticle.value = await fetchArticle(summary.id)
    formError.value = ''
    articleModalOpen.value = true
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '读取知识点失败'
  }
}

function closeArticleModal() {
  if (saving.value) return
  articleModalOpen.value = false
  formError.value = ''
}

async function submitArticle(input: KnowledgeArticleInput) {
  saving.value = true
  formError.value = ''
  try {
    if (editingArticle.value) {
      const updated = await updateArticle(editingArticle.value.id, input)
      if (articleId.value === updated.id) await loadArticle(updated.id)
    } else {
      await createArticle(input)
      if (input.majorId !== selectedMajorId.value) {
        router.push({
          name: 'admin-knowledge-major',
          params: { majorId: input.majorId }
        })
      }
    }
    articleModalOpen.value = false
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function askDeleteArticle(summary: KnowledgeArticleSummary) {
  const preview = summary.title.length > 40 ? `${summary.title.slice(0, 40)}…` : summary.title
  const ok = await confirmAction({
    title: '删除知识点',
    message: `删除「${preview}」？删除后不能恢复。`,
    confirmText: '删除',
    cancelText: '取消',
    danger: true
  })
  if (!ok) return
  pageError.value = ''
  try {
    await removeArticle(summary.id)
    if (articleId.value === summary.id) {
      router.push({
        name: 'admin-knowledge-major',
        params: { majorId: summary.majorId }
      })
    }
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '删除失败'
  }
}

watch(
  [() => route.params.majorId, () => route.params.articleId],
  () => {
    void syncArticle()
  }
)

onMounted(async () => {
  await load()
  await syncArticle()
})
</script>

<style src="./knowledge.css"></style>
