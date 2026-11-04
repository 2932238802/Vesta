<template>
  <div class="invites-page">
    <section v-if="!created.length" class="card generator-card">
      <form class="form" @submit.prevent="generate">
        <div class="mode">
          <button type="button" :class="{ on: mode === 'single' }" @click="mode = 'single'">
            单个
          </button>
          <button type="button" :class="{ on: mode === 'bulk' }" @click="mode = 'bulk'">
            批量
          </button>
        </div>

        <label v-if="mode === 'single'" class="field">
          <span>学员姓名</span>
          <input v-model="name" class="input" type="text" maxlength="40" placeholder="例：小林" />
        </label>
        <label v-else class="field">
          <span>学员姓名，一行一个</span>
          <textarea
            v-model="namesText"
            class="textarea"
            rows="7"
            placeholder="小林&#10;小周&#10;小陈"
          />
        </label>

        <div class="field-row">
          <label class="field">
            <span>备注（可选）</span>
            <input v-model="note" class="input" type="text" maxlength="200" placeholder="例：大二 汉语言" />
          </label>
          <label class="field">
            <span>渠道（可选）</span>
            <input v-model="channel" class="input" type="text" maxlength="40" placeholder="例：朋友圈" />
          </label>
        </div>

        <label class="field">
          <span>过期时间（可选）</span>
          <input v-model="expiresAt" class="input" type="datetime-local" />
        </label>

        <p v-if="formError" class="notice">{{ formError }}</p>

        <div class="form-actions">
          <button class="btn" type="submit" :disabled="creating">
            {{ creating ? '正在生成' : '生成链接' }}
          </button>
        </div>
      </form>
    </section>

    <section v-else class="card result-card">
      <header class="result-head">
        <div>
          <p class="eyebrow">生成完成</p>
          <h2>已生成 {{ created.length }} 条链接</h2>
        </div>
        <button class="btn ghost small" type="button" @click="reset">再生成一批</button>
      </header>

      <div class="created-list">
        <div v-for="item in created" :key="item.url" class="created-item">
          <span class="created-name">{{ item.name }}</span>
          <span class="created-url">{{ item.url }}</span>
          <button class="btn quiet" type="button" @click="copy(item.url)">复制</button>
        </div>
      </div>

      <div class="result-actions">
        <button class="btn ghost" type="button" @click="copyAll">复制全部链接</button>
        <RouterLink class="btn" to="/admin/submissions">去答卷与名单查看</RouterLink>
      </div>
    </section>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api'

const mode = ref<'single' | 'bulk'>('single')
const name = ref('')
const namesText = ref('')
const note = ref('')
const channel = ref('')
const expiresAt = ref('')
const creating = ref(false)
const formError = ref('')
const created = ref<{ name: string; url: string }[]>([])
const toast = ref('')

async function generate() {
  formError.value = ''
  const names =
    mode.value === 'single'
      ? name.value.trim()
        ? [name.value.trim()]
        : []
      : namesText.value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)

  if (names.length === 0) {
    formError.value = '先填一个姓名'
    return
  }
  if (names.length > 100) {
    formError.value = '一次最多生成 100 条'
    return
  }

  creating.value = true
  try {
    const result = await api.createInvites({
      names,
      note: note.value,
      channel: channel.value,
      expiresAt: expiresAt.value ? new Date(expiresAt.value).toISOString() : undefined
    })
    created.value = result.invites.map((invite) => ({
      name: invite.name,
      url: `${location.origin}${invite.path}`
    }))
  } catch (err) {
    formError.value = err instanceof Error ? err.message : '生成失败'
  } finally {
    creating.value = false
  }
}

function reset() {
  created.value = []
  name.value = ''
  namesText.value = ''
  note.value = ''
  channel.value = ''
  expiresAt.value = ''
  formError.value = ''
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    document.body.removeChild(area)
  }
  flash('已复制')
}

function copyAll() {
  void copy(created.value.map((item) => `${item.name} ${item.url}`).join('\n'))
}

function flash(message: string) {
  toast.value = message
  setTimeout(() => {
    toast.value = ''
  }, 1800)
}
</script>

<style scoped>
.generator-card {
  max-width: 680px;
  padding: 26px 28px;
}

.form {
  display: grid;
  gap: 18px;
}

.mode {
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: #f1ede4;
  width: fit-content;
}

.mode button {
  border: 0;
  background: transparent;
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 12.5px;
  color: var(--ink-3);
}

.mode button.on {
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.result-card {
  max-width: 760px;
  padding: 24px 26px;
}

.result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.result-head h2 {
  margin-top: 5px;
  font-size: 19px;
  font-weight: 600;
}

.created-list {
  display: grid;
  max-height: 380px;
  overflow-y: auto;
  border-top: 1px solid var(--line);
}

.created-item {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid var(--line);
}

.created-name {
  font-size: 13px;
}

.created-url {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

@media (max-width: 640px) {
  .generator-card,
  .result-card {
    padding: 20px 18px;
  }

  .created-item {
    grid-template-columns: 76px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .result-actions {
    flex-direction: column;
  }
}
</style>
