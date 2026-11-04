<template>
  <div class="submissions-page">
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

    <section class="card date-filter-card" aria-labelledby="date-filter-title">
      <div class="date-filter-head">
        <div>
          <h2 id="date-filter-title" class="date-filter-title">邀请日期</h2>
          <p class="date-filter-summary">{{ dateSummary }}</p>
        </div>
        <div v-if="dateOptions.length" class="date-filter-actions">
          <button
            v-if="dateOptions.length > 12"
            class="btn quiet small"
            type="button"
            @click="datesExpanded = !datesExpanded"
          >
            {{ datesExpanded ? '收起日期' : '展开全部' }}
          </button>
          <button class="btn ghost small date-all-btn" type="button" @click="toggleAllDates">
            {{ allDatesSelected ? '清空日期' : '全选日期' }}
          </button>
        </div>
      </div>

      <div
        v-if="dateOptions.length"
        class="date-rail"
        :class="{ expanded: datesExpanded }"
        role="group"
        aria-label="选择邀请日期"
      >
        <button
          v-for="day in dateOptions"
          :key="day.date"
          class="date-block"
          :class="{ on: selectedDates.has(day.date) }"
          type="button"
          :aria-pressed="selectedDates.has(day.date)"
          :data-date-paint="day.date"
          @pointerdown="startDatePaint($event, day.date)"
          @click="handleDateClick($event, day.date)"
          @dragstart.prevent
        >
          <span class="date-block-day">{{ dateLabel(day.date) }}</span>
          <span class="date-block-meta">{{ weekdayLabel(day.date) }} · {{ day.count }} 人</span>
        </button>
      </div>
      <p v-else class="date-filter-empty">还没有可以筛选的邀请日期。</p>
      <p v-if="dateOptions.length > 12 && !datesExpanded" class="date-filter-tip date-scroll-hint">
        日期较多，可在框内上下滚动，或点“展开全部”。
      </p>
      <p v-if="dateOptions.length && !allDatesSelected" class="date-filter-tip">
        点一下选中，再点取消；按住并拖动可以连续选择。
      </p>
    </section>

    <div class="toolbar">
      <input v-model="q" class="input search" type="search" placeholder="搜索姓名、备注、渠道" />
      <span class="spacer" />
      <span v-if="showDateTones" class="date-hint">表格颜色按邀请日期区分</span>
      <span class="quiet tiny">{{ roster.length }} 人</span>
      <button class="btn ghost small export-btn" type="button" :disabled="exporting" @click="exportCsv">
        {{ exporting ? '正在导出' : '导出答卷 CSV' }}
      </button>
    </div>

    <section class="card table-card">
      <div v-if="loading" class="empty">正在读取</div>
      <div v-else-if="error" class="empty">
        {{ error }}
        <div class="empty-action">
          <button class="btn ghost small" type="button" @click="load">重新读取</button>
        </div>
      </div>
      <div v-else-if="roster.length === 0" class="empty">
        {{ emptyText }}
        <div v-if="selectedDates.size" class="empty-action">
          <button class="btn ghost small" type="button" @click="clearDateFilter">
            查看全部日期
          </button>
        </div>
        <div v-else-if="category !== 'unsubmitted' && category !== ''" class="empty-action">
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
            <tr
              v-for="row in roster"
              :key="row.id"
              :class="[rowTone(row), { unsubmitted: !row.submissionId }]"
            >
              <td>
                <div class="name">{{ row.name || '未命名' }}</div>
                <div v-if="row.note" class="note">{{ row.note }}</div>
                <div v-if="row.channel" class="note channel">{{ row.channel }}</div>
              </td>
              <td>
                <select
                  v-if="row.submissionId && row.claimed"
                  class="select status-select"
                  :value="row.contactStatus ?? 'new'"
                  :disabled="savingStatus === row.id"
                  @change="changeStatus(row, $event)"
                >
                  <option value="new">待联系</option>
                  <option value="contacted">已联系</option>
                  <option value="scheduled">已约时间</option>
                  <option value="done">已完成</option>
                </select>
                <span v-else class="chip" :class="stageClass(row.stage)">{{ stageLabel(row.stage) }}</span>
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
                  <div>
                    <i class="date-dot" />
                    <span>邀请</span>{{ formatDate(row.inviteCreatedAt, false) }}
                  </div>
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
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  api,
  type AdminRosterDateOption,
  type AdminRosterRow,
  type AdminRosterStage
} from '@/api'
import { formatDate } from '@/format'

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

const TAB_KEYS = new Set<string>(tabs.map((item) => item.key))
const route = useRoute()
const router = useRouter()

