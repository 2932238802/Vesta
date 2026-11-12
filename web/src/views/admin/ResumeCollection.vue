<template>
  <div class="resume-page">
    <AdminPageHeader
      eyebrow="简历"
      title="简历收集"
      subtitle="只收图片，按专业归档。点专业可以查看，也可以直接导入。"
    >
      <template #actions>
        <span class="summary">{{ items.length }} 张 · {{ coveredMajors }} 个专业</span>
        <button class="btn" type="button" @click="openUpload()">导入简历图片</button>
      </template>
    </AdminPageHeader>

    <section class="card toolbar">
      <input
        v-model="query"
        class="input search"
        type="search"
        placeholder="搜索专业，例如 计算机、护理、金融"
        aria-label="搜索专业"
      />
      <span class="toolbar-note">{{ totalMajors }} 个专业</span>
    </section>

    <p v-if="loadError" class="state-line error">{{ loadError }}</p>
    <p v-else-if="loading" class="state-line">正在读取简历…</p>
    <p v-if="notice" class="state-line">{{ notice }}</p>

    <div v-if="!loading && !filteredGroups.length" class="card empty">
      <p class="empty-title">没有找到相关专业</p>
      <p class="quiet">换一个关键词试试。</p>
    </div>

    <section v-for="group in filteredGroups" :key="group.key" class="major-group">
      <button
        class="group-head"
        type="button"
        :aria-expanded="isGroupOpen(group.key)"
        @click="toggleGroup(group.key)"
      >
        <span class="group-name">{{ group.name }}</span>
        <span class="group-meta">
          {{ coveredIn(group) }} / {{ group.majors.length }} 个专业有简历
        </span>
        <span class="group-chev" :class="{ closed: !isGroupOpen(group.key) }" aria-hidden="true">
          <svg viewBox="0 0 14 14" fill="none">
            <path
              d="M3.5 5.5 7 9l3.5-3.5"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
      <div v-show="isGroupOpen(group.key)" class="major-grid">
        <button
          v-for="major in group.majors"
          :key="major"
          class="major-card"
          :class="{ filled: countFor(major) > 0 }"
          type="button"
          @click="openMajor(major)"
        >
          <span class="major-name">{{ major }}</span>
          <span class="major-count">{{ countFor(major) }}</span>
        </button>
      </div>
    </section>

    <div v-if="activeMajor" class="modal-mask" @click.self="closeMajor">
      <section
        class="modal detail-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="`${activeMajor} 的简历图片`"
      >
        <header class="modal-head">
          <div>
            <p class="eyebrow">简历 · {{ activeMajor }}</p>
            <h2>{{ activeMajor }}</h2>
            <p class="modal-sub">{{ activeItems.length }} 张图片</p>
          </div>
          <button class="icon-btn" type="button" aria-label="关闭" @click="closeMajor">×</button>
        </header>

        <div v-if="previewLoading" class="state-line">正在读取图片…</div>
        <div v-else-if="!activeItems.length" class="empty-inline">
          <p>这个专业还没有简历图片。</p>
          <button class="btn small" type="button" @click="openUpload(activeMajor)">
            导入到这个专业
          </button>
        </div>
        <div v-else class="image-grid">
          <article v-for="item in activeItems" :key="item.id" class="image-card">
            <button
              class="thumb"
              type="button"
              :disabled="!previews[item.id]"
              @click="openViewer(item)"
            >
              <img
                v-if="previews[item.id]"
                :src="previews[item.id]"
                :alt="item.fileName"
                loading="lazy"
              />
              <span v-else class="thumb-loading">读取中</span>
            </button>
            <div class="image-meta">
              <p class="image-name" :title="item.fileName">{{ item.fileName }}</p>
              <p class="image-sub">
                {{ formatDate(item.createdAt) }} · {{ formatSize(item.size) }}
              </p>
            </div>
            <button class="btn small" type="button" @click="download(item)">下载</button>
          </article>
        </div>

        <footer v-if="activeItems.length" class="modal-foot">
          <button class="btn small" type="button" @click="openUpload(activeMajor)">继续导入</button>
        </footer>
      </section>
    </div>

    <div v-if="uploadOpen" class="modal-mask upload-mask" @click.self="closeUpload">
      <section
        class="modal upload-modal"
        role="dialog"
        aria-modal="true"
        aria-label="导入简历图片"
      >
        <header class="modal-head">
          <div>
            <p class="eyebrow">简历</p>
            <h2>导入简历图片</h2>
          </div>
          <button class="icon-btn" type="button" aria-label="关闭" @click="closeUpload">×</button>
        </header>

        <div class="field">
          <span>归到哪个专业</span>
          <div ref="majorPickerEl" class="major-picker">
            <div class="picker-search-box">
              <svg class="search-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="4.4" stroke="currentColor" stroke-width="1.5" />
                <path
                  d="m10.4 10.4 3 3"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
              <input
                ref="majorSearchInput"
                v-model="majorQuery"
                class="picker-search"
                type="text"
                placeholder="搜索专业，例如 计算机、护理"
                autocomplete="off"
                role="combobox"
                aria-controls="major-options"
                :aria-expanded="majorPickerOpen"
                @focus="openMajorPicker"
                @click="openMajorPicker"
                @keydown="onMajorKeydown"
              />
              <button
                v-if="majorQuery"
                class="picker-clear"
                type="button"
                aria-label="清空搜索"
                @click="majorQuery = ''"
              >
                ×
              </button>
            </div>

            <div v-if="uploadMajor" class="picked-major">
              <span class="picked-check" aria-hidden="true">
                <svg viewBox="0 0 14 14" fill="none">
                  <path
                    d="m3.2 7.2 2.4 2.4 5.2-5.2"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <div class="picked-text">
                <strong>{{ uploadMajor }}</strong>
                <span>{{ groupOf(uploadMajor) }}</span>
              </div>
              <button class="picked-change" type="button" @click="clearMajor">更换</button>
            </div>

            <div v-if="majorPickerOpen" id="major-options" class="picker-panel" role="listbox">
              <div v-if="!majorQuery.trim() && recentMajors.length" class="recent-block">
                <p class="picker-label">最近使用</p>
                <div class="recent-list">
                  <button
                    v-for="major in recentMajors"
                    :key="major"
                    class="recent-chip"
                    type="button"
                    @click="selectMajor(major)"
                  >
                    {{ major }}
                  </button>
                </div>
              </div>

              <div class="results-head">
                <span>
                  {{ majorQuery.trim() ? `找到 ${matchedCount} 个专业` : `${totalMajors} 个专业` }}
                </span>
                <span class="results-tip">
                  {{ majorQuery.trim() ? '点一下即可选中' : '输入关键词找得更快' }}
                </span>
              </div>

              <div v-if="matchedCount" class="results-scroll">
                <template v-for="group in pickerGroups" :key="group.key">
                  <p class="picker-group-label">{{ group.name }}</p>
                  <button
                    v-for="major in group.majors"
                    :key="major"
                    class="major-option"
                    :class="{ chosen: uploadMajor === major }"
                    type="button"
                    role="option"
                    :aria-selected="uploadMajor === major"
                    @click="selectMajor(major)"
                  >
                    <span class="option-name">{{ major }}</span>
                    <span v-if="countFor(major)" class="option-count">{{ countFor(major) }} 张</span>
                    <svg
                      v-if="uploadMajor === major"
                      class="option-check"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="m3.2 7.2 2.4 2.4 5.2-5.2"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                </template>
              </div>
              <p v-else class="picker-empty">
                没有找到「{{ majorQuery.trim() }}」，试试更短的关键词。
              </p>
            </div>
          </div>
          <p class="field-help">输入关键词最快；也可以按学科浏览。</p>
        </div>

        <label class="drop-zone" :class="{ active: uploadFiles.length > 0 }">
          <input
            ref="fileInput"
            class="file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            @change="onFilesPicked"
          />
          <span class="drop-title">选择简历图片</span>
          <span class="drop-sub">JPG / PNG / WebP / GIF，单张不超过 10MB</span>
        </label>

        <div v-if="uploadFiles.length" class="pending-list">
          <div v-for="(entry, index) in uploadFiles" :key="entry.id" class="pending">
            <img class="pending-thumb" :src="entry.preview" :alt="entry.file.name" />
            <div class="pending-meta">
              <p>{{ entry.file.name }}</p>
              <span>{{ formatSize(entry.file.size) }}</span>
            </div>
            <button
              class="icon-btn"
              type="button"
              aria-label="移除这张图片"
              @click="removeUpload(index)"
            >
              ×
            </button>
          </div>
        </div>

        <p v-if="uploadError" class="state-line error">{{ uploadError }}</p>

        <footer class="modal-foot">
          <button class="btn ghost" type="button" :disabled="uploading" @click="closeUpload">
            取消
          </button>
          <button class="btn" type="button" :disabled="!canUpload" @click="upload">
            {{ uploading ? '正在导入…' : uploadFiles.length ? `导入 ${uploadFiles.length} 张` : '导入' }}
          </button>
        </footer>
      </section>
    </div>

    <div v-if="viewing" class="modal-mask viewer-mask" @click.self="viewing = null">
      <div class="viewer">
        <img :src="viewing.url" :alt="viewing.item.fileName" />
        <div class="viewer-bar">
          <p class="viewer-name">{{ viewing.item.fileName }}</p>
          <div class="viewer-actions">
            <button class="btn small" type="button" @click="download(viewing.item)">下载</button>
            <button class="btn ghost small" type="button" @click="viewing = null">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { api, type ResumeImageSummary } from '@/api'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import { isResumeMajor, resumeMajorGroups, resumeMajors } from '@shared/resume'

