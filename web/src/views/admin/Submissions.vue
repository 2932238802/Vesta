<template>
  <div class="submissions-page">
    <AdminPageHeader eyebrow="学员" title="学员名单">
      <template #actions>
        <span class="quiet small">{{ roster.length }} 人</span>
        <button
          class="btn ghost small export-btn"
          type="button"
          :disabled="exporting"
          @click="exportCsv"
        >
          {{ exporting ? '正在导出' : '导出答卷 CSV' }}
        </button>
      </template>
    </AdminPageHeader>

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

    <div class="group-bar" role="group" aria-label="自定义分组">
      <button
        class="group-chip"
        :class="{ on: groupFilter === '' }"
        type="button"
        @click="setGroupFilter('')"
      >
        全部 <b>{{ counts.all ?? 0 }}</b>
      </button>
      <button
        class="group-chip"
        :class="{ on: groupFilter === 'none' }"
        type="button"
        @click="setGroupFilter('none')"
      >
        未分组 <b>{{ ungrouped }}</b>
      </button>
      <button
        v-for="group in groups"
        :key="group.id"
        class="group-chip"
        :class="{ on: groupFilter === group.id }"
        type="button"
        @click="setGroupFilter(group.id)"
      >
        {{ group.name }} <b>{{ group.count }}</b>
      </button>
      <button class="group-chip ghost" type="button" @click="groupPanelOpen = !groupPanelOpen">
        管理分组
      </button>
    </div>

    <section v-if="groupPanelOpen" class="card group-panel">
      <header class="group-panel-head">
        <h2>分组管理</h2>
        <span class="quiet tiny">每条记录只能在一个分组里</span>
      </header>
      <div class="group-create">
        <input
          v-model="newGroupName"
          class="input"
          type="text"
          maxlength="24"
          placeholder="新分组名称，例如：周末班"
          @keydown.enter.prevent="createGroup"
        />
        <button class="btn small" type="button" :disabled="groupSaving" @click="createGroup">
          新建分组
        </button>
      </div>
      <ul v-if="groups.length" class="group-list">
        <li v-for="group in groups" :key="group.id" class="group-item">
          <span class="group-name">{{ group.name }}</span>
          <span class="quiet tiny">{{ group.count }} 人</span>
          <span class="group-item-actions">
            <button class="btn quiet small" type="button" @click="renameGroup(group)">改名</button>
            <button class="btn quiet small danger" type="button" @click="deleteGroup(group)">
              删除
            </button>
          </span>
        </li>
      </ul>
      <p v-else class="quiet tiny">还没有分组。新建后可以在上面批量归类。</p>

      <div v-if="deletedGroups.length" class="group-deleted">
        <p class="eyebrow">已删除的分组（可恢复）</p>
        <ul class="group-list">
          <li v-for="group in deletedGroups" :key="group.id" class="group-item">
            <span class="group-name">{{ group.name }}</span>
            <span class="quiet tiny">{{ group.count }} 人</span>
            <button class="btn quiet small" type="button" @click="restoreGroup(group)">
              恢复
            </button>
          </li>
        </ul>
      </div>
    </section>

    <section class="card date-filter-card" aria-labelledby="date-filter-title">
      <div class="date-filter-head">
        <div>
          <h2 id="date-filter-title" class="date-filter-title">邀请日期</h2>
          <p class="date-filter-summary">{{ dateSummary }}</p>
        </div>
        <div v-if="dateOptions.length" class="date-filter-actions">
          <button class="btn quiet small" type="button" @click="datePanelOpen = !datePanelOpen">
            {{ datePanelOpen ? '收起管理' : '管理日期分类' }}
          </button>
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

      <div v-if="datePanelOpen" class="date-manage">
        <p class="eyebrow">日期分类管理</p>
        <p class="quiet tiny">删除只影响上方的日期筛选，不会删任何答卷；删错了可以在下面恢复。</p>
        <ul v-if="dateOptions.length" class="group-list">
          <li v-for="day in dateOptions" :key="day.date" class="group-item">
            <span class="group-name">{{ dateLabel(day.date) }} · {{ weekdayLabel(day.date) }}</span>
            <span class="quiet tiny">{{ day.count }} 人</span>
            <button class="btn quiet small danger" type="button" @click="hideDate(day)">删除</button>
          </li>
        </ul>
        <div v-if="hiddenDates.length" class="group-deleted">
          <p class="eyebrow">已删除的日期（可恢复）</p>
          <ul class="group-list">
            <li v-for="day in hiddenDates" :key="day.date" class="group-item">
              <span class="group-name">{{ dateLabel(day.date) }} · {{ weekdayLabel(day.date) }}</span>
              <span class="quiet tiny">{{ day.count }} 人</span>
              <button class="btn quiet small" type="button" @click="restoreDate(day)">恢复</button>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <div v-if="!selected.size" class="toolbar list-toolbar">
      <input
        v-model="q"
        class="input search"
        type="search"
        placeholder="搜索姓名、备注、渠道（/ 搜索）"
        data-admin-search
      />
      <span class="spacer" />
      <span v-if="showDateTones" class="date-hint">表格颜色按邀请日期区分</span>
    </div>

    <div v-else class="toolbar selection-bar" role="region" aria-label="批量操作">
      <strong>已选 {{ selected.size }} 条</strong>
      <select class="input small-select" :value="''" @change="assignSelected($event)">
        <option value="">移到分组…</option>
        <option value="__none">移出分组</option>
        <option v-for="group in groups" :key="group.id" :value="group.id">
          {{ group.name }}
        </option>
      </select>
      <span class="spacer" />
      <button class="btn ghost small" type="button" @click="clearSelection">取消选择</button>
      <button
        class="btn ghost small danger-btn"
        type="button"
        :disabled="batchDeleting"
        @click="removeSelected"
      >
        {{ batchDeleting ? '删除中' : '批量删除' }}
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
              <th class="select-col">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  :indeterminate.prop="someSelected"
                  aria-label="全选"
                  @change="toggleAll($event)"
                />
              </th>
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
              :class="[
                rowTone(row),
                { unsubmitted: !row.submissionId, picked: selected.has(row.id), 'row-link': !!row.detailPath }
              ]"
              :tabindex="row.detailPath ? 0 : undefined"
              :role="row.detailPath ? 'link' : undefined"
              @click="openRow(row, $event)"
              @keydown.enter.self="openRow(row, $event)"
            >
              <td class="select-col">
                <input
                  type="checkbox"
                  :checked="selected.has(row.id)"
                  :aria-label="`选择 ${row.name || '未命名'}`"
                  @change="toggleRow(row.id, $event)"
                />
              </td>
              <td>
                <div class="name">{{ row.name || '未命名' }}</div>
                <div v-if="row.note" class="note">{{ row.note }}</div>
                <div v-if="row.channel" class="note channel">{{ row.channel }}</div>
                <div v-if="row.groupName" class="group-tag">{{ row.groupName }}</div>
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
              <td class="actions-col">
                <RowMenu :items="rowMenuItems(row)" @select="onRowMenu(row, $event)" />
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
  type AdminRosterDeletedGroup,
  type AdminRosterGroup,
  type AdminRosterHiddenDate,
  type AdminRosterRow,
  type AdminRosterStage
} from '@/api'
import { formatDate } from '@/format'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import RowMenu, { type RowMenuItem } from '@/components/RowMenu.vue'
import { confirmAction, promptAction } from '@/useConfirm'
import { useSlashFocus } from '@/useHotkeys'

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
const deletingId = ref('')
const deletingInviteId = ref('')
const selected = ref<Set<string>>(new Set())
const batchDeleting = ref(false)
const groups = ref<AdminRosterGroup[]>([])
const deletedGroups = ref<AdminRosterDeletedGroup[]>([])
const ungrouped = ref(0)
const groupFilter = ref('')
const groupPanelOpen = ref(false)
const newGroupName = ref('')
const groupSaving = ref(false)
const datePanelOpen = ref(false)
const hiddenDates = ref<AdminRosterHiddenDate[]>([])

