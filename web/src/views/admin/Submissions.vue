<template>
  <div class="submissions-page">
    <AdminPageHeader eyebrow="学员" title="学员名单">
      <template #actions>
        <span class="quiet small">{{ roster.length }} 人</span>
        <button
          class="btn ghost small export-btn"
          type="button"
          :disabled="exporting"
          @click="exportCsv"
        >
          {{ exporting ? '正在导出' : '导出答卷 CSV' }}
        </button>
      </template>
    </AdminPageHeader>

    <RosterCycleBar v-model="week" :weeks="weeks" :total="allWeeksCount" />

    <RosterCategoryTabs v-model:category="category" :tabs="ROSTER_TABS" :counts="counts" />

    <RosterToolbar
      v-model:q="q"
      :selected-count="selected.size"
      :batch-deleting="batchDeleting"
      @clear-selection="clearSelection"
      @remove-selected="removeSelected"
    />

    <RosterTable
      :loading="loading"
      :error="error"
      :roster="roster"
      :empty-text="emptyText"
      :selected="selected"
      :all-selected="allSelected"
      :some-selected="someSelected"
      :saving-status="savingStatus"
      :score-column-label="scoreColumnLabel"
      :has-week-filter="week !== 'all'"
      :searching="searching"
      :all-weeks-count="allWeeksCount"
      :category="category"
      :all-count="counts.all ?? 0"
      :row-menu-items="rowMenuItems"
      @reload="load"
      @search-all-weeks="showAllWeeks"
      @clear-category="category = ''"
      @toggle-all="toggleAll"
      @toggle-row="toggleRow"
      @open-row="openRow"
      @change-status="changeStatus"
      @row-menu="onRowMenu"
    />

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import { useSlashFocus } from '@/useHotkeys'
import { ROSTER_TABS } from './submissions/rosterMeta'
import { useRoster } from './submissions/useRoster'
import { useRosterActions } from './submissions/useRosterActions'
import RosterCycleBar from './submissions/RosterCycleBar.vue'
import RosterCategoryTabs from './submissions/RosterCategoryTabs.vue'
import RosterToolbar from './submissions/RosterToolbar.vue'
import RosterTable from './submissions/RosterTable.vue'

const state = useRoster()
const actions = useRosterActions(state)

const {
  roster,
  counts,
  weeks,
  week,
  loading,
  error,
  q,
  category,
  toast,
  selected,
  allSelected,
  someSelected,
  allWeeksCount,
  searching,
  scoreColumnLabel,
  emptyText,
  load,
  toggleRow,
  toggleAll,
  clearSelection,
  showAllWeeks
} = state

const {
  exporting,
  savingStatus,
  batchDeleting,
  removeSelected,
  openRow,
  rowMenuItems,
  onRowMenu,
  changeStatus,
  exportCsv
} = actions

useSlashFocus()
onMounted(load)
</script>

<style src="./submissions/shared.css"></style>