interface UploadEntry {
  id: string
  file: File
  preview: string
}

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const RECENT_MAJORS_KEY = 'vesta.admin.resumeRecentMajors'
const MAX_RECENT_MAJORS = 4
const totalMajors = resumeMajors.length

const majorGroupNames = new Map<string, string>()
for (const group of resumeMajorGroups) {
  for (const major of group.majors) majorGroupNames.set(major, group.name)
}

const items = ref<ResumeImageSummary[]>([])
const loading = ref(true)
const loadError = ref('')
const notice = ref('')
const query = ref('')

const activeMajor = ref('')
const previewLoading = ref(false)
const previews = reactive<Record<string, string>>({})
const viewing = ref<{ item: ResumeImageSummary; url: string } | null>(null)

const uploadOpen = ref(false)
const uploadMajor = ref('')
const uploadFiles = ref<UploadEntry[]>([])
const uploading = ref(false)
const uploadError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const majorQuery = ref('')
const majorPickerOpen = ref(false)
const majorPickerEl = ref<HTMLElement | null>(null)
const majorSearchInput = ref<HTMLInputElement | null>(null)
const recentMajors = ref<string[]>(loadRecentMajors())

const collapsedGroups = reactive<Record<string, boolean>>({})
for (const group of resumeMajorGroups) {
  collapsedGroups[group.key] = group.key !== 'engineering'
}

