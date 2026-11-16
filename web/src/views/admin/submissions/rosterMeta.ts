import type { AdminRosterStage, ConsultResult } from '@/api'

export const ROSTER_TABS = [
  { key: '', label: '全部' },
  { key: 'unsubmitted', label: '未填写' },
  { key: 'unclaimed', label: '已提交未领取' },
  { key: 'new', label: '待联系' },
  { key: 'contacted', label: '已联系' },
  { key: 'scheduled', label: '已约时间' },
  { key: 'done', label: '已完成' }
] as const

export const TAB_KEYS = new Set<string>(ROSTER_TABS.map((item) => item.key))

export const STAGE_LABELS: Record<AdminRosterStage, string> = {
  pending: '待打开',
  opened: '已打开未填',
  expired: '已过期',
  unclaimed: '已提交未领取',
  new: '待联系',
  contacted: '已联系',
  scheduled: '已约时间',
  done: '已完成'
}

export function stageLabel(stage: AdminRosterStage): string {
  return STAGE_LABELS[stage] ?? stage
}

export function stageClass(stage: AdminRosterStage): string {
  if (stage === 'done') return 'accent'
  if (stage === 'expired') return 'danger'
  if (stage === 'opened' || stage === 'scheduled' || stage === 'unclaimed') return 'warn'
  return ''
}

export function inviteUrl(token: string): string {
  return `${location.origin}/i/${token}`
}

export async function writeClipboard(text: string): Promise<boolean> {
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

export const CONSULT_RESULT_OPTIONS: { value: ConsultResult | ''; label: string }[] = [
  { value: '', label: '未选择' },
  { value: 'won', label: '已成交' },
  { value: 'following', label: '跟进' },
  { value: 'almost', label: '快成了' },
  { value: 'maintaining', label: '维护中' }
]

const CONSULT_RESULT_LABELS: Record<ConsultResult, string> = {
  won: '已成交',
  following: '跟进',
  almost: '快成了',
  maintaining: '维护中'
}

/** 空值 / 未知值都返回空串，不把历史脏值带进页面。 */
export function consultResultLabel(value: string): string {
  return CONSULT_RESULT_LABELS[value as ConsultResult] ?? ''
}

interface EmptyTextOptions {
  category: string
  week: string
  weekLabel: string
  current: boolean
  searching: boolean
  allWeeksCount: number
}

/** 空状态文案：期次 / 状态 / 搜索三种口径，避免再出现「日期分类」「分组」的旧词。 */
export function rosterEmptyText(options: EmptyTextOptions): string {
  const { category, week, weekLabel, current, searching, allWeeksCount } = options
  if (searching) {
    if (week !== 'all' && allWeeksCount > 0) return '这一期没有搜到学员'
    return '没有找到匹配的学员'
  }
  const inWeek = week !== 'all'
  const scope = inWeek ? (current ? '本期' : '这一期') : ''
  if (category && category !== 'all') {
    const label = ROSTER_TABS.find((tab) => tab.key === category)?.label ?? '这个状态'
    return inWeek ? `${scope}没有${label}的学员` : `没有${label}的学员`
  }
  if (inWeek) return `${scope}（${weekLabel}）还没有学员`
  return '还没有邀请或答卷'
}
