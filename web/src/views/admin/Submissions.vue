<template>
  <div class="submissions-page">
    <AdminPageHeader eyebrow="学员" title="学员名单">
      <template #actions>
        <span class="quiet small">
          {{ roster.length }} 人<template v-if="archiveCount"> · 归档 {{ archiveCount }} 人</template>
        </span>
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

    <RosterGroupBar
      :groups="visibleGroups"
      :group-id="groupId"
      :total="groupBarTotal"
      @update:group-id="selectGroup"
      @create="openCreateGroup"
      @manage="openManageGroups"
    />

    <RosterCategoryTabs v-model:category="category" :tabs="ROSTER_TABS" :counts="counts" />

    <RosterToolbar
      v-model:q="q"
      :selected-count="selected.size"
      :batch-deleting="batchDeleting"
      :show-remove-from-group="!!groupId"
      :group-saving="groupSaving"
      @add-to-group="openSelectedToGroup"
      @remove-from-group="removeSelectedFromCurrentGroup"
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
      :saving-cell="savingCell"
      :category="category"
      :all-count="counts.all ?? 0"
      :hidden-group-id="defaultGroupId"
      :row-menu-items="rowMenuItems"
      @reload="load"
      @clear-category="category = ''"
      @toggle-all="toggleAll"
      @toggle-row="toggleRow"
      @open-row="openRow"
      @change-status="changeStatus"
      @toggle-consulted="toggleConsulted"
      @change-consult-result="changeConsultResult"
      @change-priority="changePriority"
      @row-menu="onRowMenu"
    />

    <RosterArchive
      :archive="archive"
      :archive-count="archiveCount"
      :selected="archiveSelected"
      :all-selected="archiveAllSelected"
      :some-selected="archiveSomeSelected"
      :saving-status="savingStatus"
      :saving-cell="savingCell"
      :batch-deleting="batchDeleting"
      :group-saving="groupSaving"
      :hidden-group-id="defaultGroupId"
      :row-menu-items="rowMenuItems"
      @add-to-group="openArchiveToGroup"
      @clear-selection="clearArchiveSelection"
      @remove-selected="removeArchiveSelected"
      @reload="load"
      @toggle-all="toggleArchiveAll"
      @toggle-row="toggleArchiveRow"
      @open-row="openRow"
      @change-status="changeStatus"
      @toggle-consulted="toggleConsulted"
      @change-consult-result="changeConsultResult"
      @change-priority="changePriority"
      @row-menu="onRowMenu"
    />

    <RosterGroupDialog
      :open="groupDialogOpen"
      :mode="groupDialogMode"
      :groups="visibleGroups"
      :selected-count="groupTargetIds.length"
      :saving="groupSaving"
      :deleting-id="groupDeletingId"
      :default-group-id="defaultGroupId"
      :group-count="groupList.length"
      @close="closeGroupDialog"
      @create="createGroup"
      @create-and-join="createGroupAndJoin"
      @join="assignSelected"
      @delete="deleteGroup"
    />

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import { useSlashFocus } from '@/useHotkeys'
import { ROSTER_TABS } from './submissions/rosterMeta'
import { useRoster } from './submissions/useRoster'
import { useRosterActions } from './submissions/useRosterActions'
import { useRosterGroups } from './submissions/useRosterGroups'
import RosterGroupBar from './submissions/RosterGroupBar.vue'
import RosterCategoryTabs from './submissions/RosterCategoryTabs.vue'
import RosterToolbar from './submissions/RosterToolbar.vue'
import RosterTable from './submissions/RosterTable.vue'
import RosterArchive from './submissions/RosterArchive.vue'
import RosterGroupDialog from './submissions/RosterGroupDialog.vue'

const state = useRoster()
const groupActions = useRosterGroups(state)
const actions = useRosterActions(state, {
  openPickGroups: groupActions.openPickGroups,
  removeFromGroup: groupActions.removeFromCurrentGroup
})

const {
  roster,
  archive,
  groups: groupList,
  visibleGroups,
  defaultGroupId,
  archiveCount,
  groupId,
  counts,
  loading,
  error,
  q,
  category,
  toast,
  selected,
  archiveSelected,
  allSelected,
  someSelected,
  archiveAllSelected,
  archiveSomeSelected,
  emptyText,
  load,
  toggleRow,
  toggleAll,
  toggleArchiveRow,
  toggleArchiveAll,
  clearSelection,
  clearArchiveSelection,
  selectGroup
} = state

const {
  exporting,
  savingStatus,
  savingCell,
  batchDeleting,
  removeSelected,
  removeArchiveSelected,
  openRow,
  rowMenuItems,
  onRowMenu,
  changeStatus,
  toggleConsulted,
  changeConsultResult,
  changePriority,
  exportCsv
} = actions

const {
  groupDialogOpen,
  groupDialogMode,
  groupTargetIds,
  groupSaving,
  groupDeletingId,
  openCreateGroup,
  openManageGroups,
  openPickGroups,
  closeGroupDialog,
  createGroup,
  createGroupAndJoin,
  assignSelected,
  removeSelectedFromCurrentGroup,
  deleteGroup
} = groupActions

/** 「全部」chip 与组计数同口径：搜索 + 状态 tab，不含分组筛选。 */
const groupBarTotal = computed(() => counts.value[category.value || 'all'] ?? 0)

function openSelectedToGroup() {
  openPickGroups([...selected.value])
}

function openArchiveToGroup() {
  openPickGroups([...archiveSelected.value])
}

useSlashFocus()
onMounted(load)
</script>

<style src="./submissions/shared.css"></style>
