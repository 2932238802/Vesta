<template>
  <nav class="settings-nav" aria-label="设置">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="settings-nav-item"
      :class="{ on: route.path === item.to }"
      :aria-current="route.path === item.to ? 'page' : undefined"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const items = [
  { to: '/admin/survey', label: '问卷设置' },
  { to: '/admin/report', label: '报告设置' },
  { to: '/admin/skill', label: 'AI 分析规则' }
]
</script>

<style scoped>
.settings-nav {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  margin-bottom: 22px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #f1ede4;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}

.settings-nav::-webkit-scrollbar {
  display: none;
}

.settings-nav-item {
  flex: 0 0 auto;
  padding: 7px 14px;
  border-radius: 9px;
  color: var(--ink-3);
  font-size: 13px;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.settings-nav-item:hover {
  color: var(--ink);
}

.settings-nav-item.on {
  background: var(--surface);
  color: var(--accent);
  box-shadow: 0 1px 3px rgba(27, 26, 23, 0.09);
}

@media (max-width: 900px) {
  .settings-nav {
    width: 100%;
  }
}
</style>
