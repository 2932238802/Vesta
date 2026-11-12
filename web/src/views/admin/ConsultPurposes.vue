<template>
  <div class="purpose-page">
    <AdminPageHeader eyebrow="咨询" title="咨询树">
      <template #actions>
        <button class="btn ghost small" type="button" :disabled="loading || !payload" @click="expandAll">
          全部展开
        </button>
        <button class="btn ghost small" type="button" :disabled="loading || !payload" @click="collapseAll">
          全部收起
        </button>
        <label v-if="payload" class="template-picker">
          <span>模板</span>
          <select :value="activeTemplate?.id" @change="onTemplateChange">
            <option v-for="item in payload.templates" :key="item.id" :value="item.id">
              {{ item.name }} · {{ item.season }} · {{ item.stats.purposes }} 个目的
            </option>
          </select>
        </label>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="card empty">正在读取咨询树</div>
    <div v-else-if="loadError" class="card empty">
      {{ loadError }}
      <div class="empty-action">
        <button class="btn ghost small" type="button" @click="load">重新读取</button>
      </div>
    </div>

    <template v-else-if="payload">
      <section class="card filter-bar">
        <div class="stats-row">
          <span class="stat"><b>{{ stats.stages }}</b> 个阶段</span>
          <span class="stat"><b>{{ stats.purposes }}</b> 个目的</span>
          <span class="stat"><b>{{ stats.optional }}</b> 个可选支线</span>
          <span class="stat"><b>{{ stats.butterflies }}</b> 个蝴蝶</span>
          <span class="stat"><b>{{ stats.exampleGroups }}</b> 组示例</span>
          <span v-if="stats.gaps" class="stat gap"><b>{{ stats.gaps }}</b> 个待补充</span>
        </div>
        <div class="filter-row">
          <input
            v-model="query"
            class="input search"
            type="search"
            maxlength="200"
            placeholder="搜目的、原文、标签…"
            autocomplete="off"
          />
          <label class="check">
            <input v-model="showButterflies" type="checkbox" />
            显示蝴蝶
          </label>
          <label class="check">
            <input v-model="onlyMainline" type="checkbox" />
            只看主线
          </label>
        </div>
      </section>

      <div class="purpose-layout">
        <ConsultPurposeMap
          ref="mapRef"
          :tree="tree"
          :stages="stages"
          :query="query"
          :only-mainline="onlyMainline"
          :show-butterflies="showButterflies"
          :selected-node="selectedNode"
          :selected-id="selectedId"
          :collapsed-ids="mapCollapsed"
          @select="select"
          @toggle-collapse="toggleMapCollapse"
          @clear-selection="selectedId = ''"
        />

        <ConsultPurposeDetail
          ref="detailRef"
          :selected-node="selectedNode"
          :breadcrumb="breadcrumb"
          @select="select"
          @close="selectedId = ''"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import ConsultPurposeMap from '@/components/consult/ConsultPurposeMap.vue'
import ConsultPurposeDetail from '@/components/consult/ConsultPurposeDetail.vue'
import {
  clearPurposeBeatCache,
  collectWithChildren,
  defaultCollapsedStages
} from '@/components/consult/purposeView'
import type {
  ConsultPurposeNode,
  ConsultPurposePayload,
  ConsultPurposeStats,
  ConsultPurposeTemplate
} from '@shared/consult-purpose'

interface PurposeMapApi {
  fitMap: () => void
  ensureNodeVisible: (id: string) => void
}

interface PurposeDetailApi {
  scrollIntoView: () => void
}

const payload = ref<ConsultPurposePayload | null>(null)
const loading = ref(true)
const loadError = ref('')
const route = useRoute()
const router = useRouter()
const query = ref('')
const showButterflies = ref(true)
const onlyMainline = ref(false)
const selectedId = ref('')
const mapCollapsed = ref<Set<string>>(new Set())
const activeTemplateId = ref(
  typeof route.query.template === 'string' ? route.query.template : ''
)
const mapRef = ref<PurposeMapApi | null>(null)
const detailRef = ref<PurposeDetailApi | null>(null)

