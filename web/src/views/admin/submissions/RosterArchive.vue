<template>
  <section class="archive-section">
    <div class="archive-head">
      <button
        class="archive-toggle"
        type="button"
        :aria-expanded="open"
        aria-controls="roster-archive-body"
        @click="open = !open"
      >
        <h2>归档 · {{ archiveCount }} 人</h2>
        <span class="archive-hint">不在任何分组里的学员</span>
        <span class="archive-toggle-text">{{ open ? '收起' : '展开' }}</span>
      </button>
    </div>
    <div v-if="open" id="roster-archive-body">
      <RosterSelectionBar
        v-if="selected.size > 0"
        :selected-count="selected.size"
        unit="人"
        :batch-deleting="batchDeleting"
        :busy="groupSaving"
        @add-to-group="$emit('add-to-group')"
        @clear-selection="$emit('clear-selection')"
        @remove-selected="$emit('remove-selected')"
      />
      <RosterTable
        v-if="archive.length > 0"
        archived
        select-all-label="全选归档"
        empty-text="还没有归档学员"
        :loading="false"
        :error="''"
        :roster="archive"
        :selected="selected"
        :all-selected="allSelected"
        :some-selected="someSelected"
        :saving-status="savingStatus"
        :saving-cell="savingCell"
        category=""
        :all-count="archiveCount"
        :hidden-group-id="hiddenGroupId"
        :row-menu-items="rowMenuItems"
        @reload="$emit('reload')"
        @toggle-all="$emit('toggle-all', $event)"
        @toggle-row="forwardToggleRow"
        @open-row="forwardOpenRow"
        @change-status="forwardChangeStatus"
        @toggle-consulted="forwardToggleConsulted"
        @change-consult-result="forwardChangeConsultResult"
        @change-priority="forwardChangePriority"
        @row-menu="forwardRowMenu"
      />
      <div v-else class="empty">还没有归档学员</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { AdminRosterRow } from '@/api'
import type { RowMenuItem } from '@/components/row-menu'
import RosterSelectionBar from './RosterSelectionBar.vue'
import RosterTable from './RosterTable.vue'

defineProps<{
  archive: AdminRosterRow[]
  archiveCount: number
  selected: Set<string>
  allSelected: boolean
  someSelected: boolean
  savingStatus: string
  savingCell: string
  batchDeleting: boolean
  groupSaving: boolean
  rowMenuItems: (row: AdminRosterRow) => RowMenuItem[]
  hiddenGroupId?: string
}>()

const emit = defineEmits<{
  (event: 'add-to-group'): void
  (event: 'clear-selection'): void
  (event: 'remove-selected'): void
  (event: 'reload'): void
  (event: 'toggle-all', change: Event): void
  (event: 'toggle-row', id: string, change: Event): void
  (event: 'open-row', row: AdminRosterRow, event: MouseEvent | KeyboardEvent): void
  (event: 'change-status', row: AdminRosterRow, change: Event): void
  (event: 'toggle-consulted', row: AdminRosterRow, change: Event): void
  (event: 'change-consult-result', row: AdminRosterRow, change: Event): void
  (event: 'change-priority', row: AdminRosterRow, change: Event): void
  (event: 'row-menu', row: AdminRosterRow, key: string): void
}>()

const open = ref(true)

function forwardToggleRow(id: string, event: Event) {
  emit('toggle-row', id, event)
}
function forwardOpenRow(row: AdminRosterRow, event: MouseEvent | KeyboardEvent) {
  emit('open-row', row, event)
}
function forwardChangeStatus(row: AdminRosterRow, event: Event) {
  emit('change-status', row, event)
}
function forwardToggleConsulted(row: AdminRosterRow, event: Event) {
  emit('toggle-consulted', row, event)
}
function forwardChangeConsultResult(row: AdminRosterRow, event: Event) {
  emit('change-consult-result', row, event)
}
function forwardChangePriority(row: AdminRosterRow, event: Event) {
  emit('change-priority', row, event)
}
function forwardRowMenu(row: AdminRosterRow, key: string) {
  emit('row-menu', row, key)
}
</script>
