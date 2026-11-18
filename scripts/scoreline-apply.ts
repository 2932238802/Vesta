/**
 * 分数线导出文件的应用逻辑。CLI 入口见 `scripts/scoreline-data.ts`。
 *
 * 只写 `school_programs` / `scoreline_batches` / `scoreline_metrics` 与覆盖统计；
 * 唯一键与 `saveBatch()` 一致，维度先归一化，冲突默认服务器优先。
 */

import fs from 'node:fs'
import path from 'node:path'
import type { BatchInput, ExamType, NormalizedBatch, ScoreLineBatch } from '../shared/src/score-line'
import { batchChecksum, isExamType, isScoreLineScope, normalizeImportBatch, validateImportPayload } from '../shared/src/score-line'
import { normalizeProvince } from '../shared/src/score-line-region'
import { db } from '../server/src/db/connection'
import { findBatchId, getBatch, saveBatch, setBatchReview } from '../server/src/score-lines/batch-store'
import { normalizeBatchDimensions } from '../server/src/score-lines/normalize'
import { getProgram, upsertProgram } from '../server/src/score-lines/program-store'

export type Json = Record<string, unknown>
export interface ExportPayload { batches?: Json[]; programs?: Json[]; programLines?: Json[]; meta?: Json }
interface SchoolRow { id: string; name: string; province: string }
interface Conflict {
  key: string
  title: string
  existingStatus: string
  existingChecksum: string
  incomingChecksum: string
}

export interface ApplyOptions {
  write: boolean
  overwrite: boolean
}

export interface Stats {
  files: number
  newBatches: number
  promoted: number
  updated: number
  skipped: number
  newPrograms: number
  reusedPrograms: number
  conflicts: Conflict[]
  errors: string[]
  missingSchools: string[]
}

export function createStats(): Stats {
  return {
    files: 0,
    newBatches: 0,
    promoted: 0,
    updated: 0,
    skipped: 0,
    newPrograms: 0,
    reusedPrograms: 0,
    conflicts: [],
    errors: [],
    missingSchools: []
  }
}

function text(value: unknown, max = 200): string {
  return String(value ?? '').trim().slice(0, max)
}

