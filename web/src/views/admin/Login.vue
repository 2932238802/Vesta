<template>
  <div class="login">
    <section class="aside">
      <div>
        <p class="eyebrow">大学现状自评</p>
        <h1 class="serif">看得见的现状<br />才有下一步</h1>
      </div>
    </section>

    <section class="form-side">
      <form class="form" @submit.prevent="submit">
        <p class="eyebrow">管理后台</p>
        <h2>登录</h2>

        <label class="field">
          <span>账号</span>
          <input
            v-model="username"
            class="input"
            type="text"
            autocomplete="username"
            placeholder="账号"
          />
        </label>
        <label class="field">
          <span>密码</span>
          <input
            v-model="password"
            class="input"
            type="password"
            autocomplete="current-password"
            placeholder="密码"
          />
        </label>

        <p v-if="error" class="notice">{{ error }}</p>

        <button class="btn wide" type="submit" :disabled="loading">
          {{ loading ? '正在登录' : '进入后台' }}
        </button>

        <p class="login-note">登录状态会保留 30 天；可在多台设备同时登录，退出只影响当前设备。</p>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, setToken } from '@/api'

const router = useRouter()
const route = useRoute()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

onMounted(() => {
  if (route.query.expired === '1') {
    error.value = '登录已失效，请重新登录'
  }
  void tryDevLogin()
})

async function tryDevLogin() {
  if (route.query.logout === '1') return
  loading.value = true
  try {
    const result = await api.devLogin()
    setToken(result.token)
    const next = typeof route.query.next === 'string' ? route.query.next : '/admin'
    await router.replace(next)
  } catch {
    // 生产环境或关闭 DEV_GUEST_LOGIN 时继续显示账号密码表单。
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!username.value.trim() || !password.value) {
    error.value = '账号和密码都要填'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await api.login(username.value.trim(), password.value)
    setToken(result.token)
    const next = typeof route.query.next === 'string' ? route.query.next : '/admin'
    router.replace(next)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
}

.aside {
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #eeeade;
  border-right: 1px solid var(--line);
}

.aside h1 {
  margin-top: 80px;
  font-size: clamp(34px, 4vw, 52px);
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: 0.01em;
}

.form-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.form {
  width: 100%;
  max-width: 340px;
  display: grid;
  gap: 18px;
}

.form h2 {
  font-size: 26px;
  font-weight: 600;
  margin-top: -6px;
}

.login-note {
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--ink-3);
  text-align: center;
}

@media (max-width: 820px) {
  .login {
    grid-template-columns: 1fr;
  }

  .aside {
    padding: 32px 24px 30px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .aside h1 {
    margin-top: 34px;
    font-size: 32px;
  }

  .form-side {
    padding: 44px 24px 80px;
  }
}
</style>
