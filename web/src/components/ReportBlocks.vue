<template>
  <article class="report">
    <header class="report-head">
      <div v-if="payload.theme.brand" class="brand">{{ payload.theme.brand }}</div>
      <div class="meta">
        <span>{{ payload.name || '学员' }}</span>
        <span class="dot-sep">·</span>
        <span>{{ dateText }}</span>
      </div>
    </header>

    <section
      v-for="(block, index) in payload.blocks"
      :key="index"
      class="block"
      :class="`block-${block.type}`"
    >
      <HeroBlock v-if="block.type === 'hero'" :block="block" :claim-link="claimLink" />
      <TargetBlock v-else-if="block.type === 'target'" :block="block" :index="index" />
      <RadarBlock
        v-else-if="block.type === 'radar'"
        :block="block"
        :index="index"
        :payload="payload"
      />
      <StrengthsBlock v-else-if="block.type === 'strengths'" :block="block" :index="index" />
      <AssetsBlock v-else-if="block.type === 'assets'" :block="block" :index="index" />
      <GapsBlock v-else-if="block.type === 'gaps'" :block="block" :index="index" />
      <ConsistencyBlock
        v-else-if="block.type === 'consistency'"
        :block="block"
        :index="index"
      />
      <CognitionBlock v-else-if="block.type === 'cognition'" :block="block" :index="index" />
      <ActionsBlock v-else-if="block.type === 'actions'" :block="block" :index="index" />
      <SourcesBlock
        v-else-if="block.type === 'sources'"
        :block="block"
        :index="index"
        :allow-retry="allowRetry"
        @retry="emit('retry')"
      />
      <NoteBlock v-else-if="block.type === 'note'" :block="block" />
      <ScorecardBlock
        v-else-if="block.type === 'scorecard'"
        :block="block"
        :index="index"
        :payload="payload"
      />
      <GapBlock v-else-if="block.type === 'gap'" :block="block" :index="index" />
      <JobMapBlock v-else-if="block.type === 'jobmap'" :block="block" :index="index" />
      <RoadmapBlock v-else-if="block.type === 'roadmap'" :block="block" :index="index" />
      <ChecklistBlock v-else-if="block.type === 'checklist'" :block="block" :index="index" />
      <SectionBlock v-else-if="block.type === 'section'" :block="block" :index="index" />
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ReportPayload } from '@shared/types'
import HeroBlock from './report-blocks/HeroBlock.vue'
import TargetBlock from './report-blocks/TargetBlock.vue'
import RadarBlock from './report-blocks/RadarBlock.vue'
import StrengthsBlock from './report-blocks/StrengthsBlock.vue'
import AssetsBlock from './report-blocks/AssetsBlock.vue'
import GapsBlock from './report-blocks/GapsBlock.vue'
import ConsistencyBlock from './report-blocks/ConsistencyBlock.vue'
import CognitionBlock from './report-blocks/CognitionBlock.vue'
import ActionsBlock from './report-blocks/ActionsBlock.vue'
import SourcesBlock from './report-blocks/SourcesBlock.vue'
import NoteBlock from './report-blocks/NoteBlock.vue'
import ScorecardBlock from './report-blocks/ScorecardBlock.vue'
import GapBlock from './report-blocks/GapBlock.vue'
import JobMapBlock from './report-blocks/JobMapBlock.vue'
import RoadmapBlock from './report-blocks/RoadmapBlock.vue'
import ChecklistBlock from './report-blocks/ChecklistBlock.vue'
import SectionBlock from './report-blocks/SectionBlock.vue'
import { formatDate } from '../format'

const props = defineProps<{
  payload: ReportPayload
  claimLink?: boolean
  allowRetry?: boolean
}>()
const emit = defineEmits<{ retry: [] }>()

const dateText = computed(() => {
  const date = new Date(props.payload.createdAt)
  if (Number.isNaN(date.getTime())) return props.payload.createdAt.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
})
</script>

<style scoped>
.report-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
}

.brand {
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--ink-2);
}

.meta {
  display: flex;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}

.dot-sep {
  color: var(--line-strong);
}

.block {
  padding: 52px 0;
  border-bottom: 1px solid var(--line);
}

.block:last-child {
  border-bottom: 0;
  padding-bottom: 24px;
}

.block-hero {
  padding-top: 44px;
}

/* ---------- 阅读版式：同一套字号、间距和颜色 token ---------- */

.report {
  --report-gap: 64px;
  --report-text: 15.5px;
  --report-lead: 17px;
  --report-label: 12px;
  color: var(--ink);
}

.report-head {
  padding-bottom: 26px;
  border-bottom: 0;
}

.brand {
  font-size: 12.5px;
  letter-spacing: 0.24em;
}

.meta {
  font-size: 12.5px;
  letter-spacing: 0.03em;
}

.block {
  padding: var(--report-gap) 0;
  border-bottom: 0;
}

.block:last-child {
  padding-bottom: 8px;
}

.block-hero {
  padding-top: 40px;
}
</style>

<style scoped>
@media (max-width: 720px) {
  .block {
    padding: 40px 0;
  }

  .block-hero {
    padding-top: 34px;
  }

  .report {
    --report-gap: 48px;
    --report-text: 15px;
    --report-lead: 16.5px;
  }

  .report-head {
    padding-bottom: 20px;
  }

  .block {
    padding: 48px 0;
  }

  .block-hero {
    padding-top: 26px;
  }
}
</style>

<style scoped>
@media print {
  .block {
    break-inside: avoid;
  }

  .block {
    padding: 34px 0;
  }
}
</style>
