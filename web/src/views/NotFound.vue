<template>
  <div class="page">
    <main class="center">
      <p class="eyebrow">404</p>
      <h1 class="serif">这一页不在了</h1>
      <p class="muted">链接可能已经失效，或者地址写错了</p>
      <RouterLink class="btn ghost" to="/">回到首页</RouterLink>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.page {
  min-height: 100vh;
  max-width: 620px;
  margin: 0 auto;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
}

.center {
  margin: auto 0;
  padding-bottom: 80px;
}

h1 {
  margin: 16px 0 12px;
  font-size: 34px;
  font-weight: 500;
}

.muted {
  color: var(--ink-2);
  font-size: 14px;
  margin-bottom: 32px;
}
</style>