let noticeTimer: number | undefined

const counts = computed(() => {
  const map: Record<string, number> = {}
  for (const item of items.value) {
    map[item.major] = (map[item.major] ?? 0) + 1
  }
  return map
})

const coveredMajors = computed(() => Object.keys(counts.value).length)

const filteredGroups = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return resumeMajorGroups
  return resumeMajorGroups
    .map((group) => {
      if (group.name.toLowerCase().includes(keyword)) return group
      return {
        ...group,
        majors: group.majors.filter((major) => major.toLowerCase().includes(keyword))
      }
    })
    .filter((group) => group.majors.length > 0)
})

const pickerGroups = computed(() => {
  const keyword = majorQuery.value.trim().toLowerCase()
  if (!keyword) return resumeMajorGroups
  return resumeMajorGroups
    .map((group) => {
      if (group.name.toLowerCase().includes(keyword)) return group
      return {
        ...group,
        majors: group.majors.filter((major) => major.toLowerCase().includes(keyword))
      }
    })
    .filter((group) => group.majors.length > 0)
})

const matchedCount = computed(() =>
  pickerGroups.value.reduce((total, group) => total + group.majors.length, 0)
)

const activeItems = computed(() =>
  activeMajor.value
    ? items.value.filter((item) => item.major === activeMajor.value)
    : []
)

const canUpload = computed(
  () => Boolean(uploadMajor.value) && uploadFiles.value.length > 0 && !uploading.value
)

function countFor(major: string): number {
  return counts.value[major] ?? 0
}

function coveredIn(group: { majors: string[] }): number {
  return group.majors.filter((major) => countFor(major) > 0).length
}

function groupOf(major: string): string {
  return majorGroupNames.get(major) ?? ''
}

function loadRecentMajors(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_MAJORS_KEY) ?? '[]')
    if (!Array.isArray(saved)) return []
    return saved
      .filter((value): value is string => typeof value === 'string' && isResumeMajor(value))
      .slice(0, MAX_RECENT_MAJORS)
  } catch {
    return []
  }
}

