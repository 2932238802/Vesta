<template>
  <div class="copy-grid">
    <ReportCopyHero :template="template" />
    <ReportCopyTarget :template="template" />
    <ReportCopyBasics :template="template" />
    <ReportCopyCognition :template="template" />
    <ReportCopyActions :template="template" :actions="actions" />
  </div>
</template>

<script setup lang="ts">
import type { ReportTemplate } from '@shared/types'
import type { ReportEditorActions } from './useReportEditor'
import ReportCopyHero from './ReportCopyHero.vue'
import ReportCopyTarget from './ReportCopyTarget.vue'
import ReportCopyBasics from './ReportCopyBasics.vue'
import ReportCopyCognition from './ReportCopyCognition.vue'
import ReportCopyActions from './ReportCopyActions.vue'

defineProps<{
  template: ReportTemplate
  actions: ReportEditorActions
}>()
</script>
