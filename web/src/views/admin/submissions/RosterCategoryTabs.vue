<template>
  <div class="category-tabs" role="tablist" aria-label="名单分类">
    <button
      v-for="item in tabs"
      :key="item.key"
      class="category-tab"
      :class="{ on: category === item.key }"
      type="button"
      role="tab"
      :aria-selected="category === item.key"
      @click="$emit('update:category', item.key)"
    >
      <span>{{ item.label }}</span>
      <b>{{ countOf(item.key) }}</b>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  tabs: readonly { key: string; label: string }[]
  category: string
  counts: Record<string, number>
}>()

defineEmits<{ (event: 'update:category', value: string): void }>()

function countOf(key: string): number {
  return props.counts[key || 'all'] ?? 0
}
</script>

