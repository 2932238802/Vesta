/**
 * 报告里所有「离某天还有多久 / 已经过去多久」的唯一计算入口。
 *
 * 只做日历差，不把天数除以 365 或 365.25。对外只给粗粒度结果：
 * 两年、三年、一年、一年半、X 个月、不到一个月、已过去……
 */

export interface CalendarDate {
  year: number
  month: number
  day: number
}

export interface CalendarSpan {
  /** 方向：to 在 from 之后为 future，之前为 past，同一天为 same */
  direction: 'future' | 'past' | 'same'
  /** 完整的年、月、日；永远非负 */
  years: number
  months: number
  days: number
  /** 只按完整月累计，不含零头天数 */
  totalMonths: number
}

export type DateInput = Date | string | number

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function isValidCalendar(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const probe = new Date(year, month - 1, day)
  return (
    probe.getFullYear() === year &&
    probe.getMonth() === month - 1 &&
    probe.getDate() === day
  )
}

/**
 * 解析成「本机日历上的年月日」。
 * 纯日期字符串按字面解析，避免 new Date('2026-01-01') 被当成 UTC 后在东八区变成前一天。
 */
export function toCalendarDate(value: DateInput): CalendarDate | null {
  if (typeof value === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(value.trim())
    if (dateOnly) {
      const year = Number(dateOnly[1])
      const month = Number(dateOnly[2])
      const day = Number(dateOnly[3])
      return isValidCalendar(year, month, day) ? { year, month, day } : null
    }
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  }
}

export function compareCalendar(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** 从日历日期加 N 个月，目标月没有这一天时截断到月末。 */
function addCalendarMonthsClamped(base: CalendarDate, months: number): CalendarDate {
  const targetMonthIndex = base.year * 12 + (base.month - 1) + months
  const year = Math.floor(targetMonthIndex / 12)
  const month = (((targetMonthIndex % 12) + 12) % 12) + 1
  const day = Math.min(base.day, daysInMonth(year, month))
  return { year, month, day }
}

/** 两个日历日期之间相差的天数；用 UTC 计算，避开夏令时。 */
function calendarDaysBetween(from: CalendarDate, to: CalendarDate): number {
  const start = Date.UTC(from.year, from.month - 1, from.day)
  const end = Date.UTC(to.year, to.month - 1, to.day)
  return Math.round((end - start) / 86_400_000)
}

/** 日历差；from 和 to 都按本机时区的年月日计算。 */
export function calendarSpan(from: DateInput, to: DateInput): CalendarSpan | null {
  const start = toCalendarDate(from)
  const end = toCalendarDate(to)
  if (!start || !end) return null

  const order = compareCalendar(start, end)
  if (order === 0) {
    return { direction: 'same', years: 0, months: 0, days: 0, totalMonths: 0 }
  }

  const direction: CalendarSpan['direction'] = order < 0 ? 'future' : 'past'
  const early = order < 0 ? start : end
  const late = order < 0 ? end : start

  // 先按月字段差算出完整月：目标日小于起始日时，这个月还没满。
  let years = late.year - early.year
  let months = late.month - early.month
  if (late.day < early.day) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  const totalMonths = years * 12 + months

  // 余下的天数从「起点加完整月」算起，月末按月末截断，保证 days 非负。
  const anchor = addCalendarMonthsClamped(early, totalMonths)
  const days = calendarDaysBetween(anchor, late)

  return { direction, years, months, days, totalMonths }
}

/** 只算完整月；用于招聘信息时效、新鲜度这类门槛判断。 */
export function calendarMonthsBetween(from: DateInput, to: DateInput): number {
  return calendarSpan(from, to)?.totalMonths ?? 0
}

/** 日期是否已经超过 N 个完整月（含恰好 N 个月）。 */
export function isOlderThanMonths(date: DateInput, months: number, now: DateInput = new Date()): boolean {
  // 从 now 指向 date：date 更早时 direction 才是 past。
  const span = calendarSpan(now, date)
  return Boolean(span && span.direction === 'past' && span.totalMonths >= months)
}

const CHINESE_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

function chineseNumber(value: number): string {
  if (value < 10) return CHINESE_DIGITS[value] ?? String(value)
  if (value < 20) return value === 10 ? '十' : `十${CHINESE_DIGITS[value - 10]}`
  if (value < 100) {
    const tens = Math.floor(value / 10)
    const ones = value % 10
    return `${CHINESE_DIGITS[tens]}十${ones ? CHINESE_DIGITS[ones] : ''}`
  }
  return String(value)
}

/**
 * 粗粒度描述距离。
 *
 * - >= 2 年：两年、三年……（按最近整年取粗档）
 * - 18—23 个月：一年半
 * - 12—17 个月：一年
 * - 1—11 个月：X 个月
 * - 有零头但不足一个月：不到一个月
 * - 同一天：今天
 * - 已经过去：前缀「已过去 」
 */
export function describeDistance(from: DateInput, to: DateInput): string {
  const span = calendarSpan(from, to)
  if (!span) return ''
  if (span.direction === 'same') return '今天'

  const prefix = span.direction === 'past' ? '已过去 ' : ''
  const total = span.totalMonths

  if (total >= 24) {
    const years = Math.max(2, Math.round(total / 12))
    return `${prefix}${years === 2 ? '两' : chineseNumber(years)}年`
  }
  if (total >= 18) return `${prefix}一年半`
  if (total >= 12) return `${prefix}一年`
  if (total >= 1) return `${prefix}${total} 个月`
  return `${prefix}不到一个月`
}

/** 给日期加 N 个日历月；只用于把「第几个学年/月份」换成目标日期。 */
export function addCalendarMonths(value: DateInput, months: number): Date | null {
  const base = toCalendarDate(value)
  if (!base) return null
  const target = addCalendarMonthsClamped(base, months)
  return new Date(target.year, target.month - 1, target.day)
}

export function formatCalendarDate(value: DateInput): string {
  const date = toCalendarDate(value)
  if (!date) return ''
  return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`
}
