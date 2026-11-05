<template>
  <div class="admin">
    <aside class="sidebar">
      <div class="brand-block">
        <RouterLink class="brand" to="/admin">管理后台</RouterLink>
      </div>

      <nav class="nav" aria-label="后台导航">
        <p class="nav-label">问卷</p>
        <RouterLink to="/admin" exact-active-class="on">概览</RouterLink>
        <RouterLink to="/admin/invites" active-class="on">邀请链接</RouterLink>
        <RouterLink to="/admin/appointments" active-class="on">咨询预约</RouterLink>
        <RouterLink to="/admin/survey" active-class="on">问卷设置</RouterLink>
        <RouterLink to="/admin/submissions" active-class="on">答卷与名单</RouterLink>
        <RouterLink to="/admin/report" active-class="on">报告设置</RouterLink>
        <RouterLink to="/admin/skill" active-class="on">AI 分析规则</RouterLink>
        <p class="nav-label second">咨询</p>
        <RouterLink to="/admin/consult" exact-active-class="on">写咨询稿</RouterLink>
        <RouterLink to="/admin/consult/tree" active-class="on">咨询路径</RouterLink>
        <RouterLink to="/admin/consult/indexes" active-class="on">路径索引</RouterLink>
        <RouterLink to="/admin/consult/templates" active-class="on">咨询稿风格</RouterLink>
      </nav>

      <div class="account">
        <span class="account-name">{{ username || '管理员' }}</span>
        <button class="btn quiet" type="button" @click="logout">退出</button>
      </div>
    </aside>

    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { api, clearToken } from '@/api'

const router = useRouter()
const username = ref('')

onMounted(async () => {
  try {
    const result = await api.me()
    username.value = result.user.username
  } catch {
    // 401 已由请求层处理
  }
})

async function logout() {
  try {
    await api.logout()
  } catch {
    // 会话已失效时也继续清理本地登录状态
  }
  clearToken()
  router.replace({ name: 'admin-login', query: { logout: '1' } })
}
</script>

<style scoped>
.admin {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 216px minmax(0, 1fr);
  background: var(--paper);
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 26px 16px 20px;
  background: #fbf9f2;
  border-right: 1px solid var(--line);
}

.brand-block {
  padding: 0 10px;
}

.brand {
  font-size: 13px;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: var(--ink);
}

.nav {
  margin-top: 42px;
  display: grid;
  gap: 2px;
}

.nav-label {
  padding: 0 12px;
  margin-bottom: 5px;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--ink-3);
}

.nav-label.second {
  margin-top: 18px;
}

.nav a {
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 13.5px;
  color: var(--ink-2);
  transition: background 0.15s ease, color 0.15s ease;
}

.nav a:hover {
  background: rgba(0, 0, 0, 0.03);
}

.nav a.on {
  background: rgba(47, 93, 70, 0.08);
  color: var(--accent);
}

.account {
  margin-top: auto;
  padding: 14px 10px 0;
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.account-name {
  font-size: 12px;
  color: var(--ink-3);
}

.main {
  padding: 36px 42px 90px;
  min-width: 0;
}

@media (max-width: 900px) {
  .admin {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: sticky;
    z-index: 20;
    height: auto;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    column-gap: 16px;
    row-gap: 10px;
    padding: 14px 16px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    background: rgba(251, 249, 242, 0.94);
    backdrop-filter: blur(10px);
  }

  .nav {
    grid-column: 1 / -1;
    grid-row: 2;
    margin-top: 0;
    display: flex;
    gap: 2px;
    flex-wrap: wrap;
    overflow: visible;
  }

  .nav-label,
  .nav-label.second {
    display: none;
  }

  .nav a {
    white-space: nowrap;
    padding: 8px 10px;
    font-size: 12.5px;
  }

  .account {
    grid-column: 2;
    grid-row: 1;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .account-name {
    display: none;
  }

  .main {
    padding: 24px 18px 72px;
  }
}
</style>
