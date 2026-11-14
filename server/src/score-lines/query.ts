import type {
  ExamType,
  MinimumPoint,
  QueryLine,
  QuerySelection,
  QuerySeries,
  QuerySource,
  ScoreLineBatch,
  ScoreLineMetric,
  ScoreLineQueryResult,
  ScoreLineYear
} from '../../../shared/src/score-line'
import {
  SCOPE_LABELS,
  SCORELINE_HISTORY_YEARS,
  MINIMUM_TYPE_LABELS,
  subjectNameOf
} from '../../../shared/src/score-line'
import { normalizeProvince, provinceRegion } from '../../../shared/src/score-line-region'
import { db } from '../db/connection'
import { getBatch, pendingBatchCount } from './batch-store'
import { coverageFor } from './coverage'
import { getProgram, getSchool } from './store'

interface BatchFilter {
  scope: 'national' | 'provincial' | 'school' | 'program'
  exam: ExamType
  yearFrom: number
  yearTo: number
  province: string
  region: string
  schoolId: string
  programId: string
  category: string
  track: string
}

function loadBatches(filter: BatchFilter): ScoreLineBatch[] {
  const conditions = ["b.review_status = 'approved'", 'b.scope = ?', 'b.exam = ?', 'b.year BETWEEN ? AND ?']
  const params: (string | number)[] = [filter.scope, filter.exam, filter.yearFrom, filter.yearTo]
  if (filter.province) {
    conditions.push('b.province = ?')
    params.push(filter.province)
  }
  if (filter.region) {
    conditions.push('b.region = ?')
    params.push(filter.region)
  }
  if (filter.schoolId) {
    conditions.push('b.school_id = ?')
    params.push(filter.schoolId)
  }
  if (filter.programId) {
    conditions.push('b.program_id = ?')
    params.push(filter.programId)
  }
  if (filter.category) {
    conditions.push('b.category = ?')
    params.push(filter.category)
  }
  if (filter.track) {
    conditions.push('b.track = ?')
    params.push(filter.track)
  }
  const rows = db
    .prepare(
      `SELECT b.id FROM scoreline_batches b
       WHERE ${conditions.join(' AND ')}
       ORDER BY b.year ASC, b.updated_at DESC`
    )
    .all(...params) as unknown as { id: string }[]
  return rows.map((row) => getBatch(row.id)).filter((batch): batch is ScoreLineBatch => Boolean(batch))
}

function ambiguity(batches: ScoreLineBatch[], selection: QuerySelection): string[] {
  const requires: string[] = []
  // 空串也参与比较：国家线 category='' 与导入的「学硕」并存时要提示补选。
  const categories = new Set(batches.map((batch) => batch.category))
  const tracks = new Set(batches.map((batch) => batch.track))
  if (!selection.category && categories.size > 1) requires.push('category')
  if (!selection.track && tracks.size > 1) requires.push('track')
  return requires
}

function buildLine(scope: QueryLine['scope'], batches: ScoreLineBatch[]): QueryLine | null {
  if (batches.length === 0) return null
  const byYear = new Map<number, ScoreLineMetric[]>()
  for (const batch of batches) {
    const metrics = (batch.metrics ?? []).filter((metric) => metric.isMinimum === 0)
    if (metrics.length === 0) continue
    const list = byYear.get(batch.year) ?? []
    list.push(...metrics)
    byYear.set(batch.year, list)
  }
  const years: ScoreLineYear[] = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, metrics]) => ({ year, metrics }))
  if (years.length === 0) return null
  const latest = batches[batches.length - 1]
  return {
    scope,
    region: latest.region,
    title: latest.title || `${latest.year} ${SCOPE_LABELS[scope]}`,
    years
  }
}

