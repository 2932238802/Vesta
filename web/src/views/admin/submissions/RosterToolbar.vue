<template>
  <div v-if="selectedCount === 0" class="toolbar list-toolbar">
    <input
      v-model="q"
      class="input search"
      type="search"
      placeholder="搜索姓名、备注、渠道（/ 搜索）"
      data-admin-search
    />
  </div>

  <div v-else class="toolbar selection-bar" role="region" aria-label="批量操作">
    <strong>已选 {{ selectedCount }} 条</strong>
    <span class="spacer" />
    <button class="btn ghost small" type="button" @click="$emit('clear-selection')">
      取消选择
    </button>
    <button
      class="btn ghost small danger-btn"
      type="button"
      :disabled="batchDeleting"
      @click="$emit('remove-selected')"
    >
      {{ batchDeleting ? '删除中' : '批量删除' }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  selectedCount: number
  batchDeleting: boolean
}>()

const q = defineModel<string>('q', { required: true })

defineEmits<{
  (event: 'clear-selection'): void
  (event: 'remove-selected'): void
}>()
</script>
