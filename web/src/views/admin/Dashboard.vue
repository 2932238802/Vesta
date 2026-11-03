<template>
  <div class="dashboard">
    <header class="page-head">
      <div>
        <p class="eyebrow">概览</p>
        <h1 class="page-title">今天的情况</h1>
      </div>
      <button class="btn" type="button" @click="router.push('/admin/invites')">生成邀请链接</button>
    </header>

    <div v-if="loading" class="card empty">正在读取数据</div>
    <div v-else-if="error" class="card empty">{{ error }}</div>

    <template v-else-if="data">
      <section class="stat-grid">
        <article class="card stat">
          <p class="stat-label">已生成链接</p>
          <p class="stat-value">{{ data.stats.invites }}</p>
          <p class="stat-meta">待填写 {{ data.stats.pending }}</p>
        </article>
        <article class="card stat">
          <p class="stat-label">已提交</p>
          <p class="stat-value">{{ data.stats.submitted }}</p>
          <p class="stat-meta">打开 {{ data.stats.opened }}</p>
        </article>
        <article class="card stat">
          <p class="stat-label">完成率</p>
          <p class="stat-value">{{ data.stats.completion }}<small>%</small></p>
        </article>
        <article class="card stat">
          <p class="stat-label">已领取规划</p>
          <p class="stat-value">{{ data.stats.claimed }}</p>
        </article>
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
            <li v-for="row in data.recent" :key="row.id" @click="router.push(`/admin/submissions/${row.id}`)">
              <div class="recent-main">
                <span class="recent-name">{{ row.name || '未命名' }}</span>
                <span class="quiet tiny">{{ row.note || formatDate(row.createdAt, false) }}</span>
              </div>
              <div class="recent-meta">
                <span class="chip accent">{{ row.tier }} 档</span>
                <span class="quiet tiny">{{ formatDate(row.createdAt) }}</span>
              </div>
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
import { RouterLink, useRouter } from 'vue-router'
import { api, type Overview } from '@/api'
import { formatDate } from '@/format'

const router = useRouter()
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

onMounted(async () => {
  try {
    data.value = await api.overview()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取失败'
  } finally {
    loading.value = false
  }
})
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

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat {
  padding: 20px 22px 18px;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  cursor: pointer;
}

.recent li:first-child {
  border-top: 0;
  padding-top: 0;
}

.recent li:hover .recent-name {
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
