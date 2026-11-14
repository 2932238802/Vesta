import type { ExamType, School, SchoolSearchItem } from '../../../shared/src/score-line'
import { normalizeProvince } from '../../../shared/src/score-line-region'
import { db } from '../db/connection'
import { newId, now } from '../db/core'

export { getBatch, listMetrics, pendingBatchCount, saveBatch, setBatchReview } from './batch-store'
export { getProgram, listPrograms, setProgramReview, upsertProgram } from './program-store'

interface SchoolRow {
  id: string
  code: string
  name: string
  province: string
  city: string
  level: string
  nature: string
  tags: string
  official_url: string
  graduate_url: string
  admissions_url: string
  status: string
  created_at: string
  updated_at: string
}

function jsonArray<T>(value: unknown): T[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]'))
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function schoolFromRow(row: SchoolRow): School {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    province: row.province,
    city: row.city,
    level: row.level,
    nature: row.nature,
    tags: jsonArray<string>(row.tags),
    officialUrl: row.official_url,
    graduateUrl: row.graduate_url,
    admissionsUrl: row.admissions_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function likeValue(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

export interface SchoolInput {
  code?: string
  name: string
  province: string
  city?: string
  level?: string
  nature?: string
  tags?: string[]
  officialUrl?: string
  graduateUrl?: string
  admissionsUrl?: string
}

/** 按 (name, province) upsert；不删除旧学校，停办/合并只改 status（由调用方设置）。 */
export function upsertSchool(input: SchoolInput): { school: School; created: boolean } {
  const province = normalizeProvince(input.province)
  const existing = db
    .prepare('SELECT * FROM schools WHERE name = ? AND province = ?')
    .get(input.name, province) as SchoolRow | undefined
  const at = now()
  if (existing) {
    db.prepare(
      `UPDATE schools SET code = ?, city = ?, level = ?, nature = ?, tags = ?,
         official_url = ?, graduate_url = ?, admissions_url = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      input.code ?? existing.code,
      input.city ?? existing.city,
      input.level ?? existing.level,
      input.nature ?? existing.nature,
      JSON.stringify(input.tags ?? jsonArray<string>(existing.tags)),
      input.officialUrl ?? existing.official_url,
      input.graduateUrl ?? existing.graduate_url,
      input.admissionsUrl ?? existing.admissions_url,
      at,
      existing.id
    )
    const row = db.prepare('SELECT * FROM schools WHERE id = ?').get(existing.id) as unknown as SchoolRow
    return { school: schoolFromRow(row), created: false }
  }
  const id = newId('sch')
  db.prepare(
    `INSERT INTO schools
     (id, code, name, province, city, level, nature, tags, official_url, graduate_url,
      admissions_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
  ).run(
    id,
    input.code ?? '',
    input.name,
    province,
    input.city ?? '',
    input.level ?? '',
    input.nature ?? '',
    JSON.stringify(input.tags ?? []),
    input.officialUrl ?? '',
    input.graduateUrl ?? '',
    input.admissionsUrl ?? '',
    at,
    at
  )
  const row = db.prepare('SELECT * FROM schools WHERE id = ?').get(id) as unknown as SchoolRow
  return { school: schoolFromRow(row), created: true }
}

export function addSchoolAlias(schoolId: string, alias: string): void {
  const clean = alias.trim()
  if (!clean) return
  db.prepare('INSERT OR IGNORE INTO school_aliases (id, school_id, alias) VALUES (?, ?, ?)').run(
    newId('alias'),
    schoolId,
    clean
  )
}

export interface SchoolQuery {
  q?: string
  province?: string
  level?: string
  exam?: ExamType
  year?: number
  limit?: number
}

/** 院校搜索：校名 / 别名 / 城市；不传 q 时返回该省列表。 */
export function listSchools(query: SchoolQuery): SchoolSearchItem[] {
  const q = (query.q ?? '').trim()
  const province = normalizeProvince(query.province ?? '')
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 50)
  const needle = likeValue(q)
  const rows = db
    .prepare(
      `SELECT s.* FROM schools s
       WHERE s.status != 'closed'
         AND (? = '' OR s.province = ?)
         AND (? = '' OR s.level = ?)
         AND (
           ? = '' OR s.name LIKE ? ESCAPE '\\' OR s.city LIKE ? ESCAPE '\\'
           OR EXISTS (SELECT 1 FROM school_aliases a WHERE a.school_id = s.id AND a.alias LIKE ? ESCAPE '\\')
         )
       ORDER BY s.name
       LIMIT ?`
    )
    .all(
      province,
      province,
      query.level ?? '',
      query.level ?? '',
      q,
      needle,
      needle,
      needle,
      limit
    ) as unknown as SchoolRow[]
  if (rows.length === 0) return []
  const ids = rows.map((row) => row.id)
  const placeholders = ids.map(() => '?').join(',')
  const planMap = new Map<string, number>()
  const coverageMap = new Map<
    string,
    { status: string; main: number; school: number; program: number }
  >()
  if (query.exam && query.year) {
    const plans = db
      .prepare(
        `SELECT school_id, SUM(COALESCE(plan_count, 0)) AS total FROM school_programs
         WHERE school_id IN (${placeholders}) AND year = ? AND exam = ? AND review_status = 'approved'
         GROUP BY school_id`
      )
      .all(...ids, query.year, query.exam) as unknown as { school_id: string; total: number }[]
    for (const item of plans) planMap.set(item.school_id, Number(item.total))
    const coverages = db
      .prepare(
        `SELECT school_id, status, main_line, school_line, program_line FROM school_coverage
         WHERE school_id IN (${placeholders}) AND year = ? AND exam = ?`
      )
      .all(...ids, query.year, query.exam) as unknown as {
      school_id: string
      status: string
      main_line: number
      school_line: number
      program_line: number
    }[]
    for (const item of coverages) {
      coverageMap.set(item.school_id, {
        status: item.status,
        main: Number(item.main_line),
        school: Number(item.school_line),
        program: Number(item.program_line)
      })
    }
  }
  return rows.map((row) => {
    const school = schoolFromRow(row)
    const coverage = coverageMap.get(row.id)
    return {
      ...school,
      planCount: planMap.get(row.id) ?? null,
      coverage: coverage
        ? {
            status: coverage.status as NonNullable<SchoolSearchItem['coverage']>['status'],
            missing: [
              ...(coverage.main ? [] : ['main_line']),
              ...(coverage.school ? [] : ['school_line']),
              ...(coverage.program ? [] : ['program_line'])
            ],
            lastUpdatedAt: '',
            pendingCount: 0
          }
        : null
    }
  })
}

export function getSchool(id: string): School | null {
  const row = db.prepare('SELECT * FROM schools WHERE id = ?').get(id) as SchoolRow | undefined
  return row ? schoolFromRow(row) : null
}