function categoryFromQuery(): string {
  const value = typeof route.query.category === 'string' ? route.query.category : ''
  return TAB_KEYS.has(value) ? value : ''
}

const roster = ref<AdminRosterRow[]>([])
const counts = ref<Record<string, number>>({ all: 0 })
const loading = ref(true)
const error = ref('')
const q = ref('')
const category = ref(categoryFromQuery())
const dateOptions = ref<AdminRosterDateOption[]>([])
const selectedDates = ref<Set<string>>(new Set())
const datesExpanded = ref(false)
const exporting = ref(false)
const toast = ref('')
const savingStatus = ref('')

let searchTimer: ReturnType<typeof setTimeout> | undefined
let dateTimer: ReturnType<typeof setTimeout> | undefined

const allDatesSelected = computed(
  () => dateOptions.value.length > 0 && selectedDates.value.size === dateOptions.value.length
)
const dateSummary = computed(() => {
  if (dateOptions.value.length === 0) return '全部日期'
  if (selectedDates.value.size === 0) return `全部日期 · ${dateOptions.value.length} 天`
  if (allDatesSelected.value) return `已选全部 ${dateOptions.value.length} 个日期`
  return `已选 ${selectedDates.value.size} 个日期`
})
const showDateTones = computed(
  () => dateOptions.value.length > 1 && selectedDates.value.size !== 1
)

const emptyText = computed(() => {
  if (selectedDates.value.size) return '所选日期里没有符合条件的记录'
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

function rowTone(row: AdminRosterRow): string {
  if (!showDateTones.value || !row.inviteCreatedAt) return ''
  const day = localDateKey(row.inviteCreatedAt).replace(/-/g, '')
  if (!day) return ''
  return `date-tone-${Number(day) % 6}`
}

function localDateKey(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dateParts(value: string): { year: string; month: string; day: string } {
  const [year = '', month = '', day = ''] = value.split('-')
  return { year, month, day }
}

function dateLabel(value: string): string {
  const parts = dateParts(value)
  return `${parts.year}.${parts.month}.${parts.day}`
}

function weekdayLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
}

function inviteUrl(token: string): string {
  return `${location.origin}/i/${token}`
}

let loadRequest = 0

async function load() {
  const requestId = ++loadRequest
  loading.value = true
  error.value = ''
  try {
    const result = await api.roster({
      q: q.value.trim(),
      category: category.value,
      dates: allDatesSelected.value ? undefined : [...selectedDates.value]
    })
    if (requestId !== loadRequest) return
    roster.value = result.roster
    counts.value = result.counts
    dateOptions.value = result.dates ?? []
  } catch (err) {
    if (requestId !== loadRequest) return
    error.value = err instanceof Error ? err.message : '读取失败'
  } finally {
    if (requestId === loadRequest) loading.value = false
  }
}

watch(q, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 280)
})
watch(category, load)
watch(category, (value) => {
  const query = { ...route.query }
  if (value) query.category = value
  else delete query.category
  void router.replace({ query })
})
watch(
  () => route.query.category,
  () => {
    const next = categoryFromQuery()
    if (next !== category.value) category.value = next
  }
)

let paintMode: 'add' | 'remove' | null = null
let lastPaintedDate = ''

function setDateSelected(date: string, selected: boolean) {
  const next = new Set(selectedDates.value)
  if (selected) next.add(date)
  else next.delete(date)
  selectedDates.value = next
}

function startDatePaint(event: PointerEvent, date: string) {
  if (event.button !== 0) return
  event.preventDefault()
  paintMode = selectedDates.value.has(date) ? 'remove' : 'add'
  lastPaintedDate = date
  setDateSelected(date, paintMode === 'add')
  window.addEventListener('pointermove', moveDatePaint, { passive: false })
  window.addEventListener('pointerup', stopDatePaint, { once: true })
  window.addEventListener('pointercancel', stopDatePaint, { once: true })
}

function moveDatePaint(event: PointerEvent) {
  if (!paintMode) return
  event.preventDefault()
  const element = document.elementFromPoint(event.clientX, event.clientY)
  const target = element?.closest<HTMLElement>('[data-date-paint]')
  const date = target?.dataset.datePaint
  if (!date || date === lastPaintedDate) return
  lastPaintedDate = date
  setDateSelected(date, paintMode === 'add')
}

function stopDatePaint() {
  if (!paintMode) return
  paintMode = null
  lastPaintedDate = ''
  window.removeEventListener('pointermove', moveDatePaint)
  window.removeEventListener('pointerup', stopDatePaint)
  window.removeEventListener('pointercancel', stopDatePaint)
  queueDateLoad()
}

