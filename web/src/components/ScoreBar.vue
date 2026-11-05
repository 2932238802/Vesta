<template>
  <div class="score-bar">
    <div class="row">
      <span class="name">{{ name }}</span>
      <span class="value">{{ score }}</span>
    </div>
    <div class="track" role="img" :aria-label="`${name} ${score} 分`">
      <div class="fill" :style="{ width: `${width}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  score: number
}>()

const width = computed(() => Math.max(0, Math.min(100, props.score)))
</script>

<style scoped>
.score-bar {
  display: grid;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.name {
  font-size: 13.5px;
  color: var(--ink-2);
}

.value {
  padding: 2px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.4;
  color: var(--accent);
}

.track {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, var(--surface));
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: inherit;
  background: color-mix(in srgb, var(--accent) 78%, #ffffff);
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