function setGroupFilter(value: string) {
  groupFilter.value = value
  void load()
}

async function createGroup() {
  const name = newGroupName.value.trim()
  if (!name) {
    flash('先填分组名称')
    return
  }
  groupSaving.value = true
  try {
    await api.createRosterGroup(name)
    newGroupName.value = ''
    await load()
    flash('分组已创建')
  } catch (err) {
    flash(err instanceof Error ? err.message : '创建失败')
  } finally {
    groupSaving.value = false
  }
}

async function renameGroup(group: AdminRosterGroup) {
  const name = (
    await promptAction({
      title: '分组改名',
      message: `修改分组「${group.name}」的名称。`,
      confirmText: '保存',
      input: { label: '新的分组名称', value: group.name, maxlength: 24, required: true }
    })
  )?.trim()
  if (!name || name === group.name) return
  groupSaving.value = true
  try {
    await api.renameRosterGroup(group.id, name)
    await load()
    flash('分组已改名')
  } catch (err) {
    flash(err instanceof Error ? err.message : '改名失败')
  } finally {
    groupSaving.value = false
  }
}

async function deleteGroup(group: AdminRosterGroup) {
  const ok = await confirmAction({
    title: '删除分组',
    message: `删除分组「${group.name}」？只删分组本身，里面的 ${group.count} 条记录会回到「未分组」，之后可以恢复。`,
    confirmText: '删除分组',
    danger: true
  })
  if (!ok) return
  groupSaving.value = true
  try {
    await api.deleteRosterGroup(group.id)
    if (groupFilter.value === group.id) groupFilter.value = ''
    await load()
    flash('分组已删除，可在“已删除的分组”里恢复')
  } catch (err) {
    flash(err instanceof Error ? err.message : '删除失败')
  } finally {
    groupSaving.value = false
  }
}

