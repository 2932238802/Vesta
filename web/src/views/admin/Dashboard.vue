<template>
  <div class="dashboard">
    <AdminPageHeader eyebrow="学员" title="今天的情况">
      <template #actions>
        <RouterLink class="btn" to="/admin/invites">生成邀请链接</RouterLink>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="card empty">正在读取数据</div>
    <div v-else-if="error" class="card empty">
      {{ error }}
      <div class="empty-action">
        <button class="btn ghost small" type="button" @click="load">重新读取</button>
      </div>
    </div>

    <template v-else-if="data">
      <section class="stat-grid">
        <RouterLink class="card stat" to="/admin/invites">
          <p class="stat-label">已生成链接</p>
          <p class="stat-value">{{ data.stats.invites }}</p>
          <p class="stat-meta">待填写 {{ data.stats.pending }}</p>
          <span class="stat-link">去生成链接 →</span>
        </RouterLink>
        <RouterLink class="card stat" to="/admin/submissions">
          <p class="stat-label">已提交</p>
          <p class="stat-value">{{ data.stats.submitted }}</p>
          <p class="stat-meta">打开 {{ data.stats.opened }}</p>
          <span class="stat-link">查看名单 →</span>
        </RouterLink>
        <RouterLink class="card stat" to="/admin/submissions?category=unsubmitted">
          <p class="stat-label">完成率</p>
          <p class="stat-value">{{ data.stats.completion }}<small>%</small></p>
          <p class="stat-meta">还有 {{ data.stats.pending }} 人未填写</p>
          <span class="stat-link">查看未填写 →</span>
        </RouterLink>
        <RouterLink class="card stat" to="/admin/submissions">
          <p class="stat-label">已领取规划</p>
          <p class="stat-value">{{ data.stats.claimed }}</p>
          <p class="stat-meta">联系状态在学员名单里更新</p>
          <span class="stat-link">查看名单 →</span>
        </RouterLink>
      </section>

      <div class="split">
        <section class="card panel">
          <header class="panel-head">
            <h2>填写进度</h2>
          </header>
          <div class="funnel">
            <div v-for="row in funnelRows" :key="row.label" class="funnel-row">
              <div class="funnel-top">
                <span>{{ row.label }}</span>
                <span class="funnel-value">
                  {{ row.count }}
                  <em>{{ row.rate }}%</em>
                </span>
              </div>
              <div class="funnel-track">
                <span :style="{ width: `${row.width}%` }" />
              </div>
            </div>
          </div>
        </section>

        <section class="card panel">
          <header class="panel-head">
            <h2>最近的答卷</h2>
            <RouterLink class="link" to="/admin/submissions">全部</RouterLink>
          </header>
          <div v-if="data.recent.length === 0" class="empty small-empty">还没有人提交</div>
          <ul v-else class="recent">
            <li v-for="row in data.recent" :key="row.id">
              <RouterLink class="recent-item" :to="`/admin/submissions/${row.id}`">
                <div class="recent-main">
                  <span class="recent-name">{{ row.name || '未命名' }}</span>
                  <span class="quiet tiny">{{ row.note || formatDate(row.createdAt, false) }}</span>
                </div>
                <div class="recent-meta">
                  <span class="chip accent">{{ row.tier }} 档</span>
                  <span class="quiet tiny">{{ formatDate(row.createdAt) }}</span>
                </div>
              </RouterLink>
            </li>
          </ul>
        </section>
      </div>

      <section class="card panel">
        <header class="panel-head">
          <h2>每道题的停留</h2>
        </header>
        <div class="table-scroll">
          <table class="table">
            <thead>
              <tr>
                <th>题号</th>
                <th>题目</th>
                <th>平均停留</th>
                <th>完成率</th>
                <th>停在这一题</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="question in data.questions" :key="question.code">
                <td class="quiet tiny">{{ question.code }}</td>
                <td>{{ question.title }}</td>
                <td class="num">{{ question.avgSeconds === null ? '—' : `${question.avgSeconds} 秒` }}</td>
                <td class="num">{{ question.answeredRate }}%</td>
                <td class="num" :class="{ warn: question.dropoff > 0 }">
                  {{ question.dropoff === 0 ? '—' : `${question.dropoff} 人 · ${question.dropoffRate}%` }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api, type Overview } from '@/api'
import { formatDate } from '@/format'
import AdminPageHeader from '@/components/AdminPageHeader.vue'

const data = ref<Overview | null>(null)
const loading = ref(true)
const error = ref('')

const funnelRows = computed(() => {
  if (!data.value) return []
  const base = Math.max(data.value.stats.invites, data.value.funnel.started, 1)
  const rows = [
    { label: '打开链接', count: data.value.stats.opened },
    { label: '开始填写', count: data.value.funnel.started },
    ...data.value.funnel.groups.map((group) => ({
      label: `完成第 ${group.code} 组 · ${group.title}`,
      count: group.completed
    }))
  ]
  return rows.map((row) => ({
    ...row,
    width: Math.round((row.count / base) * 100),
    rate: Math.round((row.count / Math.max(data.value!.stats.invites, 1)) * 100)
  }))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await api.overview()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat {
  display: block;
  padding: 20px 22px 18px;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.stat:hover {
  border-color: var(--line-strong);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(30, 28, 22, 0.045);
}

.stat-label {
  font-size: 11.5px;
  letter-spacing: 0.06em;
  color: var(--ink-3);
}

.stat-value {
  margin-top: 14px;
  font-size: 34px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
}

.stat-value small {
  font-size: 15px;
  font-weight: 500;
  color: var(--ink-3);
  margin-left: 2px;
}

.stat-meta {
  margin-top: 12px;
  font-size: 11.5px;
  color: var(--ink-3);
}

.stat-link {
  display: inline-block;
  margin-top: 15px;
  font-size: 11.5px;
  color: var(--accent);
}

.split {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 14px;
  margin-top: 14px;
}

.panel {
  padding: 22px 24px 24px;
  margin-top: 14px;
}

.split .panel {
  margin-top: 0;
}

.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.panel-head h2 {
  font-size: 15px;
  font-weight: 500;
}

.link {
  font-size: 12px;
  color: var(--ink-3);
  border-bottom: 1px solid var(--line-strong);
  padding-bottom: 1px;
}

.link:hover {
  color: var(--ink);
}

.funnel {
  display: grid;
  gap: 16px;
}

.funnel-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 12.5px;
  color: var(--ink-2);
  margin-bottom: 7px;
}

.funnel-value {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink);
}

.funnel-value em {
  font-style: normal;
  color: var(--ink-3);
  margin-left: 6px;
  font-size: 11px;
}

.funnel-track {
  height: 8px;
  border-radius: 4px;
  background: #ece8de;
  overflow: hidden;
}

.funnel-track span {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: var(--accent);
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.recent {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent li {
  display: block;
  border-top: 1px solid var(--line);
}

.recent li:first-child {
  border-top: 0;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
}

.recent li:first-child .recent-item {
  padding-top: 0;
}

.recent-item:hover .recent-name {
  color: var(--accent);
}

.recent-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.recent-name {
  font-size: 13.5px;
  transition: color 0.15s ease;
}

.recent-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.small-empty {
  padding: 28px 0;
}

.table-scroll {
  overflow-x: auto;
}

.num.warn {
  color: var(--danger);
}

@media (max-width: 1120px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .stat-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .stat {
    padding: 16px;
  }

  .stat-value {
    font-size: 28px;
  }

  .panel {
    padding: 18px;
  }
}
</style>
