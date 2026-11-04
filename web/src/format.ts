export const CONTACT_LABELS: Record<string, string> = {
  new: '待联系',
  contacted: '已联系',
  scheduled: '已约时间',
  done: '已完成'
}

export const INVITE_STATUS_LABELS: Record<string, string> = {
  pending: '待填写',
  opened: '已打开',
  submitted: '已提交',
  expired: '已过期'
}

export function formatDate(value?: string | null, withTime = true): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
  if (!withTime) return day
  return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function contactLabel(status: string): string {
  return CONTACT_LABELS[status] ?? status
}

export function inviteStatusLabel(status: string): string {
  return INVITE_STATUS_LABELS[status] ?? status
}

export type DateRangeKey = '' | 'today' | '7d' | '30d' | 'custom'

function localDay(value: string): Date | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function dateRangeBounds(
  range: DateRangeKey,
  customFrom = '',
  customTo = ''
): { from?: string; to?: string } {
  if (!range) return {}

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (range === 'today') {
    return { from: today.toISOString(), to: tomorrow.toISOString() }
  }

  if (range === '7d' || range === '30d') {
    const start = new Date(today)
    start.setDate(start.getDate() - (range === '7d' ? 6 : 29))
    return { from: start.toISOString(), to: tomorrow.toISOString() }
  }

  const from = localDay(customFrom)
  const to = localDay(customTo)
  if (!from || !to || from > to) return {}
  const end = new Date(to)
  end.setDate(end.getDate() + 1)
  return { from: from.toISOString(), to: end.toISOString() }
}
