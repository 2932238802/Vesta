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

  <RosterSelectionBar
    v-else
    :selected-count="selectedCount"
    :batch-deleting="batchDeleting"
    :busy="groupSaving"
    :show-remove-from-group="showRemoveFromGroup"
    @add-to-group="$emit('add-to-group')"
    @remove-from-group="$emit('remove-from-group')"
    @clear-selection="$emit('clear-selection')"
    @remove-selected="$emit('remove-selected')"
  />
</template>

<script setup lang="ts">
import RosterSelectionBar from './RosterSelectionBar.vue'

withDefaults(
  defineProps<{
    selectedCount: number
    batchDeleting: boolean
    showRemoveFromGroup?: boolean
    groupSaving?: boolean
  }>(),
  { showRemoveFromGroup: false, groupSaving: false }
)

const q = defineModel<string>('q', { required: true })

defineEmits<{
  (event: 'add-to-group'): void
  (event: 'remove-from-group'): void
  (event: 'clear-selection'): void
  (event: 'remove-selected'): void
}>()
</script>