async function restoreGroup(group: AdminRosterDeletedGroup) {
  groupSaving.value = true
  try {
    await api.restoreRosterGroup(group.id)
    await load()
    flash(`分组「${group.name}」已恢复`)
  } catch (err) {
    flash(err instanceof Error ? err.message : '恢复失败')
  } finally {
    groupSaving.value = false
  }
}

async function hideDate(day: AdminRosterDateOption) {
  const ok = await confirmAction({
    title: '删除日期分类',
    message: `删除日期分类「${dateLabel(day.date)}」？只是不再出现在日期筛选里，${day.count} 条记录不会受影响，之后可以恢复。`,
    confirmText: '删除分类',
    danger: true
  })
  if (!ok) return
  try {
    await api.hideRosterDate(day.date)
    await load()
    flash('日期分类已删除')
  } catch (err) {
    flash(err instanceof Error ? err.message : '删除失败')
  }
}

async function restoreDate(day: AdminRosterHiddenDate) {
  try {
    await api.restoreRosterDate(day.date)
    await load()
    flash('日期分类已恢复')
  } catch (err) {
    flash(err instanceof Error ? err.message : '恢复失败')
  }
}

async function assignSelected(event: Event) {
  const select = event.target as HTMLSelectElement
  const value = select.value
  select.value = ''
  if (!value) return
  const ids = [...selected.value]
  if (ids.length === 0) return
  const groupId = value === '__none' ? null : value
  const label = groupId
    ? groups.value.find((group) => group.id === groupId)?.name ?? '分组'
    : '未分组'
  try {
    await api.assignRosterGroup(ids, groupId)
    await load()
    flash(`已把 ${ids.length} 条移到「${label}」`)
  } catch (err) {
    flash(err instanceof Error ? err.message : '归类失败')
  }
}

const allSelected = computed(
  () => roster.value.length > 0 && selected.value.size === roster.value.length
)
const someSelected = computed(
  () => selected.value.size > 0 && selected.value.size < roster.value.length
)

function toggleRow(id: string, event: Event) {
  const next = new Set(selected.value)
  if ((event.target as HTMLInputElement).checked) next.add(id)
  else next.delete(id)
  selected.value = next
}

function toggleAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selected.value = checked ? new Set(roster.value.map((row) => row.id)) : new Set()
}

async function removeSelected() {
  const ids = [...selected.value]
  if (ids.length === 0) return
  const ok = await confirmAction({
    title: '批量删除记录',
    message: `删除选中的 ${ids.length} 条记录？答卷、报告和邀请链接都会一起删掉，删完不能恢复。`,
    confirmText: '删除',
    danger: true
  })
  if (!ok) return
  batchDeleting.value = true
  try {
    await api.batchDeleteRoster(ids)
    selected.value = new Set()
    await load()
    flash(`已删除 ${ids.length} 条记录`)
  } catch (err) {
    flash(err instanceof Error ? err.message : '批量删除失败')
  } finally {
    batchDeleting.value = false
  }
}

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
      group: groupFilter.value || undefined,
      dates: allDatesSelected.value ? undefined : [...selectedDates.value]
    })
    if (requestId !== loadRequest) return
    roster.value = result.roster
    counts.value = result.counts
    dateOptions.value = result.dates ?? []
    groups.value = result.groups ?? []
    deletedGroups.value = result.deletedGroups ?? []
    ungrouped.value = result.ungrouped ?? 0
    hiddenDates.value = result.hiddenDates ?? []
    // 分组被删掉后，筛选项可能失效，回到全部。
    if (groupFilter.value && groupFilter.value !== 'none') {
      const stillExists = groups.value.some((group) => group.id === groupFilter.value)
      if (!stillExists) groupFilter.value = ''
    }
    // 只保留还在列表里的勾选，避免删除后选中计数残留。
    const visibleIds = new Set(result.roster.map((row) => row.id))
    selected.value = new Set([...selected.value].filter((id) => visibleIds.has(id)))
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

function openRow(row: AdminRosterRow, event: MouseEvent | KeyboardEvent) {
  if (!row.detailPath) return
  const target = event.target as HTMLElement | null
  if (
    target?.closest(
      'a, button, input, select, textarea, label, [data-row-ignore], [role="menu"], [role="menuitem"]'
    )
  ) {
    return
  }
  void router.push(row.detailPath)
}

function clearSelection() {
  selected.value = new Set()
}

function rowMenuItems(row: AdminRosterRow): RowMenuItem[] {
  if (row.submissionId) {
    const items: RowMenuItem[] = []
    if (row.detailPath) items.push({ key: 'detail', label: '查看答卷' })
    if (row.reportPath) items.push({ key: 'report', label: '打开报告' })
    items.push({
      key: 'delete-submission',
      label: deletingId.value === row.id ? '删除中…' : '删除答卷',
      danger: true,
      disabled: !!deletingId.value
    })
    return items
  }
  const items: RowMenuItem[] = []
  if (row.stage === 'expired') items.push({ key: 'rotate', label: '换新链接' })
  items.push({ key: 'copy', label: '复制链接' })
  if (row.stage !== 'expired') items.push({ key: 'open', label: '打开' })
  items.push({
    key: 'delete-invite',
    label: deletingInviteId.value === row.id ? '删除中…' : '删除记录',
    danger: true,
    disabled: !!deletingInviteId.value
  })
  return items
}

async function onRowMenu(row: AdminRosterRow, key: string) {
  if (key === 'detail') {
    if (row.detailPath) void router.push(row.detailPath)
  } else if (key === 'report') {
    if (row.reportPath) window.open(row.reportPath, '_blank', 'noopener')
  } else if (key === 'copy') {
    await copyLink(row)
  } else if (key === 'open') {
    openInvite(row)
  } else if (key === 'rotate') {
    await rotate(row)
  } else if (key === 'delete-submission') {
    await removeSubmission(row)
  } else if (key === 'delete-invite') {
    await removeInvite(row)
  }
}

