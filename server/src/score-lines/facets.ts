/**
 * 分数线筛选栏的维度候选（facets）。
 *
 * 只统计 `approved` 的主线，年份窗与 `queryScoreLines()` 一致；选项必须来自
 * 查询用等值条件能命中的真实值，否则会造出「选了没线」的假选项。
 * 两个维度互相级联：传了 category 就按它收窄 track，反之亦然。
 */

import type { ExamType } from '../../../shared/src/score-line'
import { SCORELINE_HISTORY_YEARS } from '../../../shared/src/score-line'
import type {
  DimensionFacetOption,
  DimensionKind,
  ScoreLineFacets
} from '../../../shared/src/score-line-dimension'
import {
  DIMENSION_UNLABELED,
  dimensionLabel,
  dimensionSortIndex
} from '../../../shared/src/score-line-dimension'
import {
  normalizeProvince,
  normalizeRegion,
  provinceRegion
} from '../../../shared/src/score-line-region'
import { db } from '../db/connection'

export interface FacetsInput {
  exam: ExamType
  year: number
  province?: string
  region?: string
  category?: string
  track?: string
}

type Scope = 'national' | 'provincial'

function emptyFacets(scope: Scope, year: number, yearFrom: number, region: string): ScoreLineFacets {
  return { scope, year, yearFrom, region, category: [], track: [] }
}

/** 筛选值：空串 = 不筛选；哨兵 = 显式查空维度。 */
function filterValue(value: string | undefined): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  return raw === DIMENSION_UNLABELED ? '' : raw
}

function toOption(
  kind: DimensionKind,
  exam: ExamType,
  value: string,
  count: number
): DimensionFacetOption {
  const raw = String(value ?? '')
  if (!raw) {
    return { value: DIMENSION_UNLABELED, label: '未标注', count }
  }
  return { value: raw, label: dimensionLabel(kind, exam, raw), count }
}

function compareOptions(
  kind: DimensionKind,
  exam: ExamType,
  a: DimensionFacetOption,
  b: DimensionFacetOption
): number {
  if (a.value === DIMENSION_UNLABELED) return b.value === DIMENSION_UNLABELED ? 0 : 1
  if (b.value === DIMENSION_UNLABELED) return -1
  const byDictionary = dimensionSortIndex(kind, exam, a.value) - dimensionSortIndex(kind, exam, b.value)
  if (byDictionary !== 0) return byDictionary
  if (a.count !== b.count) return b.count - a.count
  return a.label.localeCompare(b.label, 'zh')
}

/**
 * 返回当前「考试 + 年份 + 省份」下可选的批次 / 科类。
 * 专升本按省、考研按 A/B 区；省份认不出时返回空候选（页面不渲染字段）。
 */
export function scoreLineFacets(input: FacetsInput): ScoreLineFacets {
  const scope: Scope = input.exam === 'postgrad' ? 'national' : 'provincial'
  const year = input.year
  const yearFrom = Math.max(2000, year - SCORELINE_HISTORY_YEARS + 1)
  const province = normalizeProvince(input.province ?? '')
  const region =
    input.exam === 'postgrad'
      ? normalizeRegion(input.region) || provinceRegion(province)
      : ''

  if (input.exam === 'upgrade' && !province) return emptyFacets(scope, year, yearFrom, '')
  if (input.exam === 'postgrad' && !region) return emptyFacets(scope, year, yearFrom, '')

  const conditions = [
    "b.review_status = 'approved'",
    'b.scope = ?',
    'b.exam = ?',
    'b.year BETWEEN ? AND ?'
  ]
  const baseParams: (string | number)[] = [scope, input.exam, yearFrom, year]
  if (input.exam === 'upgrade') {
    conditions.push('b.province = ?')
    baseParams.push(province)
  } else {
    conditions.push('b.region = ?')
    baseParams.push(region)
  }

  function group(kind: DimensionKind): DimensionFacetOption[] {
    const clauses = [...conditions]
    const params = [...baseParams]
    const other = kind === 'category' ? filterValue(input.track) : filterValue(input.category)
    if (other !== null) {
      clauses.push(`b.${kind === 'category' ? 'track' : 'category'} = ?`)
      params.push(other)
    }
    const rows = db
      .prepare(
        `SELECT b.${kind} AS value, COUNT(*) AS count
         FROM scoreline_batches b
         WHERE ${clauses.join(' AND ')}
         GROUP BY b.${kind}`
      )
      .all(...params) as unknown as { value: string; count: number }[]
    return rows
      .map((row) => toOption(kind, input.exam, row.value, Number(row.count)))
      .sort((a, b) => compareOptions(kind, input.exam, a, b))
  }

  return {
    scope,
    year,
    yearFrom,
    region,
    category: group('category'),
    track: group('track')
  }
}
