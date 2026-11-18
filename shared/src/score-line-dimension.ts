/**
 * 分数线维度字典：批次 / 学位类型（category）与科类 / 学科门类（track）。
 *
 * 查询侧按 canonical 值等值匹配，所以写库前必须走 `normalizeDimension()`。
 * 字典按 `exam` 分表：同一个 canonical 值在专升本 / 考研下含义可能不同（如「法学」）。
 * 认不出返回 `{ value: '', matched: false }`，由调用方保留原文并记 issue，**不猜**。
 */

import type { ExamType } from './score-line'

export type DimensionKind = 'category' | 'track'

export interface DimensionValue {
  value: string
  label: string
  aliases: string[]
}

/**
 * 查询 / facets 里代表「该维度为空」的哨兵值，不是写库值。
 * 前端选它 = 显式只看 `category=''` / `track=''`；与「全部（不筛选）」区分。
 */
export const DIMENSION_UNLABELED = '__unlabeled__'

/** facets 接口的候选项；count 是批次条数。 */
export interface DimensionFacetOption {
  value: string
  label: string
  count: number
}

/** facets 接口的返回结构。 */
export interface ScoreLineFacets {
  scope: 'national' | 'provincial'
  year: number
  yearFrom: number
  region: string
  category: DimensionFacetOption[]
  track: DimensionFacetOption[]
}

function dim(value: string, aliases: string[] = []): DimensionValue {
  return { value, label: value, aliases }
}

/** 考研：学硕 / 专硕（学位类型）。 */
export const POSTGRAD_CATEGORIES: DimensionValue[] = [
  dim('学硕', ['学术学位', '学术型', '学术型硕士', '学术学位硕士', '学硕类']),
  dim('专硕', ['专业学位', '专业型', '专业型硕士', '专业学位硕士', '专硕类'])
]

/** 专升本：普通类 / 建档立卡 / 退役士兵 / 免试。 */
export const UPGRADE_CATEGORIES: DimensionValue[] = [
  dim('普通类', ['普通', '普通计划', '普通考生', '普通类考生']),
  dim('建档立卡', ['建档立卡类', '建档立卡考生', '建档立卡贫困家庭', '脱贫家庭']),
  dim('退役士兵', ['退役士兵类', '退役大学生士兵', '退役大学生士兵专项', '退役士兵专项']),
  dim('免试', ['免试类', '免试生', '免试入学'])
]

/** 考研：14 个学科门类。 */
export const POSTGRAD_TRACKS: DimensionValue[] = [
  dim('哲学', ['哲学类']),
  dim('经济学', ['经济学类']),
  dim('法学', ['法学类']),
  dim('教育学', ['教育学类']),
  dim('文学', ['文学类']),
  dim('历史学', ['历史学类']),
  dim('理学', ['理学类']),
  dim('工学', ['工学类']),
  dim('农学', ['农学类']),
  dim('医学', ['医学类']),
  dim('军事学', ['军事学类']),
  dim('管理学', ['管理学类']),
  dim('艺术学', ['艺术学类']),
  dim('交叉学科', ['交叉学科类'])
]

/** 专升本：13 个科类（与类别表解析器的词表一致）。 */
export const UPGRADE_TRACKS: DimensionValue[] = [
  dim('文史', ['文史类']),
  dim('理工', ['理工类']),
  dim('经管', ['经管类', '经济管理', '经济管理类']),
  dim('教育', ['教育类', '教育学']),
  dim('法学', ['法学类']),
  dim('农学', ['农学类']),
  dim('医学', ['医学类']),
  dim('艺术', ['艺术类']),
  dim('体育', ['体育类']),
  dim('外语', ['外语类']),
  dim('中医', ['中医类']),
  dim('护理', ['护理类']),
  dim('药学', ['药学类'])
]

/** 去空格 / 括号 / 冒号 / 脚注编号；用于精确与别名匹配，不改变写库值。 */
function dimensionKey(value: string): string {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/（[^）]*）|\([^)]*\)/g, '')
    .replace(/[①-⑳]/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/[：:]/g, '')
    .trim()
}

function tableFor(kind: DimensionKind, exam: ExamType): DimensionValue[] {
  if (kind === 'category') {
    return exam === 'postgrad' ? POSTGRAD_CATEGORIES : UPGRADE_CATEGORIES
  }
  return exam === 'postgrad' ? POSTGRAD_TRACKS : UPGRADE_TRACKS
}

function findExact(table: DimensionValue[], key: string): DimensionValue | null {
  return (
    table.find((item) => dimensionKey(item.value) === key || dimensionKey(item.label) === key) ??
    null
  )
}

function findAlias(table: DimensionValue[], key: string): DimensionValue | null {
  return (
    table.find((item) => item.aliases.some((alias) => dimensionKey(alias) === key)) ?? null
  )
}

/**
 * 别名 → canonical。顺序：精确（value / label）→ 别名 → 去尾部「类」再精确 / 别名。
 * 认不出返回 `{ value: '', matched: false }`，不猜近似值。
 */
export function normalizeDimension(
  kind: DimensionKind,
  exam: ExamType,
  raw: string
): { value: string; matched: boolean } {
  const key = dimensionKey(raw)
  if (!key) return { value: '', matched: false }
  const table = tableFor(kind, exam)
  const matched = findExact(table, key) ?? findAlias(table, key)
  if (matched) return { value: matched.value, matched: true }
  const withoutSuffix = key.replace(/类$/, '')
  if (withoutSuffix && withoutSuffix !== key) {
    const again = findExact(table, withoutSuffix) ?? findAlias(table, withoutSuffix)
    if (again) return { value: again.value, matched: true }
  }
  return { value: '', matched: false }
}

/** 展示用标签：字典内取 label，字典外保留原值；空值显示「未标注」。 */
export function dimensionLabel(kind: DimensionKind, exam: ExamType, value: string): string {
  if (value === DIMENSION_UNLABELED) return '未标注'
  if (!value) return '全部'
  const matched = tableFor(kind, exam).find((item) => item.value === value)
  return matched?.label ?? value
}

/** 排序用：字典顺序在前，字典外值排后；「未标注」由调用方放到最后。 */
export function dimensionSortIndex(kind: DimensionKind, exam: ExamType, value: string): number {
  const index = tableFor(kind, exam).findIndex((item) => item.value === value)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

/**
 * 专升本按专业 / 细分科类划线的省（如山西「艺术类（舞蹈学类）」、陕西「电子商务（文）」），
 * 括号里是区分不同批次的信息；归一成「艺术」会让多条线撞唯一键。这类值保留原名。
 */
export function shouldKeepRawTrack(exam: ExamType, raw: string): boolean {
  return exam === 'upgrade' && /[（(]/.test(String(raw ?? '').trim())
}
