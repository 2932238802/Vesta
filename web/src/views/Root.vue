<template>
  <div class="root">
    <main class="center">
      <p class="eyebrow">大学现状自评</p>
      <h1 class="serif">这一步，需要一条<br />属于你的链接</h1>
      <p class="muted">
        问卷是一次性的，链接由发给你的人生成
        <br />
        如果你还没有收到，先找对方要一条
      </p>
      <RouterLink class="admin-link" to="/admin">管理员入口</RouterLink>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  max-width: 720px;
  margin: 0 auto;
  padding: 28px 24px 60px;
}

.center {
  margin: auto 0;
  padding-bottom: 40px;
}

h1 {
  margin: 20px 0 24px;
  font-size: clamp(32px, 7vw, 48px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.01em;
}

p.muted {
  font-size: 14.5px;
  line-height: 1.9;
  color: var(--ink-2);
}

.admin-link {
  display: inline-block;
  margin-top: 44px;
  font-size: 12.5px;
  color: var(--ink-3);
  border-bottom: 1px solid var(--line-strong);
  padding-bottom: 2px;
}

.admin-link:hover {
  color: var(--ink);
}
</style>
