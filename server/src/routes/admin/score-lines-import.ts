import { Router } from 'express'
import type { BatchInput, ExamType, ReviewStatus } from '../../../../shared/src/score-line'
import {
  batchChecksum,
  isExamType,
  normalizeImportBatch,
  validateImportPayload
} from '../../../../shared/src/score-line'
import { noStore } from '../../auth'
import { db } from '../../db/connection'
import { getBatch, saveBatch, setBatchReview } from '../../score-lines/batch-store'
import { refreshCoverage, refreshCoverageForBatch } from '../../score-lines/coverage'
import { getProgram, setProgramReview, upsertProgram } from '../../score-lines/program-store'
import { getSchool } from '../../score-lines/store'
import { log } from '../../log'
import { clampString } from '../../util'

export const scoreLineImportRouter = Router()

interface ProgramImport {
  schoolId?: string
  year?: number | string
  exam?: string
  province?: string
  majorCode?: string
  majorName?: string
  degreeType?: string
  studyMode?: string
  planCount?: number | string | null
  tuition?: string
  examSubjects?: { code?: string; name?: string; fullScore?: number | null }[]
  note?: string
  sourceUrl?: string
}

function validatePrograms(input: unknown): { errors: string[]; programs: ProgramImport[] } {
  if (input === undefined) return { errors: [], programs: [] }
  if (!Array.isArray(input)) return { errors: ['programs 需为数组'], programs: [] }
  if (input.length > 200) return { errors: ['一次最多导入 200 条招生计划'], programs: [] }
  const errors: string[] = []
  const programs = input as ProgramImport[]
  programs.forEach((program, index) => {
    const prefix = `第 ${index + 1} 条招生计划：`
    if (!program || typeof program !== 'object') {
      errors.push(`${prefix}格式不对`)
      return
    }
    if (!clampString(program.schoolId, 100) || !getSchool(clampString(program.schoolId, 100))) {
      errors.push(`${prefix}院校不存在`)
    }
    if (!Number.isInteger(Number(program.year)) || Number(program.year) < 2000 || Number(program.year) > 2100) {
      errors.push(`${prefix}年份需在 2000–2100 之间`)
    }
    if (!isExamType(program.exam)) errors.push(`${prefix}考试类型需为 upgrade / postgrad`)
    if (!clampString(program.majorName, 120)) errors.push(`${prefix}请填写专业名称`)
    if (program.planCount !== undefined && program.planCount !== null && program.planCount !== '') {
      const count = Number(program.planCount)
      if (!Number.isInteger(count) || count < 0 || count > 100000) {
        errors.push(`${prefix}计划数需为非负整数`)
      }
    }
    if (clampString(program.tuition, 80).length > 80) errors.push(`${prefix}学费最多 80 个字`)
    if (clampString(program.sourceUrl, 500) && !/^https?:\/\//i.test(clampString(program.sourceUrl, 500))) {
      errors.push(`${prefix}来源链接需以 http:// 或 https:// 开头`)
    }
  })
  return { errors, programs }
}

scoreLineImportRouter.post('/score-lines/import', (req, res) => {
  noStore(res)
  const body = req.body ?? {}
  const hasBatches = Array.isArray(body.batches) && body.batches.length > 0
  const programCheck = validatePrograms(body.programs)
  const batchErrors =
    hasBatches || programCheck.programs.length === 0 ? validateImportPayload(body) : []
  const errors = [...batchErrors, ...programCheck.errors]
  if (errors.length || (!hasBatches && programCheck.programs.length === 0)) {
    res.status(400).json({
      error: errors[0] ?? '至少导入一条分数线或招生计划',
      errors
    })
    return
  }
  const batches = hasBatches
    ? (body.batches as BatchInput[]).map(normalizeImportBatch)
    : []
  const dryRun = body.dryRun === true
  if (dryRun) {
    res.json({
      ok: true,
      dryRun: true,
      batches: batches.length,
      metrics: batches.reduce((sum, batch) => sum + batch.metrics.length, 0),
      programs: programCheck.programs.length
    })
    return
  }

  const savedIds: string[] = []
  for (const batch of batches) {
    if (batch.schoolId && !getSchool(batch.schoolId)) {
      res.status(400).json({ error: `院校不存在：${batch.schoolId}` })
      return
    }
    if (batch.programId) {
      const program = getProgram(batch.programId)
      if (!program || program.schoolId !== batch.schoolId) {
        res.status(400).json({ error: `专业不存在或不属于该院校：${batch.programId}` })
        return
      }
    }
    const result = saveBatch(batch, {
      reviewStatus: 'approved',
      checksum: batchChecksum(batch),
      fetchedAt: new Date().toISOString()
    })
    savedIds.push(result.id)
    refreshCoverageForBatch(batch)
  }

  let programCount = 0
  for (const program of programCheck.programs) {
    const saved = upsertProgram({
      schoolId: clampString(program.schoolId, 100),
      year: Number(program.year),
      exam: program.exam as ExamType,
      province: clampString(program.province, 20),
      majorCode: clampString(program.majorCode, 40),
      majorName: clampString(program.majorName, 120),
      degreeType: clampString(program.degreeType, 20),
      studyMode: clampString(program.studyMode, 20),
      planCount:
        program.planCount === undefined || program.planCount === null || program.planCount === ''
          ? null
          : Number(program.planCount),
      tuition: clampString(program.tuition, 80),
      examSubjects: Array.isArray(program.examSubjects)
        ? program.examSubjects.slice(0, 50).map((subject) => ({
            code: clampString(subject.code, 40),
            name: clampString(subject.name, 40),
            fullScore:
              subject.fullScore === undefined || subject.fullScore === null
                ? null
                : Number(subject.fullScore)
          }))
        : [],
      note: clampString(program.note, 500),
      sourceUrl: clampString(program.sourceUrl, 500),
      reviewStatus: 'approved'
    })
    refreshCoverage(saved.schoolId, saved.exam, saved.year)
    programCount += 1
  }

  log.info('scoreline.imported', { batches: savedIds.length, programs: programCount })
  res.json({
    ok: true,
    dryRun: false,
    batches: savedIds.length,
    programs: programCount,
    ids: savedIds
  })
})

