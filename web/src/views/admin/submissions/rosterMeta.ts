import type { AdminRosterRow, AdminRosterStage } from '@/api'

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

/** doc 模式没有数字总分，只展示 A/B/C 优先级；legacy 问卷仍显示真实分数。 */
export function rosterScoreLabel(roster: AdminRosterRow[]): string {
  const submitted = roster.filter((row) => row.submissionId)
  const hasDoc = submitted.some((row) => row.reportMode === 'doc')
  const hasLegacy = submitted.some((row) => row.reportMode !== 'doc')
  if (hasDoc && hasLegacy) return '优先级 / 分数'
  return hasDoc ? '优先级' : '分数'
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
