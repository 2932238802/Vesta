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