function reviewFilters(query: Record<string, unknown>, alias: string): {
  where: string
  params: (string | number)[]
} {
  const conditions = [`${alias}.review_status = 'pending'`]
  const params: (string | number)[] = []
  const province = clampString(query.province, 20)
  const schoolId = clampString(query.schoolId, 100)
  const year = Number(clampString(query.year, 10))
  if (province) {
    conditions.push(`${alias}.province = ?`)
    params.push(province)
  }
  if (schoolId) {
    conditions.push(`${alias}.school_id = ?`)
    params.push(schoolId)
  }
  if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
    conditions.push(`${alias}.year = ?`)
    params.push(year)
  }
  return { where: conditions.join(' AND '), params }
}

scoreLineImportRouter.get('/score-lines/review/count', (req, res) => {
  noStore(res)
  const batchFilter = reviewFilters(req.query, 'b')
  const programFilter = reviewFilters(req.query, 'p')
  const batches = dbCount('scoreline_batches b', batchFilter.where, batchFilter.params)
  const programs = dbCount('school_programs p', programFilter.where, programFilter.params)
  res.json({ batches, programs, total: batches + programs })
})

function dbCount(table: string, where: string, params: (string | number)[]): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${where}`).get(...params) as {
    count: number
  }
  return Number(row.count)
}

scoreLineImportRouter.get('/score-lines/review', (req, res) => {
  noStore(res)
  const kind = clampString(req.query.kind, 10) === 'program' ? 'program' : 'batch'
  const page = Math.max(1, Number(clampString(req.query.page, 6)) || 1)
  const pageSize = 50
  if (kind === 'program') {
    const filter = reviewFilters(req.query, 'p')
    const total = dbCount('school_programs p', filter.where, filter.params)
    const rows = db
      .prepare(
        `SELECT p.id, p.province, p.year, p.major_name, p.plan_count, p.tuition, p.updated_at,
                COALESCE(s.name, '') AS school_name
         FROM school_programs p LEFT JOIN schools s ON s.id = p.school_id
         WHERE ${filter.where}
         ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`
      )
      .all(...filter.params, pageSize, (page - 1) * pageSize) as unknown as {
      id: string
      province: string
      year: number
      major_name: string
      plan_count: number | null
      tuition: string
      updated_at: string
      school_name: string
    }[]
    res.json({
      total,
      page,
      pageSize,
      items: rows.map((row) => ({
        kind: 'program',
        id: row.id,
        province: row.province,
        schoolName: row.school_name,
        year: Number(row.year),
        majorName: row.major_name,
        planCount: row.plan_count === null ? null : Number(row.plan_count),
        tuition: row.tuition,
        createdAt: row.updated_at
      }))
    })
    return
  }
  const filter = reviewFilters(req.query, 'b')
  const total = dbCount('scoreline_batches b', filter.where, filter.params)
  const rows = db
    .prepare(
      `SELECT b.id, b.province, b.year, b.title, b.confidence, b.created_at,
              COALESCE(s.name, '') AS school_name
       FROM scoreline_batches b LEFT JOIN schools s ON s.id = b.school_id
       WHERE ${filter.where}
       ORDER BY b.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...filter.params, pageSize, (page - 1) * pageSize) as unknown as {
    id: string
    province: string
    year: number
    title: string
    confidence: number
    created_at: string
    school_name: string
  }[]
  res.json({
    total,
    page,
    pageSize,
    items: rows.map((row) => ({
      kind: 'batch',
      id: row.id,
      province: row.province,
      schoolName: row.school_name,
      year: Number(row.year),
      title: row.title,
      confidence: Number(row.confidence),
      createdAt: row.created_at
    }))
  })
})

scoreLineImportRouter.post('/score-lines/review', (req, res) => {
  noStore(res)
  const body = req.body ?? {}
  const kind = body.kind === 'program' ? 'program' : 'batch'
  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : ''
  if (!action) {
    res.status(400).json({ error: '请选择通过或拒绝' })
    return
  }
  const rawIds: unknown[] = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : []
  const ids = rawIds
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 100)
  if (ids.length === 0) {
    res.status(400).json({ error: '请选择要复核的数据' })
    return
  }
  const status: ReviewStatus = action === 'approve' ? 'approved' : 'rejected'
  let updated = 0
  for (const id of ids) {
    if (kind === 'batch') {
      const batch = getBatch(id)
      if (!batch || batch.reviewStatus !== 'pending') continue
      if (!setBatchReview(id, status)) continue
      updated += 1
      if (status === 'approved') {
        refreshCoverageForBatch({
          schoolId: batch.schoolId,
          exam: batch.exam,
          year: batch.year,
          scope: batch.scope,
          province: batch.province
        })
      }
    } else {
      const program = getProgram(id)
      if (!program || program.reviewStatus !== 'pending') continue
      if (!setProgramReview(id, status)) continue
      updated += 1
      if (status === 'approved') refreshCoverage(program.schoolId, program.exam, program.year)
    }
  }
  log.info('scoreline.reviewed', { kind, action, updated })
  res.json({ ok: true, updated })
})
