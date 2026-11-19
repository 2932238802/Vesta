import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import type {
  ConsultCollectionInput,
  ConsultCollectionItem,
  ConsultCollectionKind
} from '@/api'
import {
  consultCollectionKindLabels,
  consultCollectionKinds
} from '@shared/consult-collection'
import { confirmAction } from '@/useConfirm'

export interface CollectionForm {
  id: string
  kind: ConsultCollectionKind
  title: string
  content: string
  url: string
  source: string
  summary: string
  tagsText: string
  pinned: boolean
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function kindLabel(kind: ConsultCollectionKind): string {
  return consultCollectionKindLabels[kind] ?? kind
}

export function displayTitle(item: ConsultCollectionItem): string {
  const title = item.title.trim()
  if (title) return title
  if (item.kind === 'link') return hostOf(item.url) || '未命名链接'
  const firstLine = item.content.split('\n').find((line) => line.trim())?.trim() ?? ''
  return firstLine.slice(0, 48) || '未命名收藏'
}

function plainText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[#>\s]*/gm, '')
    .replace(/[*_~`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// 列表只显示一条概要：优先用人工备注，其次取正文开头。
export function synopsis(item: ConsultCollectionItem): string {
  const summary = item.summary.trim()
  if (summary) return summary
  if (item.kind === 'link') return item.url
  const text = plainText(item.content)
  return text.length > 100 ? `${text.slice(0, 100)}…` : text || '（没有内容）'
}

function parseTags(value: string): string[] {
  const tags: string[] = []
  const seen = new Set<string>()
  for (const raw of value.split(/[,，;；、\n]+/)) {
    const tag = raw.trim().slice(0, 30)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
    if (tags.length >= 20) break
  }
  return tags
}

function sortItems(list: ConsultCollectionItem[]): ConsultCollectionItem[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

/** 收藏栏本地状态、筛选、导入与保存；页面与子组件共用同一份数据。 */
export function useCollections() {
  const route = useRoute()
  const router = useRouter()
  const kinds = consultCollectionKinds
  const items = ref<ConsultCollectionItem[]>([])
  const loading = ref(true)
  const loadError = ref('')
  const filter = ref<ConsultCollectionKind>('quote')
  const query = ref('')
  const copiedId = ref('')
  const form = ref<CollectionForm | null>(null)
  const formError = ref('')
  const saving = ref(false)
  const fileInput = ref<HTMLInputElement | null>(null)
  const importing = ref(false)
  const importMessage = ref('')
  const importError = ref('')
  let copyTimer: ReturnType<typeof setTimeout> | undefined

  const tabs = computed<{ value: ConsultCollectionKind; label: string }[]>(() =>
    kinds.map((kind) => ({ value: kind, label: consultCollectionKindLabels[kind] }))
  )

  const filtered = computed(() => {
    const keyword = query.value.trim().toLowerCase()
    return items.value.filter((item) => {
      if (item.kind !== filter.value) return false
      if (!keyword) return true
      return [item.title, item.content, item.source, item.summary, item.url, item.tags.join(' ')]
        .join('\n')
        .toLowerCase()
        .includes(keyword)
    })
  })

  function countFor(value: ConsultCollectionKind): number {
    return items.value.filter((item) => item.kind === value).length
  }

  function openDetail(item: ConsultCollectionItem) {
    router.push({ name: 'admin-consult-collection', params: { id: item.id } })
  }

  async function load() {
    loading.value = true
    loadError.value = ''
    try {
      const result = await api.consultCollections()
      items.value = sortItems(result.items)
      // 默认停在“金句”；如果这一类还没有内容，就落到第一个有收藏的分类，避免像导入失败。
      if (items.value.length && !items.value.some((item) => item.kind === filter.value)) {
        filter.value = items.value[0].kind
      }
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : '读取收藏失败'
    } finally {
      loading.value = false
    }
  }

  function pickDocx() {
    if (importing.value) return
    fileInput.value?.click()
  }

  // 一次可以选多个 .docx：逐个上传，失败的文件单独提示，成功的立即并入列表。
  async function onFilesPicked(event: Event) {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (!files.length || importing.value) return
    importing.value = true
    importMessage.value = ''
    importError.value = ''
    const imported: ConsultCollectionItem[] = []
    const failed: string[] = []
    try {
      for (const [index, file] of files.entries()) {
        importMessage.value = `正在解析 ${index + 1}/${files.length}：${file.name}`
        try {
          const result = await api.importConsultCollectionDocx(file)
          imported.push(result.item)
        } catch (error) {
          failed.push(`${file.name}：${error instanceof Error ? error.message : '导入失败'}`)
        }
      }
      if (imported.length) {
        items.value = sortItems([...imported, ...items.value])
        filter.value = imported[0].kind
        importMessage.value = `已导入 ${imported.length} 个 Word 文件${
          failed.length ? `，${failed.length} 个失败` : ''
        }`
      } else {
        importMessage.value = ''
      }
      importError.value = failed.join('；')
    } finally {
      importing.value = false
    }
  }

  function startCreate(kind: ConsultCollectionKind = 'quote') {
    formError.value = ''
    form.value = {
      id: '',
      kind,
      title: '',
      content: '',
      url: '',
      source: '',
      summary: '',
      tagsText: '',
      pinned: false
    }
  }

  function startEdit(item: ConsultCollectionItem) {
    formError.value = ''
    form.value = {
      id: item.id,
      kind: item.kind,
      title: item.title,
      content: item.content,
      url: item.url,
      source: item.source,
      summary: item.summary,
      tagsText: item.tags.join(', '),
      pinned: item.pinned
    }
  }

  function closeForm() {
    if (saving.value) return
    form.value = null
    formError.value = ''
  }

  async function save() {
    const current = form.value
    if (!current || saving.value) return
    formError.value = ''
    if (current.kind === 'link' && !current.url.trim()) {
      formError.value = '请填写链接地址'
      return
    }
    if (current.kind !== 'link' && !current.content.trim()) {
      formError.value = '内容不能为空'
      return
    }
    const body: ConsultCollectionInput = {
      kind: current.kind,
      title: current.title,
      content: current.content,
      url: current.url,
      source: current.source,
      summary: current.summary,
      tags: parseTags(current.tagsText),
      pinned: current.pinned
    }
    saving.value = true
    try {
      const result = current.id
        ? await api.updateConsultCollection(current.id, body)
        : await api.createConsultCollection(body)
      items.value = sortItems([
        result.item,
        ...items.value.filter((item) => item.id !== result.item.id)
      ])
      form.value = null
    } catch (error) {
      formError.value = error instanceof Error ? error.message : '保存失败'
    } finally {
      saving.value = false
    }
  }

  async function togglePin(item: ConsultCollectionItem) {
    try {
      const result = await api.updateConsultCollection(item.id, { pinned: !item.pinned })
      items.value = sortItems(
        items.value.map((entry) => (entry.id === result.item.id ? result.item : entry))
      )
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : '操作失败'
    }
  }

  async function remove(item: ConsultCollectionItem) {
    const ok = await confirmAction({
      title: '删除收藏',
      message: `删除「${displayTitle(item)}」？`,
      confirmText: '删除',
      cancelText: '取消',
      danger: true
    })
    if (!ok) return
    try {
      await api.deleteConsultCollection(item.id)
      items.value = items.value.filter((entry) => entry.id !== item.id)
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : '删除失败'
    }
  }

  async function copy(item: ConsultCollectionItem) {
    const text = item.kind === 'link' ? item.url : item.content
    try {
      await navigator.clipboard.writeText(text)
      copiedId.value = item.id
      if (copyTimer) clearTimeout(copyTimer)
      copyTimer = setTimeout(() => {
        copiedId.value = ''
      }, 1600)
    } catch {
      loadError.value = '复制失败，请手动选中内容复制'
    }
  }

  onMounted(async () => {
    await load()
    const editId = typeof route.query.edit === 'string' ? route.query.edit : ''
    if (!editId) return
    const target = items.value.find((item) => item.id === editId)
    if (target) startEdit(target)
    router.replace({ name: 'admin-consult-collections' })
  })

  return {
    kinds,
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
    load,
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
  }
}