function buildSeries(
  entries: { lineType: 'main' | 'school' | 'program'; line: QueryLine | null }[]
): QuerySeries[] {
  const map = new Map<string, QuerySeries>()
  for (const entry of entries) {
    if (!entry.line) continue
    for (const year of entry.line.years) {
      for (const metric of year.metrics) {
        const key = `${entry.lineType}:${metric.subjectCode}`
        let series = map.get(key)
        if (!series) {
          series = {
            key,
            lineType: entry.lineType,
            subjectCode: metric.subjectCode,
            name: `${SCOPE_LABELS[entry.line.scope]} · ${metric.subjectName || subjectNameOf(metric.subjectCode)}`,
            points: []
          }
          map.set(key, series)
        }
        series.points.push({
          year: year.year,
          value: metric.value,
          fullScore: metric.fullScore ?? null
        })
      }
    }
  }
  for (const series of map.values()) {
    series.points.sort((a, b) => a.year - b.year)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

function buildMinimums(batches: ScoreLineBatch[]): MinimumPoint[] {
  const points: MinimumPoint[] = []
  for (const batch of batches) {
    for (const metric of batch.metrics ?? []) {
      if (metric.isMinimum !== 1 || !metric.minimumType) continue
      points.push({
        subjectCode: metric.subjectCode,
        name: metric.subjectName || subjectNameOf(metric.subjectCode),
        year: batch.year,
        value: metric.value,
        fullScore: metric.fullScore ?? null,
        minimumType: metric.minimumType,
        label: MINIMUM_TYPE_LABELS[metric.minimumType] ?? '最低分',
        schoolId: batch.schoolId,
        programId: batch.programId
      })
    }
  }
  return points.sort(
    (a, b) => b.year - a.year || a.subjectCode.localeCompare(b.subjectCode) || a.minimumType.localeCompare(b.minimumType)
  )
}

function buildSources(batches: ScoreLineBatch[]): QuerySource[] {
  const map = new Map<string, QuerySource>()
  for (const batch of batches) {
    if (!batch.sourceName && !batch.sourceUrl) continue
    const key = batch.sourceUrl || batch.sourceName
    if (!map.has(key)) {
      map.set(key, {
        name: batch.sourceName,
        url: batch.sourceUrl,
        fetchedAt: batch.fetchedAt
      })
    }
  }
  return [...map.values()].slice(0, 20)
}

export interface QueryInput {
  exam: ExamType
  year: number
  province?: string
  region?: string
  schoolId?: string
  programId?: string
  category?: string
  track?: string
}

/** 主线永远查；校线 / 专业线只在选了院校 / 专业时查。只读 approved。 */
export function queryScoreLines(input: QueryInput): ScoreLineQueryResult {
  const province = normalizeProvince(input.province ?? '')
  const school = input.schoolId ? getSchool(input.schoolId) : null
  const program = input.programId ? getProgram(input.programId) : null
  const schoolProvince = school?.province ?? province
  const region =
    input.exam === 'postgrad'
      ? normalizeRegion(input.region) || provinceRegion(schoolProvince)
      : ''
  const selection: QuerySelection = {
    exam: input.exam,
    year: input.year,
    province: schoolProvince,
    region,
    schoolId: school?.id ?? '',
    programId: program?.id ?? '',
    category: (input.category ?? '').trim(),
    track: (input.track ?? '').trim()
  }
  const yearFrom = Math.max(2000, input.year - SCORELINE_HISTORY_YEARS + 1)
  const yearTo = input.year
  const requires: string[] = []

  if (!schoolProvince && !region) requires.push('province')

  const mainScope = input.exam === 'postgrad' ? 'national' : 'provincial'
  const mainBatches = requires.length
    ? []
    : loadBatches({
        scope: mainScope,
        exam: input.exam,
        yearFrom,
        yearTo,
        province: input.exam === 'postgrad' ? '' : schoolProvince,
        region: input.exam === 'postgrad' ? region : '',
        schoolId: '',
        programId: '',
        category: selection.category,
        track: selection.track
      })
  const mainRequires = ambiguity(mainBatches, selection)
  requires.push(...mainRequires)

  const schoolBatches =
    school && requires.length === 0
      ? loadBatches({
          scope: 'school',
          exam: input.exam,
          yearFrom,
          yearTo,
          province: '',
          region: '',
          schoolId: school.id,
          programId: '',
          category: selection.category,
          track: selection.track
        })
      : []
  const programBatches =
    program && school && requires.length === 0
      ? loadBatches({
          scope: 'program',
          exam: input.exam,
          yearFrom,
          yearTo,
          province: '',
          region: '',
          schoolId: school.id,
          programId: program.id,
          category: selection.category,
          track: selection.track
        })
      : []
  if (requires.length === 0) {
    requires.push(...ambiguity([...schoolBatches, ...programBatches], selection))
  }

  const allBatches = [...mainBatches, ...schoolBatches, ...programBatches]
  const mainPending = mainPendingCount(input.exam, input.year, schoolProvince, region)
  const pendingCount = school
    ? pendingBatchCount({
        schoolId: school.id,
        year: input.year,
        exam: input.exam
      }) +
      pendingProgramCount(school.id, input.exam, input.year) +
      mainPending
    : mainPending

  const hasMain = mainBatches.length > 0
  const coverage = school
    ? coverageFor(school.id, input.exam, input.year, pendingCount)
    : {
        status: hasMain ? ('covered' as const) : pendingCount > 0 ? ('pending' as const) : ('no_data' as const),
        missing: ['school_line', 'program_line'],
        lastUpdatedAt: '',
        pendingCount
      }

  const lines =
    requires.length === 0
      ? {
          main: buildLine(mainScope, mainBatches),
          schoolLine: buildLine('school', schoolBatches),
          programLine: buildLine('program', programBatches)
        }
      : { main: null, schoolLine: null, programLine: null }

  return {
    selection,
    school,
    program,
    coverage,
    main: lines.main,
    schoolLine: lines.schoolLine,
    programLine: lines.programLine,
    minimums: requires.length === 0 ? buildMinimums(allBatches) : [],
    series:
      requires.length === 0
        ? buildSeries([
            { lineType: 'main', line: lines.main },
            { lineType: 'school', line: lines.schoolLine },
            { lineType: 'program', line: lines.programLine }
          ])
        : [],
    sources: buildSources(allBatches),
    requires: [...new Set(requires)]
  }
}

function normalizeRegion(value: string | undefined): string {
  const raw = String(value ?? '').trim().replace(/\s+/g, '')
  if (!raw) return ''
  if (/^a区$/i.test(raw) || raw === 'A') return 'A区'
  if (/^b区$/i.test(raw) || raw === 'B') return 'B区'
  return ''
}

/** 主线 pending：专升本看省控线，考研看国家线 A/B 区（国家线 province 为空）。 */
function mainPendingCount(
  exam: ExamType,
  year: number,
  province: string,
  region: string
): number {
  if (exam === 'upgrade') {
    return pendingBatchCount({ exam, year, scope: 'provincial', province })
  }
  return pendingBatchCount({ exam, year, scope: 'national', region })
}

function pendingProgramCount(schoolId: string, exam: ExamType, year: number): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count FROM school_programs
       WHERE review_status = 'pending' AND school_id = ? AND exam = ? AND year = ?`
    )
    .get(schoolId, exam, year) as { count: number }
  return Number(row.count)
}
