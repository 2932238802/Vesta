<template>
  <div class="admin">
    <aside class="sidebar">
      <div class="brand-block">
        <RouterLink class="brand" to="/admin">管理后台</RouterLink>
      </div>

      <nav class="nav">
        <RouterLink to="/admin" exact-active-class="on">概览</RouterLink>
        <RouterLink to="/admin/invites" active-class="on">邀请链接</RouterLink>
        <RouterLink to="/admin/submissions" active-class="on">答卷与名单</RouterLink>
        <RouterLink to="/admin/appointments" active-class="on">咨询时间预约</RouterLink>
        <RouterLink to="/admin/survey" active-class="on">问卷</RouterLink>
        <RouterLink to="/admin/report" active-class="on">报告</RouterLink>
        <RouterLink to="/admin/skill" active-class="on">分析 Skill</RouterLink>
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
  router.replace('/admin/login')
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
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    background: rgba(251, 249, 242, 0.94);
    backdrop-filter: blur(10px);
  }

  .nav {
    margin-top: 0;
    display: flex;
    gap: 2px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .nav::-webkit-scrollbar {
    display: none;
  }

  .nav a {
    white-space: nowrap;
    padding: 7px 10px;
    font-size: 12.5px;
  }

  .account {
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
