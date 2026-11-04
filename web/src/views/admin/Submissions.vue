<template>
  <div class="submissions-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">答卷与名单</p>
        <h1 class="page-title">谁填了，谁还没填</h1>
      </div>
      <button class="btn ghost" type="button" :disabled="exporting" @click="exportCsv">
        {{ exporting ? '正在导出' : '导出答卷 CSV' }}
      </button>
    </header>

    <div class="category-tabs" role="tablist" aria-label="名单分类">
      <button
        v-for="item in tabs"
        :key="item.key"
        class="category-tab"
        :class="{ on: category === item.key }"
        type="button"
        role="tab"
        :aria-selected="category === item.key"
        @click="category = item.key"
      >
        <span>{{ item.label }}</span>
        <b>{{ countOf(item.key) }}</b>
      </button>
    </div>

    <div class="toolbar">
      <input v-model="q" class="input search" type="search" placeholder="搜索姓名、备注、渠道" />
      <select v-model="dateRange" class="select date-filter">
        <option value="">全部日期</option>
        <option value="today">今天</option>
        <option value="7d">近 7 天</option>
        <option value="30d">近 30 天</option>
        <option value="custom">自定义</option>
      </select>
      <template v-if="dateRange === 'custom'">
        <input v-model="customFrom" class="input date-input" type="date" />
        <span class="quiet small">至</span>
        <input v-model="customTo" class="input date-input" type="date" />
      </template>
      <span class="spacer" />
      <span class="quiet tiny">{{ roster.length }} 人</span>
    </div>

    <section class="card table-card">
      <div v-if="loading" class="empty">正在读取</div>
      <div v-else-if="error" class="empty">{{ error }}</div>
      <div v-else-if="roster.length === 0" class="empty">
        {{ emptyText }}
        <div v-if="category !== 'unsubmitted' && category !== ''" class="empty-action">
          <button class="btn ghost small" type="button" @click="category = ''">查看全部名单</button>
        </div>
        <div v-else-if="counts.all === 0" class="empty-action">
          <RouterLink class="btn ghost small" to="/admin/invites">去生成链接</RouterLink>
        </div>
      </div>
      <div v-else class="table-scroll">
        <table class="table roster-table">
          <thead>
            <tr>
              <th>学员</th>
              <th>阶段</th>
              <th>分数</th>
              <th>领取 / 联系</th>
              <th>时间</th>
              <th class="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in roster" :key="row.id" :class="{ unsubmitted: !row.submissionId }">
              <td>
                <div class="name">{{ row.name || '未命名' }}</div>
                <div v-if="row.note" class="note">{{ row.note }}</div>
                <div v-if="row.channel" class="note channel">{{ row.channel }}</div>
              </td>
              <td>
                <span class="chip" :class="stageClass(row.stage)">{{ stageLabel(row.stage) }}</span>
                <div v-if="row.stage === 'unclaimed'" class="note">已提交，还没有领取规划</div>
              </td>
              <td>
                <template v-if="row.submissionId">
                  <span class="chip accent">{{ row.tier }}</span>
                  <span class="num">{{ row.total }}</span>
                </template>
                <span v-else class="quiet small">—</span>
              </td>
              <td>
                <template v-if="row.submissionId">
                  <span v-if="row.claimed" class="chip accent">已领取</span>
                  <span v-else class="quiet small">未领取</span>
                  <div v-if="row.claimed && row.slots.length" class="slots">
                    {{ row.slots.join(' / ') }}
                  </div>
                </template>
                <span v-else class="quiet small">—</span>
              </td>
              <td>
                <div class="date-stack">
                  <div><span>邀请</span>{{ formatDate(row.inviteCreatedAt, false) }}</div>
                  <div v-if="row.submittedAt"><span>提交</span>{{ formatDate(row.submittedAt, false) }}</div>
                  <div v-else-if="row.stage === 'expired'"><span>到期</span>{{ formatDate(row.expiresAt, false) }}</div>
                  <div v-else-if="row.openedAt"><span>打开</span>{{ formatDate(row.openedAt, false) }}</div>
                </div>
              </td>
              <td>
                <div class="row-actions">
                  <template v-if="row.submissionId">
                    <RouterLink v-if="row.detailPath" class="btn quiet" :to="row.detailPath">
                      查看答卷
                    </RouterLink>
                    <a
                      v-if="row.reportPath"
                      class="btn quiet"
                      :href="row.reportPath"
                      target="_blank"
                      rel="noopener"
                    >
                      打开报告
                    </a>
                  </template>
                  <template v-else-if="row.stage === 'expired'">
                    <button class="btn quiet" type="button" @click="rotate(row)">换新链接</button>
                  </template>
                  <template v-else>
                    <button class="btn quiet" type="button" @click="copyLink(row)">复制链接</button>
                    <button class="btn quiet" type="button" @click="copyReminder(row)">催填话术</button>
                    <button class="btn quiet" type="button" @click="openInvite(row)">打开</button>
                  </template>
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
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api, type AdminRosterRow, type AdminRosterStage } from '@/api'
import { dateRangeBounds, formatDate, type DateRangeKey } from '@/format'

