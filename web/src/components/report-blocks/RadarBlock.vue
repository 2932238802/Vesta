<template>
  <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
  <RadarChart :dimensions="block.dimensions" :accent="payload.theme.accent" />
</template>

<script setup lang="ts">
import type { ReportBlock, ReportPayload } from '@shared/types'
import RadarChart from '../RadarChart.vue'
import SectionHead from '../SectionHead.vue'

defineProps<{
  block: ReportBlock & { type: 'radar' }
  index: number
  payload: ReportPayload
}>()
</script>