function rememberMajor(major: string): void {
  recentMajors.value = [major, ...recentMajors.value.filter((item) => item !== major)].slice(
    0,
    MAX_RECENT_MAJORS
  )
  try {
    localStorage.setItem(RECENT_MAJORS_KEY, JSON.stringify(recentMajors.value))
  } catch {
    // 本地存储不可用时只影响最近使用，不影响导入
  }
}

function openMajorPicker(): void {
  majorPickerOpen.value = true
}

function closeMajorPicker(): void {
  majorPickerOpen.value = false
}

function selectMajor(major: string): void {
  uploadMajor.value = major
  majorQuery.value = ''
  closeMajorPicker()
}

function clearMajor(): void {
  uploadMajor.value = ''
  openMajorPicker()
  void nextTick(() => majorSearchInput.value?.focus())
}

function onMajorKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && majorPickerOpen.value) {
    event.stopPropagation()
    closeMajorPicker()
    return
  }
  if (event.key !== 'Enter') return
  const keyword = majorQuery.value.trim()
  if (!keyword) return
  const exact = resumeMajors.find((major) => major === keyword)
  const matches = pickerGroups.value.flatMap((group) => group.majors)
  if (exact) {
    event.preventDefault()
    selectMajor(exact)
  } else if (matches.length === 1) {
    event.preventDefault()
    selectMajor(matches[0])
  }
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!majorPickerOpen.value || !majorPickerEl.value) return
  if (!majorPickerEl.value.contains(event.target as Node)) closeMajorPicker()
}

function isGroupOpen(key: string): boolean {
  return Boolean(query.value.trim()) || !collapsedGroups[key]
}

function toggleGroup(key: string): void {
  if (query.value.trim()) return
  collapsedGroups[key] = !collapsedGroups[key]
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const result = await api.resumeImages()
    items.value = result.items
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '读取简历失败'
  } finally {
    loading.value = false
  }
}

function clearPreviews(): void {
  for (const url of Object.values(previews)) URL.revokeObjectURL(url)
  for (const key of Object.keys(previews)) delete previews[key]
}

async function loadPreviews(major: string): Promise<void> {
  const missing = items.value.filter((item) => item.major === major && !previews[item.id])
  if (!missing.length) {
    previewLoading.value = false
    return
  }
  previewLoading.value = true
  try {
    await Promise.all(
      missing.map(async (item) => {
        try {
          const blob = await api.resumeImageBlob(item.id)
          if (activeMajor.value === major) previews[item.id] = URL.createObjectURL(blob)
        } catch {
          // 单张图读取失败时保留占位，不影响其他图片。
        }
      })
    )
  } finally {
    if (activeMajor.value === major) previewLoading.value = false
  }
}

function openMajor(major: string): void {
  activeMajor.value = major
  viewing.value = null
  void loadPreviews(major)
}

function closeMajor(): void {
  activeMajor.value = ''
  viewing.value = null
  clearPreviews()
}

function openViewer(item: ResumeImageSummary): void {
  const url = previews[item.id]
  if (url) viewing.value = { item, url }
}

function openUpload(major?: string): void {
  uploadMajor.value = major || activeMajor.value || ''
  uploadError.value = ''
  uploadFiles.value = []
  majorQuery.value = ''
  majorPickerOpen.value = false
  uploadOpen.value = true
  if (!uploadMajor.value) {
    void nextTick(() => majorSearchInput.value?.focus())
  }
}

function resetUploadFiles(): void {
  for (const entry of uploadFiles.value) URL.revokeObjectURL(entry.preview)
  uploadFiles.value = []
}

function closeUpload(): void {
  if (uploading.value) return
  uploadOpen.value = false
  uploadError.value = ''
  majorQuery.value = ''
  majorPickerOpen.value = false
  resetUploadFiles()
}

function onFilesPicked(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  uploadError.value = ''
  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      uploadError.value = `${file.name} 不是支持的图片格式`
      continue
    }
    if (file.size > MAX_IMAGE_BYTES) {
      uploadError.value = `${file.name} 超过 10MB`
      continue
    }
    uploadFiles.value.push({
      id:
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file)
    })
  }
  input.value = ''
}

function removeUpload(index: number): void {
  const [entry] = uploadFiles.value.splice(index, 1)
  if (entry) URL.revokeObjectURL(entry.preview)
}

