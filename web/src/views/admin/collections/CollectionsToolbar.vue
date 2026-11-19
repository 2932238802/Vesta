<template>
  <section class="card toolbar">
    <div class="kind-tabs" role="tablist" aria-label="收藏类型">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="kind-tab"
        :class="{ on: filter === tab.value }"
        type="button"
        role="tab"
        :aria-selected="filter === tab.value"
        @click="filter = tab.value"
      >
        {{ tab.label }}
        <span class="tab-count">{{ countFor(tab.value) }}</span>
      </button>
    </div>
    <input
      v-model="query"
      class="search"
      type="search"
      placeholder="搜索金句、咨询稿、出处、标签…"
      aria-label="搜索收藏"
    />
  </section>
</template>

<script setup lang="ts">
import type { ConsultCollectionKind } from '@/api'

defineProps<{
  tabs: { value: ConsultCollectionKind; label: string }[]
  countFor: (value: ConsultCollectionKind) => number
}>()

const filter = defineModel<ConsultCollectionKind>('filter', { required: true })
const query = defineModel<string>('query', { required: true })
</script>

<style scoped src="./collectionsToolbar.css"></style>
