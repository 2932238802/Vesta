import type { ExamType, ReviewStatus, SchoolProgram } from '../../../shared/src/score-line'
import { normalizeProvince } from '../../../shared/src/score-line-region'
import { db } from '../db/connection'
import { newId, now } from '../db/core'

interface ProgramRow {
  id: string
  school_id: string
  year: number
  exam: string
  province: string
  major_code: string
  major_name: string
  degree_type: string
  study_mode: string
  plan_count: number | null
  tuition: string
  exam_subjects: string
  note: string
  source_url: string
  review_status: string
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

function likeValue(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

export function programFromRow(row: ProgramRow): SchoolProgram {
  return {
    id: row.id,
    schoolId: row.school_id,
    year: Number(row.year),
    exam: row.exam as ExamType,
    province: row.province,
    majorCode: row.major_code,
    majorName: row.major_name,
    degreeType: row.degree_type,
    studyMode: row.study_mode,
    planCount: row.plan_count === null ? null : Number(row.plan_count),
    tuition: row.tuition,
    examSubjects: jsonArray(row.exam_subjects),
    note: row.note,
    sourceUrl: row.source_url,
    reviewStatus: row.review_status as ReviewStatus,
    updatedAt: row.updated_at
  }
}

export interface ProgramQuery {
  schoolId: string
  year: number
  exam: ExamType
  q?: string
  limit?: number
}

export function listPrograms(query: ProgramQuery): SchoolProgram[] {
  const needle = likeValue((query.q ?? '').trim())
  const rows = db
    .prepare(
      `SELECT * FROM school_programs
       WHERE school_id = ? AND year = ? AND exam = ? AND review_status = 'approved'
         AND (? = '' OR major_name LIKE ? ESCAPE '\\' OR major_code LIKE ? ESCAPE '\\')
       ORDER BY major_name
       LIMIT ?`
    )
    .all(
      query.schoolId,
      query.year,
      query.exam,
      query.q?.trim() ?? '',
      needle,
      needle,
      Math.min(Math.max(query.limit ?? 50, 1), 100)
    ) as unknown as ProgramRow[]
  return rows.map(programFromRow)
}

export function getProgram(id: string): SchoolProgram | null {
  const row = db.prepare('SELECT * FROM school_programs WHERE id = ?').get(id) as
    | ProgramRow
    | undefined
  return row ? programFromRow(row) : null
}

export interface ProgramInput {
  schoolId: string
  year: number
  exam: ExamType
  province?: string
  majorCode?: string
  majorName: string
  degreeType?: string
  studyMode?: string
  planCount?: number | null
  tuition?: string
  examSubjects?: { code: string; name: string; fullScore?: number | null }[]
  note?: string
  sourceUrl?: string
  reviewStatus?: ReviewStatus
}

export function upsertProgram(input: ProgramInput): SchoolProgram {
  const province = normalizeProvince(input.province ?? '')
  const existing = db
    .prepare(
      `SELECT * FROM school_programs
       WHERE school_id = ? AND year = ? AND exam = ? AND province = ? AND major_code = ?
         AND degree_type = ? AND study_mode = ?`
    )
    .get(
      input.schoolId,
      input.year,
      input.exam,
      province,
      input.majorCode ?? '',
      input.degreeType ?? '',
      input.studyMode ?? ''
    ) as ProgramRow | undefined
  const at = now()
  if (existing) {
    db.prepare(
      `UPDATE school_programs SET major_name = ?, plan_count = ?, tuition = ?, exam_subjects = ?,
         note = ?, source_url = ?, review_status = ?, updated_at = ? WHERE id = ?`
    ).run(
      input.majorName,
      input.planCount ?? null,
      input.tuition ?? '',
      JSON.stringify(input.examSubjects ?? []),
      input.note ?? '',
      input.sourceUrl ?? '',
      input.reviewStatus ?? 'approved',
      at,
      existing.id
    )
    const row = db.prepare('SELECT * FROM school_programs WHERE id = ?').get(existing.id) as unknown as ProgramRow
    return programFromRow(row)
  }
  const id = newId('prg')
  db.prepare(
    `INSERT INTO school_programs
     (id, school_id, year, exam, province, major_code, major_name, degree_type, study_mode,
      plan_count, tuition, exam_subjects, note, source_url, review_status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.schoolId,
    input.year,
    input.exam,
    province,
    input.majorCode ?? '',
    input.majorName,
    input.degreeType ?? '',
    input.studyMode ?? '',
    input.planCount ?? null,
    input.tuition ?? '',
    JSON.stringify(input.examSubjects ?? []),
    input.note ?? '',
    input.sourceUrl ?? '',
    input.reviewStatus ?? 'approved',
    at
  )
  const row = db.prepare('SELECT * FROM school_programs WHERE id = ?').get(id) as unknown as ProgramRow
  return programFromRow(row)
}

export function setProgramReview(id: string, status: ReviewStatus): boolean {
  const result = db
    .prepare('UPDATE school_programs SET review_status = ?, updated_at = ? WHERE id = ?')
    .run(status, now(), id)
  return Number(result.changes) > 0
}
