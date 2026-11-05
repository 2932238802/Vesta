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
  grid-template-columns: 30px 1fr;
  gap: 12px;
  align-items: start;
  margin-bottom: 28px;
}

.section-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.02em;
  line-height: 1;
}

.section-copy h2 {
  font-size: 20px;
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: 0.01em;
}

.section-sub {
  margin-top: 7px;
  font-size: 13px;
  color: var(--ink-3);
  line-height: 1.7;
}
</style>