const EMPTY_STATS: ConsultPurposeStats = {
  stages: 0,
  purposes: 0,
  optional: 0,
  gaps: 0,
  incomplete: 0,
  butterflies: 0,
  exampleGroups: 0,
  turns: 0,
  chars: 0
}

const activeTemplate = computed<ConsultPurposeTemplate | null>(() => {
  const list = payload.value?.templates ?? []
  return list.find((item) => item.id === activeTemplateId.value) ?? list[0] ?? null
})
const tree = computed(() => activeTemplate.value?.tree ?? null)
const stages = computed(() => tree.value?.children ?? [])
const stats = computed(() => activeTemplate.value?.stats ?? EMPTY_STATS)

const nodeById = computed(() => {
  const map = new Map<string, ConsultPurposeNode>()
  if (tree.value) {
    const stack: ConsultPurposeNode[] = [tree.value]
    while (stack.length) {
      const node = stack.pop()!
      map.set(node.id, node)
      for (const butterfly of node.butterflies ?? []) map.set(butterfly.id, butterfly)
      for (const child of node.children ?? []) stack.push(child)
    }
  }
  return map
})

const selectedNode = computed(() => (selectedId.value ? nodeById.value.get(selectedId.value) ?? null : null))

const breadcrumb = computed(() => {
  const node = selectedNode.value
  if (!node) return []
  return (node.path ?? [])
    .slice(1)
    .filter((id) => id !== node.id)
    .map((id) => nodeById.value.get(id))
    .filter((item): item is ConsultPurposeNode => Boolean(item))
})

function select(id: string) {
  const node = nodeById.value.get(id)
  if (!node) return
  const path = node.path ?? []
  if (path.length) {
    const mapNext = new Set(mapCollapsed.value)
    for (const pathId of path) mapNext.delete(pathId)
    mapCollapsed.value = mapNext
  }
  selectedId.value = id
  nextTick(() => {
    mapRef.value?.ensureNodeVisible(id)
    if (window.innerWidth <= 1180) {
      detailRef.value?.scrollIntoView()
    }
  })
}

function expandAll() {
  mapCollapsed.value = new Set()
  nextTick(() => mapRef.value?.fitMap())
}

function collapseAll() {
  mapCollapsed.value = new Set(collectWithChildren(tree.value))
  nextTick(() => mapRef.value?.fitMap())
}

function toggleMapCollapse(id: string) {
  const next = new Set(mapCollapsed.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  mapCollapsed.value = next
  nextTick(() => mapRef.value?.ensureNodeVisible(id))
}

async function load() {
  loading.value = true
  loadError.value = ''
  const requested = typeof route.query.node === 'string' ? route.query.node : ''
  const requestedTemplate =
    typeof route.query.template === 'string' ? route.query.template : ''
  try {
    const result = await api.consultPurposes()
    payload.value = result
    clearPurposeBeatCache()
    const list = result.templates ?? []
    activeTemplateId.value =
      list.find((item) => item.id === requestedTemplate)?.id ??
      list.find((item) => item.id === result.meta.activeTemplateId)?.id ??
      list[0]?.id ??
      ''
    mapCollapsed.value = defaultCollapsedStages(tree.value)
    selectedId.value = ''
    if (requested && nodeById.value.has(requested)) {
      nextTick(() => select(requested))
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '读取咨询树失败'
  } finally {
    loading.value = false
    if (!requested) nextTick(() => mapRef.value?.fitMap())
  }
}

function setTemplate(id: string) {
  if (id === activeTemplateId.value) return
  activeTemplateId.value = id
  selectedId.value = ''
  clearPurposeBeatCache()
  mapCollapsed.value = defaultCollapsedStages(tree.value)
  router.replace({
    query: {
      ...route.query,
      template: id === payload.value?.meta.activeTemplateId ? undefined : id,
      node: undefined
    }
  })
  nextTick(() => mapRef.value?.fitMap())
}

function onTemplateChange(event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value
  if (value) setTemplate(value)
}

onMounted(() => {
  load()
})

watch([query, onlyMainline], () => {
  nextTick(() => mapRef.value?.fitMap())
})
</script>

<style scoped src="./consultPurposes.css"></style>
