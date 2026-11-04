<template>
  <div class="appointments-page">
    <div class="toolbar">
      <input v-model="q" class="input search" type="search" placeholder="搜索姓名、备注、渠道" />
      <select v-model="contactStatus" class="select filter">
        <option value="">全部联系状态</option>
        <option value="new">待联系</option>
        <option value="contacted">已联系</option>
        <option value="scheduled">已约时间</option>
        <option value="done">已完成</option>
      </select>
      <div class="spacer" />
      <span class="quiet tiny">{{ appointments.length }} 条预约</span>
    </div>

    <section class="card table-card">
      <div v-if="loading" class="empty">正在读取</div>
      <div v-else-if="error" class="empty">
        {{ error }}
        <div class="empty-action">
          <button class="btn ghost small" type="button" @click="load">重新读取</button>
        </div>
      </div>
      <div v-else-if="appointments.length === 0" class="empty">
        还没有人预约咨询时间
        <p class="quiet tiny empty-note">学员在报告底部提交时间段后，会出现在这里</p>
      </div>
      <div v-else class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>学员</th>
              <th>微信号</th>
              <th>希望时间</th>
              <th>联系状态</th>
              <th>提交时间</th>
              <th class="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in appointments" :key="row.id">
              <td>
                <div class="name-row">
                  <span class="name">{{ row.name || '未命名' }}</span>
                  <span class="chip accent">{{ row.tier }}</span>
                </div>
                <div v-if="row.note" class="note">{{ row.note }}</div>
                <div v-if="row.channel" class="note">{{ row.channel }}</div>
              </td>
              <td>
                <div class="wechat">
                  <span class="mono">{{ row.wechat || '—' }}</span>
                  <button
                    v-if="row.wechat"
                    class="btn quiet tiny-btn"
                    type="button"
                    @click="copyWechat(row.wechat)"
                  >
                    复制
                  </button>
                </div>
              </td>
              <td>
                <div v-if="row.slots.length" class="slots">
                  <span v-for="slot in row.slots" :key="slot">{{ slot }}</span>
                </div>
                <span v-else class="quiet small">—</span>
              </td>
              <td>
                <select
                  class="select status-select"
                  :value="row.contactStatus"
                  @change="onStatusChange(row, $event)"
                >
                  <option value="new">待联系</option>
                  <option value="contacted">已联系</option>
                  <option value="scheduled">已约时间</option>
                  <option value="done">已完成</option>
                </select>
              </td>
              <td class="quiet small">{{ formatDate(row.claimedAt) }}</td>
              <td>
                <div class="row-actions">
                  <RouterLink class="btn quiet" :to="`/admin/submissions/${row.id}`">
                    查看答卷
                  </RouterLink>
                  <a
                    class="btn quiet"
                    :href="`/r/${row.reportSlug}`"
                    target="_blank"
                    rel="noopener"
                  >
                    报告
                  </a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api, type AdminAppointment } from '@/api'
import { formatDate } from '@/format'

const appointments = ref<AdminAppointment[]>([])
const loading = ref(true)
const error = ref('')
const q = ref('')
const contactStatus = ref('')
const toast = ref('')

let searchTimer: ReturnType<typeof setTimeout> | undefined

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await api.appointments({
      q: q.value.trim(),
      contactStatus: contactStatus.value
    })
    appointments.value = result.appointments
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
watch(contactStatus, load)

function flash(message: string) {
  toast.value = message
  setTimeout(() => {
    toast.value = ''
  }, 2000)
}

async function copyWechat(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    flash('微信号已复制')
  } catch {
    const input = document.createElement('textarea')
    input.value = value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    flash('微信号已复制')
  }
}

async function onStatusChange(row: AdminAppointment, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const previous = row.contactStatus
  if (value === previous) return
  row.contactStatus = value
  try {
    await api.patchSubmission(row.id, { contactStatus: value })
    flash('联系状态已更新')
  } catch (err) {
    row.contactStatus = previous
    flash(err instanceof Error ? err.message : '更新失败')
  }
}

onMounted(load)
</script>

<style scoped>
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
  width: 150px;
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

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  font-size: 13.5px;
}

.note {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--ink-3);
}

.wechat {
  display: grid;
  gap: 5px;
  justify-items: start;
}

.wechat .mono {
  font-size: 12.5px;
}

.tiny-btn {
  height: 26px;
  padding: 0 8px;
  font-size: 11.5px;
}

.slots {
  display: grid;
  gap: 2px;
  min-width: 150px;
  font-size: 12px;
  color: var(--ink-2);
}

.status-select {
  width: 120px;
  height: 34px;
  font-size: 12px;
  padding: 0 8px;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.empty-note {
  margin-top: 8px;
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
    width: 130px;
  }
}
</style>