function handleDateClick(event: MouseEvent, date: string) {
  if (event.detail !== 0) return
  setDateSelected(date, !selectedDates.value.has(date))
  queueDateLoad()
}

function queueDateLoad() {
  if (dateTimer) clearTimeout(dateTimer)
  dateTimer = setTimeout(load, 100)
}

function toggleAllDates() {
  selectedDates.value = allDatesSelected.value
    ? new Set()
    : new Set(dateOptions.value.map((day) => day.date))
  queueDateLoad()
}

function clearDateFilter() {
  selectedDates.value = new Set()
  queueDateLoad()
}

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

async function changeStatus(row: AdminRosterRow, event: Event) {
  if (!row.submissionId) return
  const target = event.target as HTMLSelectElement
  const value = target.value
  const previous = row.contactStatus ?? 'new'
  if (value === previous) return

  savingStatus.value = row.id
  try {
    await api.patchSubmission(row.submissionId, { contactStatus: value })
    await load()
    flash('联系状态已更新')
  } catch (err) {
    target.value = previous
    flash(err instanceof Error ? err.message : '更新失败')
  } finally {
    savingStatus.value = ''
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

.date-filter-card {
  margin-bottom: 14px;
  padding: 17px 18px 14px;
}

.date-filter-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.date-filter-title {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.date-filter-summary {
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--ink-3);
}

.date-filter-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

.date-all-btn {
  margin-top: -3px;
}

.date-rail {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 8px;
  margin-top: 13px;
  max-height: 202px;
  padding: 2px 4px 5px 1px;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-width: thin;
  user-select: none;
}

.date-rail.expanded {
  max-height: none;
}

.date-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
  min-height: 58px;
  padding: 9px 12px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  touch-action: none;
  transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease,
    transform 0.1s ease;
}

.date-block:hover {
  border-color: rgba(47, 93, 70, 0.4);
  background: rgba(47, 93, 70, 0.045);
}

.date-block:active {
  transform: scale(0.98);
}

.date-block.on {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
  box-shadow: 0 2px 8px rgba(47, 93, 70, 0.16);
}

.date-block.on:hover {
  background: var(--accent);
  filter: brightness(0.97);
}

.date-block-day {
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.date-block-meta {
  margin-top: 4px;
  font-size: 10.5px;
  line-height: 1.25;
  color: var(--ink-3);
}

.date-block.on .date-block-meta {
  color: rgba(255, 255, 255, 0.74);
}

.date-filter-empty,
.date-filter-tip {
  font-size: 11.5px;
  color: var(--ink-3);
}

.date-filter-empty {
  margin-top: 12px;
}

.date-filter-tip {
  margin-top: 7px;
}

.date-scroll-hint {
  color: var(--ink-3);
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

.date-hint {
  font-size: 11.5px;
  color: var(--ink-3);
  white-space: nowrap;
}

.export-btn {
  flex: 0 0 auto;
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

.status-select {
  width: 112px;
  height: 32px;
  font-size: 11.5px;
  padding: 0 8px;
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

.roster-table tbody tr td {
  transition: background 0.15s ease;
}

.roster-table tbody tr td:first-child {
  border-left: 3px solid var(--date-line, transparent);
}

.roster-table tbody tr.date-tone-0 {
  --date-line: #6f927c;
  --date-bg: #f4f7f3;
}

.roster-table tbody tr.date-tone-1 {
  --date-line: #b18a4c;
  --date-bg: #fbf6ec;
}

.roster-table tbody tr.date-tone-2 {
  --date-line: #6f94a6;
  --date-bg: #f1f6f8;
}

.roster-table tbody tr.date-tone-3 {
  --date-line: #ad756b;
  --date-bg: #faf2f0;
}

.roster-table tbody tr.date-tone-4 {
  --date-line: #8e789e;
  --date-bg: #f6f2f8;
}

.roster-table tbody tr.date-tone-5 {
  --date-line: #9a8a63;
  --date-bg: #f7f4eb;
}

.roster-table tbody tr[class*='date-tone-'] td {
  background: var(--date-bg);
}

.date-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 5px;
  border-radius: 50%;
  background: var(--date-line, var(--line-strong));
  vertical-align: 1px;
}

.empty-action {
  margin-top: 16px;
}

@media (max-width: 760px) {
  .date-filter-card {
    padding: 15px 14px 12px;
  }

  .date-filter-head {
    align-items: center;
  }

  .date-filter-actions {
    gap: 2px;
  }

  .date-filter-actions .btn {
    padding: 0 10px;
  }

  .date-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

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

  .date-hint {
    display: none;
  }
}
</style>
