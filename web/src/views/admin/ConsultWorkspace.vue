<template>
  <div class="consult-workspace">
    <AdminPageHeader eyebrow="咨询" title="写咨询稿" />

    <div v-if="loading" class="card empty">正在读取</div>
    <div v-else-if="loadError" class="card empty">
      {{ loadError }}
      <div class="empty-action">
        <button class="btn ghost small" type="button" @click="load">重新读取</button>
      </div>
    </div>

    <template v-else>
      <p v-if="!ai.configured" class="notice">
        AI 还没开通，暂时不能生成咨询稿。请联系技术人员开通。
      </p>
      <p v-if="!purposeTemplates.length" class="notice">
        咨询树数据还没有生成。请先运行 node prototype/consult-purpose-tree/generate.mjs。
      </p>

      <div class="workspace-grid">
        <ConsultComposeCard
          v-model:user-name="userName"
          v-model:purpose-template-id="purposeTemplateId"
          v-model:target-length="targetLength"
          v-model:profile="profile"
          :ai="ai"
          :purpose-templates="purposeTemplates"
          :busy="busy"
          :action-error="actionError"
          @generate="generate"
          @open-import="openImport"
        />

        <ConsultHistoryCard
          :runs="runs"
          :selected-run="selectedRun"
          :selected-run-id="selectedRunId"
          :loading-runs="loadingRuns"
          :history-collapsed="historyCollapsed"
          :busy="busy"
          :feedback-busy="feedbackBusy"
          :exporting="exporting"
          :open-section-seq="openSectionSeq"
          :dirty-sections="dirtySections"
          :pending-options="pendingOptions"
          :module-busy="moduleBusy"
          :saving-seq="savingSeq"
          :editor-error="editorError"
          @refresh="loadRuns"
          @toggle-history="toggleHistory"
          @toggle-run="toggleRun"
          @collapse-run="collapseRun"
          @export="exportRun"
          @copy-output="copyOutput"
          @retry="retryRun"
          @record-outcome="recordOutcome"
          @toggle-section="toggleSection"
          @collapse-modules="collapseModules"
          @mark-dirty="markDirty"
          @select-option="selectOption"
          @rewrite-option="rewriteByOption"
          @save-section="saveSection"
          @regenerate="regenerateSection"
          @add-section="addSection"
          @delete-section="deleteSection"
          @add-beat="addBeat"
          @remove-beat="removeBeat"
        />
      </div>

      <SaveBar
        :dirty="anyDirty"
        :saving="savingAll"
        save-label="保存全部修改"
        message="有模块还没有保存"
        @save="saveAll"
        @discard="discardChanges"
      />
    </template>

    <ConsultImportDialog
      v-model:search="importSearch"
      :open="importOpen"
      :loading="importLoading"
      :error="importError"
      :submissions="importSubmissions"
      :importing-id="importingSubmissionId"
      @close="closeImport"
      @import="importSubmission"
    />

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import SaveBar from '@/components/SaveBar.vue'
import ConsultComposeCard from '@/components/consult/ConsultComposeCard.vue'
import ConsultHistoryCard from '@/components/consult/ConsultHistoryCard.vue'
import ConsultImportDialog from '@/components/consult/ConsultImportDialog.vue'
import { useConsultImport } from '@/composables/useConsultImport'
import { useConsultRuns } from '@/composables/useConsultRuns'

const {
  loading,
  loadingRuns,
  loadError,
  actionError,
  busy,
  feedbackBusy,
  purposeTemplates,
  purposeTemplateId,
  userName,
  profile,
  targetLength,
  runs,
  selectedRunId,
  selectedRun,
  toast,
  ai,
  openSectionSeq,
  dirtySections,
  pendingOptions,
  anyDirty,
  moduleBusy,
  savingSeq,
  editorError,
  exporting,
  savingAll,
  historyCollapsed,
  load,
  loadRuns,
  toggleRun,
  collapseRun,
  toggleHistory,
  exportRun,
  toggleSection,
  collapseModules,
  markDirty,
  selectOption,
  saveSection,
  saveAll,
  discardChanges,
  rewriteByOption,
  regenerateSection,
  addSection,
  deleteSection,
  addBeat,
  removeBeat,
  generate,
  retryRun,
  recordOutcome,
  copyOutput,
  flash
} = useConsultRuns()

const {
  importOpen,
  importLoading,
  importError,
  importSearch,
  importSubmissions,
  importingSubmissionId,
  openImport,
  closeImport,
  importSubmission
} = useConsultImport({ profile, userName, flash })
</script>

<style scoped>
.workspace-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.85fr) minmax(420px, 1.45fr);
  gap: 20px;
  align-items: start;
}

@media (max-width: 1100px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .page-head {
    flex-direction: column;
  }
}
</style>