async function upload(): Promise<void> {
  if (!canUpload.value) return
  const major = uploadMajor.value
  uploading.value = true
  uploadError.value = ''
  let ok = 0
  let failed = 0
  for (const entry of [...uploadFiles.value]) {
    try {
      await api.uploadResumeImage(major, entry.file)
      ok += 1
    } catch (error) {
      failed += 1
      uploadError.value = error instanceof Error ? error.message : '导入失败'
    }
  }
  uploading.value = false
  if (!ok) return

  uploadOpen.value = false
  resetUploadFiles()
  uploadError.value = ''
  rememberMajor(major)
  closeMajor()
  await load()
  openMajor(major)
  showNotice(failed ? `已导入 ${ok} 张，${failed} 张失败` : `已导入 ${ok} 张简历图片`)
}

async function download(item: ResumeImageSummary): Promise<void> {
  try {
    const blob = await api.downloadResumeImage(item.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = item.fileName || '简历图片'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1500)
  } catch (error) {
    showNotice(error instanceof Error ? error.message : '下载失败')
  }
}

function showNotice(text: string): void {
  notice.value = text
  if (noticeTimer !== undefined) window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => {
    notice.value = ''
  }, 4000)
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  if (viewing.value) {
    viewing.value = null
  } else if (uploadOpen.value && majorPickerOpen.value) {
    closeMajorPicker()
  } else if (uploadOpen.value) {
    closeUpload()
  } else if (activeMajor.value) {
    closeMajor()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('pointerdown', onDocumentPointerDown)
  void load()
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  if (noticeTimer !== undefined) window.clearTimeout(noticeTimer)
  clearPreviews()
  resetUploadFiles()
})
</script>

<style scoped>
.summary {
  font-size: 12px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  margin-bottom: 10px;
}

@media (min-width: 901px) {
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 18;
  }
}

.search {
  flex: 1;
  min-width: 0;
}

.toolbar-note {
  flex-shrink: 0;
  font-size: 11.5px;
  color: var(--ink-3);
}

.state-line {
  padding: 8px 2px;
  font-size: 12.5px;
  color: var(--ink-3);
}

.state-line.error {
  color: var(--danger);
}

.major-group {
  border-bottom: 1px solid var(--line);
}

.group-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  width: 100%;
  padding: 16px 4px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.group-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.group-meta {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--ink-3);
  white-space: nowrap;
}

.group-chev {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--ink-3);
  transition: transform 0.18s ease;
}

.group-chev svg {
  display: block;
  width: 14px;
  height: 14px;
}

.group-chev.closed {
  transform: rotate(-90deg);
}

.major-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 0 0 20px;
}

.major-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink-2);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}

.major-card:hover {
  border-color: color-mix(in srgb, var(--accent) 28%, var(--line));
  background: color-mix(in srgb, var(--accent) 3%, var(--surface));
  color: var(--ink);
}

.major-card.filled {
  border-color: color-mix(in srgb, var(--accent) 18%, var(--line));
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
  color: var(--ink);
}

.major-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.major-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 7%, transparent);
  color: var(--ink-3);
  font-family: var(--mono);
  font-size: 10.5px;
  line-height: 1;
}

.major-card.filled .major-count {
  background: color-mix(in srgb, var(--accent) 13%, transparent);
  color: var(--accent);
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(20, 19, 16, 0.55);
  overflow-y: auto;
}

.modal {
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 26px 28px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: 0 30px 80px -40px rgba(0, 0, 0, 0.5);
}

.upload-mask {
  z-index: 60;
}

.upload-modal {
  max-width: 560px;
}

.major-picker {
  display: grid;
  gap: 8px;
}

.field > span {
  color: var(--ink-3);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.field-help {
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--ink-3);
}

.picker-search-box {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.picker-search-box:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.search-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--ink-3);
}

.picker-search {
  flex: 1;
  min-width: 0;
  padding: 12px 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-size: 14px;
}

.picker-search::placeholder {
  color: #aaa59a;
}

.picker-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ink) 7%, transparent);
  color: var(--ink-3);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}

.picker-clear:hover {
  color: var(--ink);
}

.picked-major {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--line));
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
}

.picked-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
}

.picked-check svg {
  display: block;
  width: 13px;
  height: 13px;
}

