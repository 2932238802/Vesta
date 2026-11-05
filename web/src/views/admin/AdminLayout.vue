<template>
  <div class="admin" :class="{ 'sidebar-hidden': !sidebarOpen }">
    <aside class="sidebar" :class="{ closed: !sidebarOpen }">
      <div class="brand-block">
        <RouterLink class="brand" to="/admin">管理后台</RouterLink>
        <button
          class="sidebar-toggle"
          type="button"
          title="隐藏侧栏"
          aria-label="隐藏侧栏"
          @click="sidebarOpen = false"
        >«</button>
      </div>

      <nav class="nav" aria-label="后台导航">
        <section class="nav-group">
          <button
            class="nav-toggle"
            type="button"
            :aria-expanded="groups.survey"
            @click="toggleGroup('survey')"
          >
            <span>问卷</span>
            <span class="chev" :class="{ closed: !groups.survey }">⌄</span>
          </button>
          <div class="nav-links" :class="{ closed: !groups.survey }">
            <RouterLink to="/admin" exact-active-class="on">概览</RouterLink>
            <RouterLink to="/admin/invites" active-class="on">邀请链接</RouterLink>
            <RouterLink to="/admin/appointments" active-class="on">咨询预约</RouterLink>
            <RouterLink to="/admin/survey" active-class="on">问卷设置</RouterLink>
            <RouterLink to="/admin/submissions" active-class="on">答卷与名单</RouterLink>
            <RouterLink to="/admin/report" active-class="on">报告设置</RouterLink>
            <RouterLink to="/admin/skill" active-class="on">AI 分析规则</RouterLink>
          </div>
        </section>

        <section class="nav-group">
          <button
            class="nav-toggle"
            type="button"
            :aria-expanded="groups.consult"
            @click="toggleGroup('consult')"
          >
            <span>咨询</span>
            <span class="chev" :class="{ closed: !groups.consult }">⌄</span>
          </button>
          <div class="nav-links" :class="{ closed: !groups.consult }">
            <RouterLink to="/admin/consult" exact-active-class="on">写咨询稿</RouterLink>
            <RouterLink to="/admin/consult/purposes" active-class="on">咨询树</RouterLink>
            <RouterLink
              to="/admin/consult/collections"
              active-class="on"
              :class="{ on: route.path.startsWith('/admin/consult/collections') }"
            >收藏栏</RouterLink>
          </div>
        </section>
      </nav>

      <div class="account">
        <span class="account-name">{{ username || '管理员' }}</span>
        <button class="btn quiet" type="button" @click="logout">退出</button>
      </div>
    </aside>

    <button
      v-if="!sidebarOpen"
      class="sidebar-show"
      type="button"
      title="显示侧栏"
      aria-label="显示侧栏"
      @click="sidebarOpen = true"
    >☰</button>

    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { api, clearToken } from '@/api'

const SIDEBAR_KEY = 'vesta.admin.sidebar'
const GROUPS_KEY = 'vesta.admin.navGroups'

type NavGroup = 'survey' | 'consult'

const route = useRoute()
const router = useRouter()
const username = ref('')
const sidebarOpen = ref(true)
const groups = ref<Record<NavGroup, boolean>>({ survey: true, consult: true })

function toggleGroup(key: NavGroup) {
  groups.value = { ...groups.value, [key]: !groups.value[key] }
}

function restoreLayout() {
  try {
    sidebarOpen.value = localStorage.getItem(SIDEBAR_KEY) !== '0'
    const saved = JSON.parse(localStorage.getItem(GROUPS_KEY) ?? '{}') as Partial<
      Record<NavGroup, boolean>
    >
    groups.value = {
      survey: saved.survey !== false,
      consult: saved.consult !== false
    }
  } catch {
    // 本地存储不可用时保持默认展开
  }
}

onMounted(async () => {
  restoreLayout()
  try {
    const result = await api.me()
    username.value = result.user.username
  } catch {
    // 401 已由请求层处理
  }
})

watch(sidebarOpen, (open) => {
  try {
    localStorage.setItem(SIDEBAR_KEY, open ? '1' : '0')
  } catch {
    // 忽略存储失败
  }
})

watch(
  groups,
  (value) => {
    try {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(value))
    } catch {
      // 忽略存储失败
    }
  },
  { deep: true }
)

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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
}

.brand {
  font-size: 13px;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: var(--ink);
}

.sidebar-toggle {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-3);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.sidebar-toggle:hover {
  border-color: var(--line);
  background: var(--surface);
  color: var(--ink);
}

.nav {
  margin-top: 36px;
  display: grid;
  gap: 14px;
}

.nav-group {
  display: grid;
  gap: 2px;
}

.nav-group + .nav-group {
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.nav-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 7px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-2);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.nav-toggle:hover {
  color: var(--ink);
  background: rgba(0, 0, 0, 0.03);
}

.chev {
  font-size: 11px;
  color: var(--ink-3);
  transition: transform 0.15s ease;
}

.chev.closed {
  transform: rotate(-90deg);
}

.nav-links {
  display: grid;
  gap: 2px;
}

.nav-links.closed {
  display: none;
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

.sidebar.closed {
  display: none;
}

.sidebar-show {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 30;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(255, 253, 248, 0.94);
  color: var(--ink-2);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(27, 26, 23, 0.06);
  backdrop-filter: blur(6px);
}

.sidebar-show:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

@media (min-width: 901px) {
  .admin.sidebar-hidden {
    grid-template-columns: minmax(0, 1fr);
  }

  .admin.sidebar-hidden .main {
    padding-left: 72px;
  }
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

  .sidebar.closed {
    display: grid;
  }

  .sidebar-toggle,
  .sidebar-show {
    display: none;
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

  .nav-group,
  .nav-links,
  .nav-links.closed {
    display: contents;
  }

  .nav-toggle {
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
