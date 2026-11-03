<template>
  <div class="invites-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">邀请链接</p>
        <h1 class="page-title">一人一条，发给学员</h1>
      </div>
      <button class="btn" type="button" @click="openModal">生成链接</button>
    </header>

    <div class="toolbar">
      <input v-model="q" class="input search" type="search" placeholder="搜索姓名、备注、渠道" />
      <select v-model="status" class="select filter">
        <option value="">全部状态</option>
        <option value="pending">待填写</option>
        <option value="opened">已打开</option>
        <option value="submitted">已提交</option>
        <option value="expired">已过期</option>
      </select>
      <div class="spacer" />
      <span class="quiet tiny">{{ invites.length }} 条</span>
    </div>

    <section class="card table-card">
      <div v-if="loading" class="empty">正在读取</div>
      <div v-else-if="error" class="empty">{{ error }}</div>
      <div v-else-if="invites.length === 0" class="empty">
        还没有链接
        <div class="empty-action">
          <button class="btn ghost small" type="button" @click="openModal">生成第一条</button>
        </div>
      </div>
      <div v-else class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>学员</th>
              <th>渠道</th>
              <th>状态</th>
              <th>提交</th>
              <th>创建时间</th>
              <th class="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="invite in invites" :key="invite.id">
              <td>
                <div class="name">{{ invite.name || '未命名' }}</div>
                <div v-if="invite.note" class="note">{{ invite.note }}</div>
              </td>
              <td class="quiet small">{{ invite.channel || '—' }}</td>
              <td>
                <span class="chip" :class="statusClass(invite.status)">
                  {{ inviteStatusLabel(invite.status) }}
                </span>
              </td>
              <td>
                <template v-if="invite.reportPath">
                  <RouterLink class="link" :to="invite.reportPath">
                    {{ invite.tier }} 档 · {{ invite.total }} 分
                  </RouterLink>
                </template>
                <span v-else class="quiet small">—</span>
              </td>
              <td class="quiet small">{{ formatDate(invite.createdAt, false) }}</td>
              <td>
                <div class="row-actions">
                  <button class="btn quiet" type="button" @click="copy(inviteUrl(invite.token))">
                    复制
                  </button>
                  <button class="btn quiet" type="button" @click="open(invite.token)">打开</button>
                  <button
                    v-if="!invite.reportSlug"
                    class="btn quiet"
                    type="button"
                    @click="rotate(invite)"
                  >
                    换链接
                  </button>
                  <button
                    v-if="!invite.reportSlug"
                    class="btn quiet delete"
                    type="button"
                    @click="remove(invite)"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Modal
      :open="modalOpen"
      :title="created.length ? '链接已生成' : '生成邀请链接'"
      @close="closeModal"
    >
      <div v-if="created.length" class="created">
        <div class="created-list">
          <div v-for="item in created" :key="item.url" class="created-item">
            <span class="created-name">{{ item.name }}</span>
            <span class="created-url">{{ item.url }}</span>
            <button class="btn quiet" type="button" @click="copy(item.url)">复制</button>
          </div>
        </div>
        <button class="btn ghost wide" type="button" @click="copyAll">复制全部链接</button>
      </div>

      <form v-else class="form" @submit.prevent="generate">
        <div class="mode">
          <button
            type="button"
            :class="{ on: mode === 'single' }"
            @click="mode = 'single'"
          >
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
            rows="5"
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
      </form>

      <template #footer>
        <template v-if="created.length">
          <button class="btn" type="button" @click="closeModal">完成</button>
        </template>
        <template v-else>
          <button class="btn quiet" type="button" @click="closeModal">取消</button>
          <button class="btn" type="button" :disabled="creating" @click="generate">
            {{ creating ? '正在生成' : '生成' }}
          </button>
        </template>
      </template>
    </Modal>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api, type AdminInvite } from '@/api'
import { formatDate, inviteStatusLabel } from '@/format'
import Modal from '@/components/Modal.vue'

const invites = ref<AdminInvite[]>([])
const loading = ref(true)
const error = ref('')
const q = ref('')
const status = ref('')

const modalOpen = ref(false)
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

let searchTimer: ReturnType<typeof setTimeout> | undefined

function statusClass(value: string): string {
  if (value === 'submitted') return 'accent'
  if (value === 'expired') return 'danger'
  if (value === 'opened') return 'warn'
  return ''
}

function inviteUrl(token: string): string {
  return `${location.origin}/i/${token}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await api.invites({ q: q.value.trim(), status: status.value })
    invites.value = result.invites
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取失败'
  } finally {
    loading.value = false
  }
}

watch(q, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 280)
})
watch(status, load)

function openModal() {
  modalOpen.value = true
  created.value = []
  formError.value = ''
  name.value = ''
  namesText.value = ''
  note.value = ''
  channel.value = ''
  expiresAt.value = ''
}

function closeModal() {
  modalOpen.value = false
}

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
    await load()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : '生成失败'
  } finally {
    creating.value = false
  }
}

async function rotate(invite: AdminInvite) {
  if (!confirm(`给「${invite.name}」换一条新链接？旧链接会立即失效`)) return
  try {
    await api.rotateInvite(invite.id)
    await load()
    flash('已换新链接')
  } catch (err) {
    flash(err instanceof Error ? err.message : '操作失败')
  }
}

async function remove(invite: AdminInvite) {
  if (!confirm(`删除「${invite.name}」的链接？删除后无法恢复`)) return
  try {
    await api.deleteInvite(invite.id)
    await load()
    flash('已删除')
  } catch (err) {
    flash(err instanceof Error ? err.message : '删除失败')
  }
}

function open(token: string) {
  window.open(`/i/${token}`, '_blank')
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    flash('已复制')
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    document.body.removeChild(area)
    flash('已复制')
  }
}

function copyAll() {
  copy(created.value.map((item) => `${item.name} ${item.url}`).join('\n'))
}

function flash(message: string) {
  toast.value = message
  setTimeout(() => {
    toast.value = ''
  }, 1800)
}

onMounted(load)
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 26px;
}

.page-title {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}

.search {
  max-width: 280px;
  height: 40px;
  font-size: 13.5px;
  padding: 0 14px;
}

.filter {
  width: 140px;
  height: 40px;
  font-size: 13.5px;
  padding: 0 12px;
}

.table-card {
  overflow: hidden;
}

.table-scroll {
  overflow-x: auto;
}

.name {
  font-size: 13.5px;
  color: var(--ink);
}

.note {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--ink-3);
}

.link {
  color: var(--accent);
  border-bottom: 1px solid transparent;
}

.link:hover {
  border-bottom-color: var(--accent);
}

.row-actions {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
}

.delete {
  color: var(--danger);
}

.empty-action {
  margin-top: 16px;
}

.created {
  display: grid;
  gap: 16px;
}

.created-list {
  display: grid;
  gap: 0;
  max-height: 300px;
  overflow-y: auto;
}

.created-item {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}

.created-item:first-child {
  border-top: 0;
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

.form {
  display: grid;
  gap: 16px;
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

@media (max-width: 640px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .search {
    max-width: none;
    flex: 1;
    min-width: 160px;
  }

  .filter {
    width: 120px;
  }

  .created-item {
    grid-template-columns: 1fr auto;
  }

  .created-url {
    grid-column: span 2;
  }
}
</style>