const tabs = [
  { key: '', label: '全部' },
  { key: 'unsubmitted', label: '未填写' },
  { key: 'unclaimed', label: '已提交未领取' },
  { key: 'new', label: '待联系' },
  { key: 'contacted', label: '已联系' },
  { key: 'scheduled', label: '已约时间' },
  { key: 'done', label: '已完成' }
] as const

const STAGE_LABELS: Record<AdminRosterStage, string> = {
  pending: '待打开',
  opened: '已打开未填',
  expired: '已过期',
  unclaimed: '已提交未领取',
  new: '待联系',
  contacted: '已联系',
  scheduled: '已约时间',
  done: '已完成'
}

const roster = ref<AdminRosterRow[]>([])
const counts = ref<Record<string, number>>({ all: 0 })
const loading = ref(true)
const error = ref('')
const q = ref('')
const category = ref('')
const dateRange = ref<DateRangeKey>('')
const customFrom = ref('')
const customTo = ref('')
const exporting = ref(false)
const toast = ref('')


let searchTimer: ReturnType<typeof setTimeout> | undefined

const emptyText = computed(() => {
  if (category.value === 'unsubmitted') return '没有未填写的邀请'
  if (category.value) return '这个分类下暂时没有记录'
  return '还没有邀请或答卷'
})

function countOf(key: string): number {
  return counts.value[key || 'all'] ?? 0
}

function stageLabel(stage: AdminRosterStage): string {
  return STAGE_LABELS[stage] ?? stage
}

function stageClass(stage: AdminRosterStage): string {
  if (stage === 'done') return 'accent'
  if (stage === 'expired') return 'danger'
  if (stage === 'opened' || stage === 'scheduled' || stage === 'unclaimed') return 'warn'
  return ''
}

function inviteUrl(token: string): string {
  return `${location.origin}/i/${token}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const bounds = dateRangeBounds(dateRange.value, customFrom.value, customTo.value)
    const result = await api.roster({
      q: q.value.trim(),
      category: category.value,
      ...bounds
    })
    roster.value = result.roster
    counts.value = result.counts
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
watch(category, load)
watch([dateRange, customFrom, customTo], load)

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    document.body.removeChild(area)
    return true
  }
}

async function copyLink(row: AdminRosterRow) {
  await writeClipboard(inviteUrl(row.token))
  flash('链接已复制')
}

async function copyReminder(row: AdminRosterRow) {
  const text = `你好${row.name || ''}，这份现状自评还差最后一步，麻烦抽空填一下：${inviteUrl(row.token)}`
  await writeClipboard(text)
  flash('催填话术已复制')
}

function openInvite(row: AdminRosterRow) {
  window.open(inviteUrl(row.token), '_blank')
}

async function rotate(row: AdminRosterRow) {
  if (!confirm(`给「${row.name}」换一条新链接？旧链接会立即失效`)) return
  try {
    const result = await api.rotateInvite(row.inviteId)
    await writeClipboard(`${location.origin}${result.path}`)
    await load()
    flash('已换新链接并复制')
  } catch (err) {
    flash(err instanceof Error ? err.message : '操作失败')
  }
}

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
    flash(err instanceof Error ? err.message : '导出失败')
  } finally {
    exporting.value = false
  }
}

function flash(message: string) {
  toast.value = message
  setTimeout(() => {
    toast.value = ''
  }, 2200)
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
  margin-bottom: 22px;
}

.page-title {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.category-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 14px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.category-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
  height: 36px;
  padding: 0 13px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-3);
  font-size: 12.5px;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.category-tab:hover {
  color: var(--ink);
  background: rgba(0, 0, 0, 0.025);
}

.category-tab.on {
  color: var(--accent);
  border-color: rgba(47, 93, 70, 0.2);
  background: rgba(47, 93, 70, 0.07);
}

.category-tab b {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.055);
  font-size: 10.5px;
  font-weight: 500;
  line-height: 18px;
  text-align: center;
}

.category-tab.on b {
  background: rgba(47, 93, 70, 0.12);
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.search {
  max-width: 300px;
  height: 40px;
  font-size: 13.5px;
  padding: 0 14px;
}

.date-filter {
  width: 128px;
  height: 40px;
  font-size: 13px;
  padding: 0 10px;
}

.date-input {
  width: 136px;
  height: 40px;
  font-size: 12.5px;
  padding: 0 10px;
}

.spacer {
  flex: 1;
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
  line-height: 1.55;
  color: var(--ink-3);
}

.channel {
  font-size: 11px;
}

.num {
  margin-left: 6px;
  font-size: 12.5px;
  color: var(--ink-2);
}

.slots {
  margin-top: 4px;
  max-width: 190px;
  font-size: 11.5px;
  line-height: 1.55;
  color: var(--ink-3);
}

.date-stack {
  display: grid;
  gap: 2px;
  min-width: 92px;
  font-size: 11.5px;
  color: var(--ink-2);
}

.date-stack span {
  display: inline-block;
  width: 28px;
  color: var(--ink-3);
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  flex-wrap: wrap;
}

.unsubmitted td {
  background: rgba(247, 244, 237, 0.32);
}

.empty-action {
  margin-top: 16px;
}

@media (max-width: 760px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .search {
    max-width: none;
    flex: 1;
    min-width: 160px;
  }

  .spacer {
    display: none;
  }
}
</style>
