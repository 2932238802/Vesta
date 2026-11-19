<template>
  <div class="report-page" :style="themeStyle">
    <ReportActions
      :has-payload="Boolean(payload)"
      :exporting="exporting"
      :exporting-pdf="exportingPdf"
      @save-image="saveImage"
      @save-pdf="savePdf"
      @copy-link="copyLink"
    />

    <ReportStatus
      v-if="loading || Boolean(error) || !payload"
      :loading="loading"
      :error="error"
      :has-payload="Boolean(payload)"
      :report-status="reportStatus"
      :report-error="reportError"
      :retryable="retryable"
      :retrying="retrying"
      :slow="slow"
      :poll-note="pollNote"
      :wait-copy="waitCopy"
      @retry="retryReport"
    />

    <main v-else-if="payload" class="wrap fade-in">
      <p v-if="reportNotice" class="notice report-notice">{{ reportNotice }}</p>
      <p v-if="reportError" class="notice report-notice report-error">{{ reportError }}</p>
      <div ref="sheetEl" class="sheet">
        <ReportBlocks
          :payload="payload"
          :claim-link="!claimed"
          :allow-retry="reportStatus !== 'ready'"
          @retry="retryReport"
        />
      </div>

      <ReportClaim v-model:claimed="claimed" :slug="slug" :claim="payload.claim" />

      <footer class="report-foot">
        <p class="quiet">{{ payload.footer.note }}</p>
      </footer>
    </main>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>

    <ReportShot v-if="shot" :src="shot" :slug="slug" @close="shot = ''" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ReportBlocks from '@/components/ReportBlocks.vue'
import ReportActions from '@/components/report/ReportActions.vue'
import ReportStatus from '@/components/report/ReportStatus.vue'
import ReportClaim from '@/components/report/ReportClaim.vue'
import ReportShot from '@/components/report/ReportShot.vue'
import { useReportLoader } from '@/components/report/useReportLoader'
import { useReportExport } from '@/components/report/useReportExport'

const route = useRoute()
const slug = String(route.params.slug ?? '')
const {
  payload,
  loading,
  error,
  reportNotice,
  reportError,
  retryable,
  retrying,
  slow,
  pollNote,
  reportStatus,
  claimed,
  waitCopy,
  retryReport
} = useReportLoader(slug)
const sheetEl = ref<HTMLElement | null>(null)
const { exporting, exportingPdf, shot, toast, savePdf, saveImage, copyLink } = useReportExport(
  slug,
  payload,
  sheetEl
)

const themeStyle = computed<Record<string, string>>(() => ({
  '--accent': payload.value?.theme.accent ?? '#2f5d46',
  '--paper': payload.value?.theme.paper ?? '#f7f4ed',
  background: payload.value?.theme.paper ?? '#f7f4ed'
}))
</script>

<style scoped src="./reportView.css"></style>
