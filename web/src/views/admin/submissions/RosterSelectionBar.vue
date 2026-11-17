<template>
  <div class="toolbar selection-bar" role="region" aria-label="批量操作">
    <strong>已选 {{ selectedCount }} {{ unit }}</strong>
    <span class="spacer" />
    <button
      class="btn ghost small"
      type="button"
      :disabled="busy || batchDeleting"
      @click="$emit('add-to-group')"
    >
      加入分组…
    </button>
    <button
      v-if="showRemoveFromGroup"
      class="btn ghost small"
      type="button"
      :disabled="busy || batchDeleting"
      @click="$emit('remove-from-group')"
    >
      移出本组
    </button>
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
withDefaults(
  defineProps<{
    selectedCount: number
    batchDeleting?: boolean
    busy?: boolean
    showRemoveFromGroup?: boolean
    unit?: string
  }>(),
  { batchDeleting: false, busy: false, showRemoveFromGroup: false, unit: '条' }
)

defineEmits<{
  (event: 'add-to-group'): void
  (event: 'remove-from-group'): void
  (event: 'clear-selection'): void
  (event: 'remove-selected'): void
}>()
</script>
