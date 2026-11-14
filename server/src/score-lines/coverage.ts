import type {
  CoverageItem,
  CoverageStatus,
  ExamType,
  QuerySelection
} from '../../../shared/src/score-line'
import { provinceRegion } from '../../../shared/src/score-line-region'
import { db } from '../db/connection'
import { now } from '../db/core'

function scalar(sql: string, ...params: (string | number)[]): number {
  const row = db.prepare(sql).get(...params) as { count: number } | undefined
  return Number(row?.count ?? 0)
}

function lastRun(province: string): { id: string; error: string } {
  const row = db
    .prepare(
      `SELECT id, message FROM crawl_runs
       WHERE province = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(province) as { id: string; message: string } | undefined
  return { id: row?.id ?? '', error: row?.message ?? '' }
}

/** 按 approved 数据重算某校某年某考试的覆盖状态；pending 单独计数。 */
export function refreshCoverage(schoolId: string, exam: ExamType, year: number): void {
  const school = db.prepare('SELECT province FROM schools WHERE id = ?').get(schoolId) as
    | { province: string }
    | undefined
  if (!school) return
  const region = exam === 'postgrad' ? provinceRegion(school.province) : ''
  const mainLine =
    exam === 'postgrad'
      ? scalar(
          `SELECT COUNT(*) AS count FROM scoreline_batches
           WHERE review_status = 'approved' AND scope = 'national' AND exam = 'postgrad' AND year = ?
             AND (? = '' OR region = ?)`,
          year,
          region,
          region
        )
      : scalar(
          `SELECT COUNT(*) AS count FROM scoreline_batches
           WHERE review_status = 'approved' AND scope = 'provincial' AND exam = 'upgrade'
             AND year = ? AND province = ?`,
          year,
          school.province
        )
  const schoolLine = scalar(
    `SELECT COUNT(*) AS count FROM scoreline_batches
     WHERE review_status = 'approved' AND scope = 'school' AND exam = ? AND year = ? AND school_id = ?`,
    exam,
    year,
    schoolId
  )
  const programLine = scalar(
    `SELECT COUNT(*) AS count FROM scoreline_batches
     WHERE review_status = 'approved' AND scope = 'program' AND exam = ? AND year = ? AND school_id = ?`,
    exam,
    year,
    schoolId
  )
  const plans = scalar(
    `SELECT COUNT(*) AS count FROM school_programs
     WHERE review_status = 'approved' AND exam = ? AND year = ? AND school_id = ? AND plan_count IS NOT NULL`,
    exam,
    year,
    schoolId
  )
  const pending = scalar(
    `SELECT COUNT(*) AS count FROM scoreline_batches
     WHERE review_status = 'pending' AND exam = ? AND year = ?
       AND (school_id = ? OR (school_id = '' AND province = ?))`,
    exam,
    year,
    schoolId,
    school.province
  )
  let status: CoverageStatus
  if (schoolLine > 0 || programLine > 0 || mainLine > 0 || plans > 0) {
    status = mainLine > 0 && (schoolLine > 0 || programLine > 0) && plans > 0 ? 'covered' : 'partial'
  } else if (pending > 0) {
    status = 'pending'
  } else {
    status = 'no_data'
  }
  const run = lastRun(school.province)
  const at = now()
  db.prepare(
    `INSERT INTO school_coverage
     (school_id, exam, year, status, main_line, school_line, program_line, plan_count,
      last_run_id, last_error, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(school_id, exam, year) DO UPDATE SET
       status = excluded.status, main_line = excluded.main_line, school_line = excluded.school_line,
       program_line = excluded.program_line, plan_count = excluded.plan_count,
       last_run_id = excluded.last_run_id, last_error = excluded.last_error, updated_at = excluded.updated_at`
  ).run(
    schoolId,
    exam,
    year,
    status,
    mainLine > 0 ? 1 : 0,
    schoolLine > 0 ? 1 : 0,
    programLine > 0 ? 1 : 0,
    plans > 0 ? 1 : 0,
    run.id,
    run.error,
    at
  )
}

/** 刷新某省所有学校的覆盖状态；导入主线后调用。 */
export function refreshProvinceCoverage(exam: ExamType, year: number, province: string): void {
  const rows = db
    .prepare("SELECT id FROM schools WHERE province = ? AND status != 'closed'")
    .all(province) as unknown as { id: string }[]
  for (const row of rows) refreshCoverage(row.id, exam, year)
}

/** 全国主线（考研国家线）变化后刷新所有学校；只在复核/导入单条时调用，量级有限。 */
export function refreshNationalCoverage(exam: ExamType, year: number): void {
  const rows = db
    .prepare("SELECT id FROM schools WHERE status != 'closed'")
    .all() as unknown as { id: string }[]
  for (const row of rows) refreshCoverage(row.id, exam, year)
}

export function refreshCoverageForBatch(batch: {
  schoolId: string
  exam: ExamType
  year: number
  scope: string
  province: string
}): void {
  if (batch.schoolId) {
    refreshCoverage(batch.schoolId, batch.exam, batch.year)
  } else if (batch.scope === 'provincial') {
    refreshProvinceCoverage(batch.exam, batch.year, batch.province)
  } else if (batch.scope === 'national') {
    refreshNationalCoverage(batch.exam, batch.year)
  }
}

export function coverageMissing(flags: {
  mainLine: number
  schoolLine: number
  programLine: number
}): string[] {
  return [
    ...(flags.mainLine ? [] : ['main_line']),
    ...(flags.schoolLine ? [] : ['school_line']),
    ...(flags.programLine ? [] : ['program_line'])
  ]
}

export interface CoverageQuery {
  exam: ExamType
  year: number
  province?: string
  status?: string
  page?: number
}

export function listCoverage(query: CoverageQuery): {
  summary: Record<CoverageStatus, number>
  items: CoverageItem[]
  total: number
  page: number
  pageSize: number
} {
  const pageSize = 50
  const page = Math.max(1, Math.floor(query.page ?? 1))
  const conditions = ["s.status != 'closed'"]
  const params: (string | number)[] = []
  if (query.province) {
    conditions.push('s.province = ?')
    params.push(query.province)
  }
  if (query.status) {
    if (query.status === 'no_data') {
      conditions.push("COALESCE(c.status, 'no_data') = 'no_data'")
    } else {
      conditions.push('c.status = ?')
      params.push(query.status)
    }
  }
  const where = conditions.join(' AND ')
  const total = scalar(
    `SELECT COUNT(*) AS count FROM schools s
     LEFT JOIN school_coverage c ON c.school_id = s.id AND c.exam = ? AND c.year = ?
     WHERE ${where}`,
    query.exam,
    query.year,
    ...params
  )
  const rows = db
    .prepare(
      `SELECT s.id AS school_id, s.name, s.province,
              COALESCE(c.year, 0) AS year, COALESCE(c.status, 'no_data') AS status,
              COALESCE(c.main_line, 0) AS main_line, COALESCE(c.school_line, 0) AS school_line,
              COALESCE(c.program_line, 0) AS program_line,
              COALESCE(c.last_run_id, '') AS last_run_id, COALESCE(c.last_error, '') AS last_error,
              COALESCE(c.updated_at, '') AS updated_at
       FROM schools s
       LEFT JOIN school_coverage c ON c.school_id = s.id AND c.exam = ? AND c.year = ?
       WHERE ${where}
       ORDER BY s.province, s.name
       LIMIT ? OFFSET ?`
    )
    .all(
      query.exam,
      query.year,
      ...params,
      pageSize,
      (page - 1) * pageSize
    ) as unknown as {
    school_id: string
    name: string
    province: string
    year: number
    status: string
    main_line: number
    school_line: number
    program_line: number
    last_run_id: string
    last_error: string
    updated_at: string
  }[]

  const summary: Record<CoverageStatus, number> = {
    covered: 0,
    partial: 0,
    pending: 0,
    no_data: 0,
    not_offered: 0,
    failed: 0
  }
  const summaryRows = db
    .prepare(
      `SELECT COALESCE(c.status, 'no_data') AS status, COUNT(*) AS count
       FROM schools s
       LEFT JOIN school_coverage c ON c.school_id = s.id AND c.exam = ? AND c.year = ?
       WHERE ${query.province ? 's.province = ?' : '1 = 1'}
       GROUP BY COALESCE(c.status, 'no_data')`
    )
    .all(
      ...(query.province
        ? [query.exam, query.year, query.province]
        : [query.exam, query.year])
    ) as unknown as {
    status: CoverageStatus
    count: number
  }[]
  for (const row of summaryRows) summary[row.status] = Number(row.count)

  return {
    summary,
    total,
    page,
    pageSize,
    items: rows.map((row) => ({
      schoolId: row.school_id,
      name: row.name,
      province: row.province,
      year: Number(row.year),
      status: row.status as CoverageStatus,
      missing: coverageMissing({
        mainLine: Number(row.main_line),
        schoolLine: Number(row.school_line),
        programLine: Number(row.program_line)
      }),
      lastRunId: row.last_run_id,
      lastError: row.last_error,
      updatedAt: row.updated_at
    }))
  }
}

export function coverageFor(
  schoolId: string,
  exam: ExamType,
  year: number,
  pendingCount: number
): { status: CoverageStatus | ''; missing: string[]; lastUpdatedAt: string; pendingCount: number } {
  const row = db
    .prepare(
      'SELECT status, main_line, school_line, program_line, updated_at FROM school_coverage WHERE school_id = ? AND exam = ? AND year = ?'
    )
    .get(schoolId, exam, year) as
    | {
        status: string
        main_line: number
        school_line: number
        program_line: number
        updated_at: string
      }
    | undefined
  if (!row) {
    return {
      status: pendingCount > 0 ? 'pending' : '',
      missing: ['main_line', 'school_line', 'program_line'],
      lastUpdatedAt: '',
      pendingCount
    }
  }
  return {
    status: row.status as CoverageStatus,
    missing: coverageMissing({
      mainLine: Number(row.main_line),
      schoolLine: Number(row.school_line),
      programLine: Number(row.program_line)
    }),
    lastUpdatedAt: row.updated_at,
    pendingCount
  }
}

export function selectionLabel(selection: QuerySelection): string {
  return [selection.exam, selection.year, selection.province].filter(Boolean).join(' · ')
}
