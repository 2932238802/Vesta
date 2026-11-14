import type {
  NormalizedBatch,
  ReviewStatus,
  ScoreLineBatch,
  ScoreLineMetric
} from '../../../shared/src/score-line'
import { db } from '../db/connection'
import { newId, now } from '../db/core'

interface BatchRow {
  id: string
  scope: string
  exam: string
  year: number
  province: string
  region: string
  school_id: string
  program_id: string
  category: string
  track: string
  title: string
  source_name: string
  source_url: string
  published_at: string
  fetched_at: string
  checksum: string
  confidence: number
  review_status: string
  note: string
  created_at: string
  updated_at: string
}

interface MetricRow {
  id: string
  batch_id: string
  subject_code: string
  subject_name: string
  full_score: number | null
  value: number
  is_minimum: number
  minimum_type: string
  sort_order: number
  note: string
}

export function metricFromRow(row: MetricRow): ScoreLineMetric {
  return {
    id: row.id,
    subjectCode: row.subject_code,
    subjectName: row.subject_name,
    fullScore: row.full_score === null ? null : Number(row.full_score),
    value: Number(row.value),
    isMinimum: row.is_minimum === 1 ? 1 : 0,
    minimumType: row.minimum_type as ScoreLineMetric['minimumType'],
    sortOrder: Number(row.sort_order),
    note: row.note
  }
}

export function batchFromRow(row: BatchRow, metrics: ScoreLineMetric[] = []): ScoreLineBatch {
  return {
    id: row.id,
    scope: row.scope as ScoreLineBatch['scope'],
    exam: row.exam as ScoreLineBatch['exam'],
    year: Number(row.year),
    province: row.province,
    region: row.region,
    schoolId: row.school_id,
    programId: row.program_id,
    category: row.category,
    track: row.track,
    title: row.title,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    checksum: row.checksum,
    confidence: Number(row.confidence),
    reviewStatus: row.review_status as ReviewStatus,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metrics
  }
}

export function listMetrics(batchId: string): ScoreLineMetric[] {
  const rows = db
    .prepare('SELECT * FROM scoreline_metrics WHERE batch_id = ? ORDER BY sort_order, subject_code')
    .all(batchId) as unknown as MetricRow[]
  return rows.map(metricFromRow)
}

export function getBatch(id: string): ScoreLineBatch | null {
  const row = db.prepare('SELECT * FROM scoreline_batches WHERE id = ?').get(id) as
    | BatchRow
    | undefined
  return row ? batchFromRow(row, listMetrics(id)) : null
}

export interface SaveBatchOptions {
  reviewStatus: ReviewStatus
  checksum: string
  fetchedAt: string
}

export function findBatchId(batch: NormalizedBatch): string | null {
  const row = db
    .prepare(
      `SELECT id FROM scoreline_batches
       WHERE scope = ? AND exam = ? AND year = ? AND province = ? AND region = ?
         AND school_id = ? AND program_id = ? AND category = ? AND track = ?`
    )
    .get(
      batch.scope,
      batch.exam,
      batch.year,
      batch.province,
      batch.region,
      batch.schoolId,
      batch.programId,
      batch.category,
      batch.track
    ) as { id: string } | undefined
  return row?.id ?? null
}

/** 同一唯一键覆盖写；事务内先删旧指标再插新指标。 */
export function saveBatch(
  batch: NormalizedBatch,
  options: SaveBatchOptions
): { id: string; created: boolean } {
  const at = now()
  const existing = db
    .prepare(
      `SELECT id FROM scoreline_batches
       WHERE scope = ? AND exam = ? AND year = ? AND province = ? AND region = ?
         AND school_id = ? AND program_id = ? AND category = ? AND track = ?`
    )
    .get(
      batch.scope,
      batch.exam,
      batch.year,
      batch.province,
      batch.region,
      batch.schoolId,
      batch.programId,
      batch.category,
      batch.track
    ) as { id: string } | undefined
  const id = existing?.id ?? newId('slb')
  db.exec('BEGIN')
  try {
    if (existing) {
      db.prepare(
        `UPDATE scoreline_batches SET title = ?, source_name = ?, source_url = ?, published_at = ?,
           fetched_at = ?, checksum = ?, confidence = ?, review_status = ?, note = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        batch.title,
        batch.sourceName,
        batch.sourceUrl,
        batch.publishedAt,
        options.fetchedAt,
        options.checksum,
        batch.confidence,
        options.reviewStatus,
        batch.note,
        at,
        id
      )
      db.prepare('DELETE FROM scoreline_metrics WHERE batch_id = ?').run(id)
    } else {
      db.prepare(
        `INSERT INTO scoreline_batches
         (id, scope, exam, year, province, region, school_id, program_id, category, track,
          title, source_name, source_url, published_at, fetched_at, checksum, confidence,
          review_status, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        batch.scope,
        batch.exam,
        batch.year,
        batch.province,
        batch.region,
        batch.schoolId,
        batch.programId,
        batch.category,
        batch.track,
        batch.title,
        batch.sourceName,
        batch.sourceUrl,
        batch.publishedAt,
        options.fetchedAt,
        options.checksum,
        batch.confidence,
        options.reviewStatus,
        batch.note,
        at,
        at
      )
    }
    const insertMetric = db.prepare(
      `INSERT INTO scoreline_metrics
       (id, batch_id, subject_code, subject_name, full_score, value, is_minimum, minimum_type, sort_order, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    batch.metrics.forEach((metric, index) => {
      insertMetric.run(
        newId('slm'),
        id,
        metric.subjectCode,
        metric.subjectName,
        metric.fullScore,
        metric.value,
        metric.isMinimum,
        metric.minimumType,
        index,
        metric.note
      )
    })
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return { id, created: !existing }
}

export function setBatchReview(id: string, status: ReviewStatus): boolean {
  const result = db
    .prepare('UPDATE scoreline_batches SET review_status = ?, updated_at = ? WHERE id = ?')
    .run(status, now(), id)
  return Number(result.changes) > 0
}

export function pendingBatchCount(where: {
  province?: string
  schoolId?: string
  year?: number
  exam?: string
  scope?: string
  region?: string
}): number {
  const conditions = ["review_status = 'pending'"]
  const params: (string | number)[] = []
  if (where.province !== undefined) {
    conditions.push('province = ?')
    params.push(where.province)
  }
  if (where.schoolId) {
    conditions.push('school_id = ?')
    params.push(where.schoolId)
  }
  if (where.year) {
    conditions.push('year = ?')
    params.push(where.year)
  }
  if (where.exam) {
    conditions.push('exam = ?')
    params.push(where.exam)
  }
  if (where.scope) {
    conditions.push('scope = ?')
    params.push(where.scope)
  }
  if (where.region) {
    conditions.push('region = ?')
    params.push(where.region)
  }
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM scoreline_batches WHERE ${conditions.join(' AND ')}`)
    .get(...params) as { count: number }
  return Number(row.count)
}
