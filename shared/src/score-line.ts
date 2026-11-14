/**
 * 分数线类型注册表与共享校验。
 *
 * 类型放代码（受控词表，前后端共用），数据集 / 条目放数据库：
 *   类型（考试）→ 数据集（某年某地区的一批线）→ 条目（一个具体数值）
 * 新增类型只加一行常量，不改表结构。
 */

export interface ScoreLineCategory {
  id: string
  name: string
  /** 列表页 tab 的补充说明，可空；不确定就不填。 */
  hint?: string
}

/** 首批类型；增删不影响表结构。类型 id 一旦上线不要改。 */
export const scoreLineCategories: ScoreLineCategory[] = [
  { id: 'postgrad', name: '考研' },
  { id: 'cet', name: '四六级' },
  { id: 'upgrade', name: '专升本' },
  { id: 'teacher', name: '教资' },
  { id: 'civil', name: '考公' }
]

export const scoreLineCategoryIds = new Set(scoreLineCategories.map((item) => item.id))

export function scoreLineCategoryName(id: string): string {
  return scoreLineCategories.find((item) => item.id === id)?.name ?? id
}

export interface ScoreLineEntry {
  id: string
  label: string
  value: number
  maxValue?: number
  note?: string
}

export interface ScoreLineSet {
  id: string
  categoryId: string
  title: string
  year: number
  region: string
  sourceName: string
  sourceUrl: string
  note: string
  entries: ScoreLineEntry[]
  createdAt: string
  updatedAt: string
}

export interface ScoreLineEntryInput {
  label: string
  value: number
  maxValue?: number | null
  note?: string
}

export interface ScoreLineInput {
  categoryId: string
  title: string
  year: number
  region?: string
  sourceName: string
  sourceUrl?: string
  note?: string
  entries: ScoreLineEntryInput[]
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** 年份留空按 0（未标年份）处理；其他数字原样返回。 */
function toYear(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0
  const parsed = toNumber(value)
  return parsed === null ? Number.NaN : parsed
}

/** 校验输入，返回中文错误；第一条可以直接展示给用户。 */
export function validateScoreLineInput(input: unknown): string[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['请求格式不对']
  const raw = input as Record<string, unknown>
  const errors: string[] = []

  if (!scoreLineCategoryIds.has(text(raw.categoryId))) errors.push('请选择分数线类型')

  const title = text(raw.title)
  if (!title) errors.push('请填写标题')
  else if (title.length > 120) errors.push('标题最多 120 个字')

  const year = toYear(raw.year)
  if (!Number.isInteger(year) || (year !== 0 && (year < 2000 || year > 2100))) {
    errors.push('年份需在 2000–2100 之间，或留空')
  }

  if (text(raw.region).length > 20) errors.push('地区最多 20 个字')

  const sourceName = text(raw.sourceName)
  if (!sourceName) errors.push('请填写来源')
  else if (sourceName.length > 80) errors.push('来源最多 80 个字')

  const sourceUrl = text(raw.sourceUrl)
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    errors.push('来源链接需以 http:// 或 https:// 开头')
  }
  if (sourceUrl.length > 500) errors.push('来源链接最多 500 个字')

  if (text(raw.note).length > 500) errors.push('说明最多 500 个字')

  const entries: unknown[] = Array.isArray(raw.entries) ? raw.entries : []
  if (entries.length === 0) {
    errors.push('至少填写一条分数线')
  } else if (entries.length > 100) {
    errors.push('最多 100 条分数线')
  } else {
    entries.forEach((entry, index) => {
      const label = `第 ${index + 1} 条：`
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`${label}格式不对`)
        return
      }
      const row = entry as Record<string, unknown>
      const name = text(row.label)
      if (!name) errors.push(`${label}名称不能为空`)
      else if (name.length > 40) errors.push(`${label}名称最多 40 个字`)

      const value = toNumber(row.value)
      if (value === null || value < 0 || value > 1000) {
        errors.push(`${label}分数需在 0–1000 之间`)
      }

      const hasMax =
        row.maxValue !== undefined && row.maxValue !== null && row.maxValue !== ''
      const maxValue = hasMax ? toNumber(row.maxValue) : null
      if (hasMax && (maxValue === null || maxValue <= 0 || maxValue > 1000)) {
        errors.push(`${label}满分需大于 0 且不超过 1000`)
      } else if (value !== null && maxValue !== null && value > maxValue) {
        errors.push(`${label}分数不能大于满分`)
      }

      if (text(row.note).length > 100) errors.push(`${label}备注最多 100 个字`)
    })
  }

  return errors
}

/** 校验通过后调用：把输入整理成可写库的结构（空字符串补空，数字统一）。 */
export function normalizeScoreLineInput(input: unknown): ScoreLineInput {
  const raw = (input ?? {}) as Record<string, unknown>
  const entries: unknown[] = Array.isArray(raw.entries) ? raw.entries : []
  return {
    categoryId: text(raw.categoryId),
    title: text(raw.title),
    year: toYear(raw.year),
    region: text(raw.region),
    sourceName: text(raw.sourceName),
    sourceUrl: text(raw.sourceUrl),
    note: text(raw.note),
    entries: entries.map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>
      const maxValue = toNumber(row.maxValue)
      return {
        label: text(row.label),
        value: toNumber(row.value) ?? 0,
        ...(maxValue === null ? {} : { maxValue }),
        note: text(row.note)
      }
    })
  }
}