function numeric(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveSchool(name: string, province: string): SchoolRow | null {
  const schoolName = text(name, 120)
  if (!schoolName) return null
  const rows = db.prepare('SELECT id, name, province FROM schools WHERE name = ?').all(schoolName) as unknown as SchoolRow[]
  if (rows.length === 1) return rows[0]
  const provinceName = normalizeProvince(text(province, 20))
  const byProvince = rows.find((row) => normalizeProvince(row.province) === provinceName)
  if (byProvince) return byProvince
  const aliases = db
    .prepare('SELECT s.id, s.name, s.province FROM school_aliases a JOIN schools s ON s.id = a.school_id WHERE a.alias = ?')
    .all(schoolName) as unknown as SchoolRow[]
  if (aliases.length === 1) return aliases[0]
  return aliases.find((row) => normalizeProvince(row.province) === provinceName) ?? null
}

function resolveSchoolOrReport(name: string, province: string, label: string, stats: Stats): SchoolRow | null {
  const school = resolveSchool(name, province)
  if (!school) stats.missingSchools.push(`${label}：${text(name, 120)}（${text(province, 20)}）`)
  return school
}

export class ProgramResolver {
  private cache = new Map<string, string>()
  constructor(private write: boolean, private stats: Stats) {}

  resolve(input: {
    schoolId: string
    year: number
    exam: ExamType
    province: string
    majorCode: string
    majorName: string
    note: string
    sourceUrl: string
  }): string {
    const key = [input.schoolId, input.year, input.exam, input.province, input.majorCode].join('~')
    const cached = this.cache.get(key)
    if (cached) return cached
    const existing = db
      .prepare(
        `SELECT id FROM school_programs
         WHERE school_id = ? AND year = ? AND exam = ? AND province = ? AND major_code = ?
           AND degree_type = '' AND study_mode = ''`
      )
      .get(input.schoolId, input.year, input.exam, input.province, input.majorCode) as { id: string } | undefined
    if (existing) {
      this.cache.set(key, existing.id)
      this.stats.reusedPrograms += 1
      return existing.id
    }
    if (!this.write) {
      const dryId = `prg_dry_${this.cache.size + 1}`
      this.cache.set(key, dryId)
      this.stats.newPrograms += 1
      return dryId
    }
    const program = upsertProgram({
      schoolId: input.schoolId,
      year: input.year,
      exam: input.exam,
      province: input.province,
      majorCode: input.majorCode,
      majorName: input.majorName,
      degreeType: '',
      studyMode: '',
      planCount: null,
      tuition: '',
      examSubjects: [],
      note: input.note,
      sourceUrl: input.sourceUrl,
      reviewStatus: 'approved'
    })
    this.cache.set(key, program.id)
    this.stats.newPrograms += 1
    return program.id
  }
}

function batchKey(batch: NormalizedBatch): string {
  return [batch.scope, batch.exam, batch.year, batch.province, batch.region, batch.schoolId, batch.programId, batch.category, batch.track].join('~')
}

function applyBatch(batch: NormalizedBatch, options: ApplyOptions, stats: Stats): void {
  const errors = validateImportPayload({ batches: [batch] })
  if (errors.length) {
    stats.errors.push(`${batch.title}：${errors[0]}`)
    return
  }
  const checksum = batchChecksum(batch)
  const existingId = findBatchId(batch)
  const existing: ScoreLineBatch | null = existingId ? getBatch(existingId) : null
  if (!existing) {
    stats.newBatches += 1
    if (options.write) saveBatch(batch, { reviewStatus: 'approved', checksum, fetchedAt: new Date().toISOString() })
    return
  }
  if (existing.checksum === checksum) {
    if (existing.reviewStatus === 'approved') {
      stats.skipped += 1
    } else {
      stats.promoted += 1
      if (options.write) setBatchReview(existing.id, 'approved')
    }
    return
  }
  if (existing.reviewStatus === 'pending') {
    stats.promoted += 1
    if (options.write) saveBatch(batch, { reviewStatus: 'approved', checksum, fetchedAt: new Date().toISOString() })
    return
  }
  if (options.overwrite) {
    stats.updated += 1
    if (options.write) saveBatch(batch, { reviewStatus: 'approved', checksum, fetchedAt: new Date().toISOString() })
    return
  }
  stats.conflicts.push({
    key: batchKey(batch),
    title: batch.title,
    existingStatus: existing.reviewStatus,
    existingChecksum: existing.checksum,
    incomingChecksum: checksum
  })
}

function normalizeAndApply(input: BatchInput, options: ApplyOptions, stats: Stats): void {
  const dimensions = normalizeBatchDimensions(normalizeImportBatch(input))
  applyBatch(dimensions.batch, options, stats)
}

function metaText(meta: Json, key: string, max = 200): string {
  return text(meta[key], max)
}

function standardBatch(raw: Json, meta: Json, resolver: ProgramResolver, stats: Stats): BatchInput | null {
  const scope = text(raw.scope, 20)
  if (!isScoreLineScope(scope) || !isExamType(text(raw.exam, 20))) return null
  const year = numeric(raw.year)
  if (year === null) return null
  const province = normalizeProvince(text(raw.province, 20) || metaText(meta, 'province', 20))
  const exam = text(raw.exam, 20) as ExamType
  let schoolId = text(raw.schoolId, 100)
  let programId = text(raw.programId, 100)
  // 导出文件里的 id 是本地库随机 id，跨库不一定存在；不存在时必须走自然键，绝不写孤儿行。
  if ((scope === 'school' || scope === 'program') && schoolId) {
    const exists = db.prepare('SELECT 1 FROM schools WHERE id = ?').get(schoolId)
    if (!exists) {
      if (!text(raw.schoolName, 120)) {
        stats.missingSchools.push(`院校 id 在服务器不存在且没有 schoolName：${schoolId}`)
        return null
      }
      schoolId = ''
    }
  }
  if ((scope === 'school' || scope === 'program') && !schoolId) {
    const school = resolveSchoolOrReport(text(raw.schoolName, 120), text(raw.schoolProvince, 20) || province, text(raw.title, 2000), stats)
    if (!school) return null
    schoolId = school.id
  }
  if (scope === 'program' && programId && !getProgram(programId)) programId = ''
  if (scope === 'program' && !programId && schoolId) {
    if (!text(raw.majorName, 120)) {
      stats.errors.push(`专业线缺少专业名：${text(raw.title, 2000)}`)
      return null
    }
    programId = resolver.resolve({
      schoolId,
      year,
      exam,
      province,
      majorCode: text(raw.majorCode, 40),
      majorName: text(raw.majorName, 120),
      note: text(raw.note, 500),
      sourceUrl: text(raw.sourceUrl, 500)
    })
  }
  const metrics = Array.isArray(raw.metrics) ? raw.metrics : null
  if (metrics) {
    return {
      ...(raw as unknown as BatchInput),
      scope,
      exam,
      year,
      province,
      schoolId,
      programId,
      sourceName: text(raw.sourceName, 80) || metaText(meta, 'sourceName', 80),
      sourceUrl: text(raw.sourceUrl, 500) || metaText(meta, 'sourceUrl', 500)
    }
  }
  // 江苏校线导出是扁平行：{ schoolName, value, subjectCode }，没有 metrics。
  const value = numeric(raw.value)
  if (value === null) {
    stats.errors.push(`${text(raw.title, 2000)}：缺少 metrics / value`)
    return null
  }
  return {
    scope,
    exam,
    year,
    province,
    schoolId,
    programId,
    category: text(raw.category, 40),
    track: text(raw.track, 60),
    title: text(raw.title, 200) || `${year} ${province} ${text(raw.schoolName, 120)}`,
    sourceName: text(raw.sourceName, 80) || metaText(meta, 'sourceName', 80),
    sourceUrl: text(raw.sourceUrl, 500) || metaText(meta, 'sourceUrl', 500),
    publishedAt: text(raw.publishedAt, 40),
    confidence: numeric(raw.confidence) ?? 0.95,
    metrics: [{ subjectCode: text(raw.subjectCode, 40) || 'total', subjectName: '总分', value }]
  }
}

function applyProgramLine(raw: Json, meta: Json, resolver: ProgramResolver, options: ApplyOptions, stats: Stats): void {
  const year = numeric(raw.year)
  const value = numeric(raw.value)
  const exam = text(raw.exam, 20)
  if (year === null || value === null || !isExamType(exam)) {
    stats.errors.push(`专业线格式不对：${text(raw.schoolName, 120)} ${text(raw.majorName, 120)}`)
    return
  }
  const province = normalizeProvince(text(raw.schoolProvince, 20) || metaText(meta, 'province', 20))
  const school = resolveSchoolOrReport(
    text(raw.schoolName, 120),
    province,
    `${text(raw.majorName, 120)}（${text(raw.schoolName, 120)}）`,
    stats
  )
  if (!school) return
  const schoolProvince = normalizeProvince(school.province) || province
  const category = text(raw.category, 40)
  const majorClass = text(raw.majorClass, 60)
  const programId = resolver.resolve({
    schoolId: school.id,
    year,
    exam,
    province: schoolProvince,
    majorCode: text(raw.majorCode, 40),
    majorName: text(raw.majorName, 120),
    note: majorClass ? `专业大类：${majorClass}` : '',
    sourceUrl: text(raw.sourceUrl, 500) || metaText(meta, 'sourceUrl', 500)
  })
  const subjectName = /退役/.test(category) ? '技能考核分' : '总分'
  const suffix = category ? ` · ${category}` : majorClass ? ` · ${majorClass}` : ''
  const input: BatchInput = {
    scope: 'program',
    exam,
    year,
    province: schoolProvince,
    schoolId: school.id,
    programId,
    category,
    track: '',
    title: `${year} ${schoolProvince} 专业线 · ${text(raw.schoolName, 120)} · ${text(raw.majorName, 120)}${suffix}`,
    sourceName: metaText(meta, 'sourceName', 80) || '人工导入',
    sourceUrl: text(raw.sourceUrl, 500) || metaText(meta, 'sourceUrl', 500),
    publishedAt: '',
    confidence: 0.95,
    metrics: [{ subjectCode: text(raw.subjectCode, 40) || 'total', subjectName, value }]
  }
  normalizeAndApply(input, options, stats)
}

function applyProgram(raw: Json, meta: Json, resolver: ProgramResolver, stats: Stats): void {
  const year = numeric(raw.year)
  const exam = text(raw.exam, 20)
  if (year === null || !isExamType(exam)) return
  const province = normalizeProvince(text(raw.province, 20) || metaText(meta, 'province', 20))
  let schoolId = text(raw.schoolId, 100)
  if (!schoolId) {
    const school = resolveSchoolOrReport(text(raw.schoolName, 120), province, text(raw.majorName, 120), stats)
    if (!school) return
    schoolId = school.id
  }
  resolver.resolve({
    schoolId,
    year,
    exam,
    province,
    majorCode: text(raw.majorCode, 40),
    majorName: text(raw.majorName, 120),
    note: text(raw.note, 500),
    sourceUrl: text(raw.sourceUrl, 500) || metaText(meta, 'sourceUrl', 500)
  })
}

/** 应用一个导出文件；调用方负责 backup 与 summary。 */
export function applyExportFile(file: string, options: ApplyOptions, stats: Stats, resolver: ProgramResolver): void {
  stats.files += 1
  const payload = JSON.parse(fs.readFileSync(file, 'utf8')) as ExportPayload
  const meta = payload.meta ?? {}
  console.log(`读取 ${file}`)
  for (const raw of payload.batches ?? []) {
    const input = standardBatch(raw, meta, resolver, stats)
    if (input) normalizeAndApply(input, options, stats)
  }
  for (const raw of payload.programLines ?? []) applyProgramLine(raw, meta, resolver, options, stats)
  for (const raw of payload.programs ?? []) applyProgram(raw, meta, resolver, stats)
}

export function hardErrorCount(stats: Stats): number {
  return stats.errors.length + stats.missingSchools.length
}

export function printSummary(stats: Stats, reportPath: string): void {
  console.log(
    `文件 ${stats.files} 个；新增批次 ${stats.newBatches}，提升 ${stats.promoted}，覆盖 ${stats.updated}，跳过 ${stats.skipped}\n` +
      `新建专业 ${stats.newPrograms}，复用专业 ${stats.reusedPrograms}；冲突 ${stats.conflicts.length}，缺院校 ${stats.missingSchools.length}，错误 ${stats.errors.length}`
  )
  for (const conflict of stats.conflicts.slice(0, 20)) {
    console.log(`  冲突：${conflict.title}（服务器 ${conflict.existingStatus}）`)
  }
  if (stats.conflicts.length > 20) console.log(`  …其余 ${stats.conflicts.length - 20} 条见报告`)
  for (const missing of stats.missingSchools.slice(0, 20)) console.log(`  缺院校：${missing}`)
  for (const error of stats.errors.slice(0, 20)) console.log(`  错误：${error}`)
  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), ...stats }, null, 2))
    console.log(`报告：${reportPath}`)
  }
}
