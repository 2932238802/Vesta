<template>
  <section class="card table-card">
    <div v-if="loading" class="empty">正在读取</div>
    <div v-else-if="error" class="empty">
      {{ error }}
      <div class="empty-action">
        <button class="btn ghost small" type="button" @click="$emit('reload')">重新读取</button>
      </div>
    </div>
    <div v-else-if="roster.length === 0" class="empty">
      {{ emptyText }}
      <div v-if="searching && hasWeekFilter && allWeeksCount > 0" class="empty-action">
        <button class="btn ghost small" type="button" @click="$emit('search-all-weeks')">
          在全部期次里搜
        </button>
      </div>
      <div v-else-if="category !== ''" class="empty-action">
        <button class="btn ghost small" type="button" @click="$emit('clear-category')">
          查看全部状态
        </button>
      </div>
      <div v-else-if="allCount === 0" class="empty-action">
        <RouterLink class="btn ghost small" to="/admin/invites">去生成邀请链接</RouterLink>
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
                :aria-label="selectAllLabel"
                @change="$emit('toggle-all', $event)"
              />
            </th>
            <th>学员</th>
            <th class="consult-col">是否咨询</th>
            <th>阶段</th>
            <th class="result-col">咨询结果</th>
            <th class="priority-col">优先级</th>
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
              {
                unsubmitted: !row.submissionId,
                picked: selected.has(row.id),
                consulted: row.consulted,
                archived,
                'row-link': !!row.detailPath
              }
            ]"
            :tabindex="row.detailPath ? 0 : undefined"
            :role="row.detailPath ? 'link' : undefined"
            @click="$emit('open-row', row, $event)"
            @keydown.enter.self="$emit('open-row', row, $event)"
          >
            <td class="select-col">
              <input
                type="checkbox"
                :checked="selected.has(row.id)"
                :aria-label="`选择 ${row.name || '未命名'}`"
                @change="$emit('toggle-row', row.id, $event)"
              />
            </td>
            <td>
              <div class="name">{{ row.name || '未命名' }}</div>
              <div v-if="row.groups.length || archived" class="group-chips">
                <template v-if="row.groups.length">
                  <span
                    v-for="group in row.groups.slice(0, 3)"
                    :key="group.id"
                    class="group-chip mini"
                  >
                    {{ group.name }}
                  </span>
                  <span
                    v-if="row.groups.length > 3"
                    class="group-chip mini"
                    :title="row.groups.map((group) => group.name).join('、')"
                  >
                    +{{ row.groups.length - 3 }}
                  </span>
                </template>
                <span v-else class="chip mini archived-chip">已归档</span>
              </div>
              <div v-if="row.note" class="note">{{ row.note }}</div>
              <div v-if="row.channel" class="note channel">{{ row.channel }}</div>
            </td>
            <td class="consult-col">
              <input
                type="checkbox"
                class="consult-check"
                :checked="row.consulted"
                :disabled="savingCell === cellKey(row, 'consulted')"
                :aria-label="`标记 ${row.name || '未命名'} 已咨询`"
                @change="$emit('toggle-consulted', row, $event)"
              />
            </td>
            <td>
              <select
                v-if="row.submissionId && row.claimed"
                class="select status-select"
                :value="row.contactStatus ?? 'new'"
                :disabled="savingStatus === row.id"
                @change="$emit('change-status', row, $event)"
              >
                <option value="new">待联系</option>
                <option value="contacted">已联系</option>
                <option value="scheduled">已约时间</option>
                <option value="done">已完成</option>
              </select>
              <span v-else class="chip" :class="stageClass(row.stage)">{{ stageLabel(row.stage) }}</span>
              <div v-if="row.stage === 'unclaimed'" class="note">已提交，还没有领取规划</div>
            </td>
            <td class="result-col">
              <select
                class="select result-select"
                :value="row.consultResult"
                :disabled="!row.consulted || savingCell === cellKey(row, 'consultResult')"
                :aria-label="`${row.name || '未命名'} 的咨询结果`"
                @change="$emit('change-consult-result', row, $event)"
              >
                <option v-for="option in CONSULT_RESULT_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </td>
            <td class="priority-col">
              <input
                type="text"
                class="input priority-input"
                :value="row.priority"
                maxlength="20"
                placeholder="填写"
                :disabled="savingCell === cellKey(row, 'priority')"
                :aria-label="`${row.name || '未命名'} 的优先级`"
                @change="$emit('change-priority', row, $event)"
                @keydown.enter="$emit('change-priority', row, $event)"
              />
              <div v-if="row.submissionId && row.reportMode !== 'doc'" class="note priority-legacy-total">
                {{ row.total }} 分
              </div>
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
            <td class="actions-col">
              <RowMenu :items="rowMenuItems(row)" @select="$emit('row-menu', row, $event)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { AdminRosterRow } from '@/api'
import { formatDate } from '@/format'
import RowMenu from '@/components/RowMenu.vue'
import type { RowMenuItem } from '@/components/row-menu'
import { CONSULT_RESULT_OPTIONS, stageClass, stageLabel } from './rosterMeta'
withDefaults(defineProps<{
  loading: boolean
  error: string
  roster: AdminRosterRow[]
  emptyText: string
  selected: Set<string>
  allSelected: boolean
  someSelected: boolean
  savingStatus: string
  savingCell: string
  hasWeekFilter: boolean
  searching: boolean
  allWeeksCount: number
  category: string
  allCount: number
  rowMenuItems: (row: AdminRosterRow) => RowMenuItem[]
  /** 归档区块复用同一张表：只加边框 / 背景区分，不降文字对比度。 */
  archived?: boolean
  selectAllLabel?: string
}>(), { archived: false, selectAllLabel: '全选' })

/** 只锁住正在保存的那个单元格，其他行和其他列不受影响。 */
function cellKey(row: AdminRosterRow, field: string): string {
  return `${row.id}:${field}`
}

defineEmits<{
  (event: 'reload'): void
  (event: 'search-all-weeks'): void
  (event: 'clear-category'): void
  (event: 'toggle-all', change: Event): void
  (event: 'toggle-row', id: string, change: Event): void
  (event: 'open-row', row: AdminRosterRow, event: MouseEvent | KeyboardEvent): void
  (event: 'change-status', row: AdminRosterRow, change: Event): void
  (event: 'toggle-consulted', row: AdminRosterRow, change: Event): void
  (event: 'change-consult-result', row: AdminRosterRow, change: Event): void
  (event: 'change-priority', row: AdminRosterRow, change: Event): void
  (event: 'row-menu', row: AdminRosterRow, key: string): void
}>()
</script>