.picked-text {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.picked-text strong {
  overflow-wrap: anywhere;
  color: var(--ink);
  font-size: 13.5px;
  font-weight: 600;
}

.picked-text span {
  color: var(--ink-3);
  font-size: 11px;
}

.picked-change {
  flex-shrink: 0;
  padding: 5px 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
}

.picked-change:hover {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.picker-panel {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 14px 32px -24px rgba(0, 0, 0, 0.4);
}

.recent-block {
  padding: 12px 12px 0;
}

.picker-label {
  color: var(--ink-3);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.recent-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.recent-chip {
  padding: 5px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper);
  color: var(--ink-2);
  font-size: 11.5px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.recent-chip:hover {
  border-color: color-mix(in srgb, var(--accent) 30%, var(--line));
  color: var(--accent);
}

.results-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 12px 8px;
  color: var(--ink-2);
  font-size: 11.5px;
}

.results-tip {
  color: var(--ink-3);
  font-size: 11px;
}

.results-scroll {
  max-height: 248px;
  overflow-y: auto;
  padding: 0 6px 8px;
}

.picker-group-label {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0;
  padding: 8px 6px 5px;
  background: var(--surface);
  color: var(--ink-3);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.major-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-2);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.major-option:hover {
  background: color-mix(in srgb, var(--accent) 5%, transparent);
  color: var(--ink);
}

.major-option.chosen {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--ink);
}

.option-name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.option-count {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  color: var(--ink-3);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.option-check {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--accent);
}

.picker-empty {
  padding: 18px 14px 20px;
  color: var(--ink-3);
  font-size: 12px;
  text-align: center;
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.modal-head h2 {
  margin-top: 7px;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.modal-sub {
  margin-top: 5px;
  font-size: 12px;
  color: var(--ink-3);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-3);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.icon-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--ink);
}

.empty-inline {
  padding: 36px 0 26px;
  text-align: center;
  color: var(--ink-3);
  font-size: 13.5px;
}

.empty-inline .btn {
  margin-top: 14px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.image-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 2%, var(--surface));
}

.thumb {
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: var(--paper);
  cursor: zoom-in;
}

.thumb:disabled {
  cursor: default;
}

.thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.thumb-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--ink-3);
  font-size: 11px;
}

.image-meta {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.image-name {
  overflow: hidden;
  color: var(--ink);
  font-size: 12.5px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-sub {
  color: var(--ink-3);
  font-size: 11px;
}

.image-card .btn {
  width: 100%;
}

.modal-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 22px;
}

.drop-zone {
  display: grid;
  gap: 5px;
  margin-top: 16px;
  padding: 26px 18px;
  border: 1px dashed var(--line-strong);
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 2%, var(--surface));
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.drop-zone:hover,
.drop-zone.active {
  border-color: color-mix(in srgb, var(--accent) 38%, var(--line));
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

.file-input {
  display: none;
}

.drop-title {
  font-size: 13.5px;
  color: var(--ink);
}

.drop-sub {
  font-size: 11.5px;
  color: var(--ink-3);
}

.pending-list {
  display: grid;
  gap: 8px;
  max-height: 260px;
  margin-top: 14px;
  overflow-y: auto;
}

.pending {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 10px;
}

.pending-thumb {
  width: 42px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 6px;
  object-fit: cover;
  object-position: top center;
}

.pending-meta {
  flex: 1;
  min-width: 0;
}

.pending-meta p {
  overflow: hidden;
  color: var(--ink);
  font-size: 12px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-meta span {
  color: var(--ink-3);
  font-size: 11px;
}

.viewer-mask {
  z-index: 70;
  background: rgba(15, 14, 12, 0.82);
}

.viewer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(920px, 100%);
  max-height: 92vh;
  padding: 14px;
  border-radius: 18px;
  background: var(--surface);
}

.viewer img {
  display: block;
  max-width: 100%;
  max-height: calc(88vh - 80px);
  margin: 0 auto;
  border-radius: 8px;
  background: var(--paper);
  object-fit: contain;
}

.viewer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.viewer-name {
  overflow: hidden;
  color: var(--ink-2);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.viewer-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

@media (max-width: 1000px) {
  .major-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .page-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }

  .major-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .modal-mask {
    padding: 12px;
  }

  .modal {
    max-height: 94vh;
    padding: 22px 18px;
  }

  .image-grid {
    grid-template-columns: 1fr;
  }

  .results-scroll {
    max-height: 34vh;
  }
}
</style>