async function removeInvite(row: AdminRosterRow) {
  const who = row.name || '这条邀请记录'
  const ok = await confirmAction({
    title: '删除记录',
    message: `删除「${who}」这条记录？删除后链接失效，列表里不再显示。已提交的答卷不受影响，请先删答卷。`,
    confirmText: '删除',
    danger: true
  })
  if (!ok) return
  deletingInviteId.value = row.id
  try {
    await api.deleteInvite(row.inviteId)
    await load()
    flash('记录已删除')
  } catch (err) {
    flash(err instanceof Error ? err.message : '删除失败')
  } finally {
    deletingInviteId.value = ''
  }
}

async function removeSubmission(row: AdminRosterRow) {
  if (!row.submissionId) return
  const who = row.name || '这位学员'
  const ok = await confirmAction({
    title: '删除答卷',
    message: `删除「${who}」的答卷和报告？删除后这条邀请链接会回到「已打开」，可以重新填写。`,
    confirmText: '删除答卷',
    danger: true
  })
  if (!ok) return
  deletingId.value = row.id
  try {
    await api.deleteSubmission(row.submissionId)
    await load()
    flash('答卷已删除')
  } catch (err) {
    flash(err instanceof Error ? err.message : '删除失败')
  } finally {
    deletingId.value = ''
  }
}

async function rotate(row: AdminRosterRow) {
  const ok = await confirmAction({
    title: '换新链接',
    message: `给「${row.name || '这位学员'}」换一条新链接？旧链接会立即失效。`,
    confirmText: '换新链接'
  })
  if (!ok) return
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

useSlashFocus()
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

.group-bar {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.group-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-2);
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.group-chip b {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
}

.group-chip:hover {
  border-color: var(--ink-3);
}

.group-chip.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.group-chip.on b {
  color: rgba(255, 255, 255, 0.75);
}

.group-chip.ghost {
  border-style: dashed;
  background: transparent;
  color: var(--ink-3);
}

.group-panel {
  margin-bottom: 14px;
  padding: 16px 18px;
}

.group-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.group-panel-head h2 {
  font-size: 14px;
}

.group-create {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.group-create .input {
  max-width: 220px;
  height: 36px;
  font-size: 13px;
}

.group-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--line);
}

.group-item:last-child {
  border-bottom: 0;
}

.group-name {
  font-weight: 500;
  color: var(--ink);
}

.group-item-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.group-deleted {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.group-deleted .eyebrow {
  margin-bottom: 8px;
}

.group-tag {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
}

.small-select {
  height: 32px;
  max-width: 160px;
  font-size: 12.5px;
  padding: 0 10px;
}

.date-manage {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.date-manage > .eyebrow {
  margin-bottom: 4px;
}

.date-manage > .quiet.tiny {
  display: block;
  margin-bottom: 10px;
  line-height: 1.7;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.selection-bar {
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: 12px;
  background: var(--accent-soft);
  margin-bottom: 12px;
}

.selection-bar strong {
  font-size: 13px;
  white-space: nowrap;
}

@media (min-width: 901px) {
  .list-toolbar,
  .selection-bar {
    position: sticky;
    top: 0;
    z-index: 18;
  }

  .list-toolbar {
    margin: -8px 0 6px;
    padding: 8px 0;
    background: var(--paper);
    border-bottom: 1px solid var(--line);
  }

  .selection-bar {
    margin: -8px 0 12px;
  }
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
  overflow: auto;
}

@media (min-width: 901px) {
  .table-scroll {
    max-height: calc(100vh - 230px);
  }

  .roster-table thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--surface);
    box-shadow: inset 0 -1px 0 var(--line);
  }
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

.row-link {
  cursor: pointer;
}

.roster-table tbody tr.row-link:focus-visible {
  outline: 2px solid rgba(47, 93, 70, 0.55);
  outline-offset: -2px;
}

.actions-col {
  width: 64px;
  text-align: right;
}

.selection-bar .danger-btn {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 35%, transparent);
}

.select-col {
  width: 34px;
  padding-right: 0 !important;
}

.select-col input {
  width: 15px;
  height: 15px;
  accent-color: var(--accent);
  cursor: pointer;
}

.roster-table tbody tr.picked td {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
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
