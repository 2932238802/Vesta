<template>
  <SectionHead :index="index" :title="block.title" />
  <div class="prose">
    <p v-for="(paragraph, i) in block.paragraphs" :key="i" :class="{ first: i === 0 }">
      {{ paragraph }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ReportBlock } from '@shared/types'
import SectionHead from '../SectionHead.vue'

defineProps<{
  block: ReportBlock & { type: 'section' }
  index: number
}>()
</script>

<style scoped src="./shared/prose.css"></style>

<style scoped src="./shared/media-text.css"></style>
