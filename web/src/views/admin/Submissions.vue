<template>
  <div class="submissions-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">答卷与名单</p>
        <h1 class="page-title">谁填了，谁还没联系</h1>
      </div>
      <button class="btn ghost" type="button" :disabled="exporting" @click="exportCsv">
        {{ exporting ? '正在导出' : '导出 CSV' }}
      </button>
    </header>

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
      <span class="quiet tiny">{{ submissions.length }} 份</span>
    </div>

    <section class="card table-card">
      <div v-if="loading" class="empty">正在读取</div>
      <div v-else-if="error" class="empty">{{ error }}</div>
      <div v-else-if="submissions.length === 0" class="empty">
        还没有答卷
        <div class="empty-action">
          <RouterLink class="btn ghost small" to="/admin/invites">去生成链接</RouterLink>
        </div>
      </div>
      <div v-else class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>学员</th>
              <th>档位</th>
              <th>总分</th>
              <th>领取</th>
              <th>联系状态</th>
              <th>提交时间</th>
              <th class="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in submissions" :key="row.id">
              <td>
                <div class="name">{{ row.name || '未命名' }}</div>
                <div v-if="row.note" class="note">{{ row.note }}</div>
              </td>
              <td><span class="chip accent">{{ row.tier }}</span></td>
              <td class="num">{{ row.total }}</td>
              <td>
                <span v-if="row.claimed" class="chip accent">已领取</span>
                <span v-else class="quiet small">未领取</span>
              </td>
              <td>
                <span class="chip" :class="contactClass(row.contactStatus)">
                  {{ contactLabel(row.contactStatus) }}
                </span>
              </td>
              <td class="quiet small">{{ formatDate(row.createdAt) }}</td>
              <td>
                <div class="row-actions">
                  <RouterLink class="btn quiet" :to="`/admin/submissions/${row.id}`">
                    查看
                  </RouterLink>
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
import { api, type AdminSubmissionSummary } from '@/api'
import { contactLabel, formatDate } from '@/format'

const submissions = ref<AdminSubmissionSummary[]>([])
const loading = ref(true)
const error = ref('')
const q = ref('')
const contactStatus = ref('')
const exporting = ref(false)
const toast = ref('')

let searchTimer: ReturnType<typeof setTimeout> | undefined

function contactClass(status: string): string {
  if (status === 'done') return 'accent'
  if (status === 'scheduled') return 'warn'
  return ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await api.submissions({
      q: q.value.trim(),
      contactStatus: contactStatus.value
    })
    submissions.value = result.submissions
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

async function exportCsv() {
  exporting.value = true
  try {
    const blob = await api.exportSubmissions(q.value.trim())
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vesta-submissions-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    toast.value = err instanceof Error ? err.message : '导出失败'
    setTimeout(() => {
      toast.value = ''
    }, 2200)
  } finally {
    exporting.value = false
  }
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

.name {
  font-size: 13.5px;
}

.note {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--ink-3);
}

.row-actions {
  display: flex;
  justify-content: flex-end;
}

.empty-action {
  margin-top: 16px;
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
