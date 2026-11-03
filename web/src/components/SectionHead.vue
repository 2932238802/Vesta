<template>
  <header class="section-head">
    <span class="section-index">{{ String(index).padStart(2, '0') }}</span>
    <div class="section-copy">
      <h2>{{ title }}</h2>
      <p v-if="subtitle" class="section-sub">{{ subtitle }}</p>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  index: number
  title: string
  subtitle?: string
}>()
</script>

<style scoped>
.section-head {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 30px;
}

.section-index {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}

.section-copy h2 {
  font-size: 19px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.section-sub {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.6;
}
</style>
