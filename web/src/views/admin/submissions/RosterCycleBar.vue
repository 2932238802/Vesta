<template>
  <div ref="barRef" class="cycle-bar" role="tablist" aria-label="期次">
    <button
      class="cycle-chip"
      type="button"
      role="tab"
      :aria-selected="modelValue === 'all'"
      :class="{ on: modelValue === 'all' }"
      @click="modelValue = 'all'"
    >
      全部 <b>{{ total }}</b>
    </button>
    <button
      v-for="item in weeks"
      :key="item.key"
      class="cycle-chip"
      type="button"
      role="tab"
      :aria-selected="modelValue === item.key"
      :class="{ on: modelValue === item.key, current: item.current }"
      :title="`${item.start} 至 ${item.end}`"
      @click="modelValue = item.key"
    >
      <span v-if="item.current">本期 </span>
      <span v-else-if="item.key === previousKey">上期 </span>
      {{ item.label }} <b>{{ item.count }}</b>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { AdminRosterWeek } from '@/api'

const props = defineProps<{
  weeks: AdminRosterWeek[]
  total: number
}>()

const modelValue = defineModel<string>({ required: true })
const barRef = ref<HTMLElement | null>(null)

/** 本期之后紧挨着的那一期就是上期（weeks 已按倒序排列）。 */
const previousKey = computed(() => {
  const index = props.weeks.findIndex((item) => item.current)
  return index >= 0 ? props.weeks[index + 1]?.key ?? '' : ''
})

function scrollCurrent() {
  barRef.value
    ?.querySelector<HTMLElement>('.cycle-chip.current')
    ?.scrollIntoView({ block: 'nearest', inline: 'center' })
}

watch(() => props.weeks, () => nextTick(scrollCurrent), { immediate: true })
</script>
