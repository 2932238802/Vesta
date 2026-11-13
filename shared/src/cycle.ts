const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** 把任意时间归到所在期次的「周三」日期键（YYYY-MM-DD，固定 Asia/Shanghai）。 */
export function cycleStartKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  // 先平移到上海墙钟，再用 UTC getter 读年月日，避免依赖服务器 TZ。
  const local = new Date(date.getTime() + SHANGHAI_OFFSET_MS)
  const dayIndex = Math.floor(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) / DAY_MS
  )
  const weekday = new Date(dayIndex * DAY_MS).getUTCDay() // 0=周日 … 6=周六
  const back = (weekday + 4) % 7 // 周三=0、周四=1、周五=2、周六=3、周日=4、周一=5、周二=6
  const start = new Date((dayIndex - back) * DAY_MS)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}-${pad(start.getUTCDate())}`
}

function parseKey(startKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startKey)) return null
  const date = new Date(`${startKey}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** 期次区间：起点（周三）→ 第 6 天（周二），均为 YYYY-MM-DD。 */
export function cycleRange(startKey: string): { start: string; end: string } {
  const start = parseKey(startKey)
  if (!start) return { start: '', end: '' }
  const end = new Date(start.getTime() + 6 * DAY_MS)
  return { start: formatKey(start), end: formatKey(end) }
}

/** chip 文案：`11/11–11/17`，跨年显示 `12/30–01/05`。 */
export function cycleLabel(startKey: string): string {
  const { start, end } = cycleRange(startKey)
  if (!start || !end) return ''
  const monthDay = (key: string) => key.slice(5, 7) + '/' + key.slice(8, 10)
  return `${monthDay(start)}–${monthDay(end)}`
}

export function currentCycleKey(now: Date = new Date()): string {
  return cycleStartKey(now)
}
