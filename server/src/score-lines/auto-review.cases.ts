/**
 * v2.06 分数线自动收录集成用例（隔离 DATA_DIR，不触碰仓库 data/）。
 *
 * 覆盖 AC-002-1~4、AC-002-7、AC-002-8：
 * - 高置信度写入 approved 且可查询；低置信度写入 rejected 且查询不可见。
 * - 同 checksum 重抓保持原状态；变更 checksum 低置信度不覆盖旧 approved。
 * - 存量 pending 迁移（批次按阈值、招生计划 trusted）与幂等。
 * - 招生计划唯一键补 major_name：空 major_code 的不同专业名可共存，重复同名仍 upsert。
 *
 * 必须先把 DATA_DIR 指向临时目录，再动态 import 数据库模块；静态只 import 纯共享函数。
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { BatchInput, NormalizedBatch } from '../../../shared/src/score-line'
import {
  SCORELINE_AUTO_APPROVE_CONFIDENCE,
  batchChecksum,
  decideAutoReview,
  normalizeImportBatch
} from '../../../shared/src/score-line'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vesta-cr002-'))
process.env.DATA_DIR = tempDir

const { initSchema } = await import('../db/schema')
const { db } = await import('../db/connection')
const { migrateScoreLineAutoReview } = await import('../db/migrations/scoreline-auto-review')
const { migrateSchoolProgramsKey } = await import('../db/migrations/school-programs-key')
const { findBatchId, getBatch, saveBatch } = await import('./batch-store')
const { upsertProgram } = await import('./program-store')
const { queryScoreLines } = await import('./query')
const { normalizeParsedBatch } = await import('./normalize')

initSchema()

const at = new Date().toISOString()
db.prepare(
  `INSERT INTO schools (id, code, name, province, city, level, nature, tags,
     official_url, graduate_url, admissions_url, status, created_at, updated_at)
   VALUES ('sch_test', '', '测试大学', '浙江', '杭州', '', '', '[]', '', '', '', 'active', ?, ?)`
).run(at, at)

/** 构造归一化批次；默认学校线，便于复用唯一键做重抓测试。 */
function makeBatch(overrides: Partial<BatchInput> = {}): NormalizedBatch {
  const input: BatchInput = {
    scope: 'school',
    exam: 'upgrade',
    year: 2025,
    province: '浙江',
    schoolId: 'sch_test',
    programId: '',
    category: '',
    track: '',
    title: '测试批次',
    sourceName: '',
    sourceUrl: '',
    confidence: 0.9,
    metrics: [{ subjectName: '总分', fullScore: 300, value: 250 }],
    ...overrides
  }
  return normalizeImportBatch(input)
}

/** 复刻 crawl.ts 的判定 + 写入路径（不含覆盖刷新）；真实编排见 crawl-orchestration.cases.ts。 */
function crawlWrite(batch: NormalizedBatch): 'approved' | 'rejected' | 'skipped' {
  const checksum = batchChecksum(batch)
  const previousId = findBatchId(batch)
  const previousBatch = previousId ? getBatch(previousId) : null
  const decision = decideAutoReview({
    confidence: batch.confidence,
    checksum,
    previous: previousBatch
      ? { reviewStatus: previousBatch.reviewStatus, checksum: previousBatch.checksum }
      : null
  })
  if (decision.action === 'skip') return 'skipped'
  saveBatch(batch, { reviewStatus: decision.reviewStatus, checksum, fetchedAt: new Date().toISOString() })
  return decision.reviewStatus
}

function batchById(id: string) {
  const batch = getBatch(id)
  assert.ok(batch, `批次 ${id} 应存在`)
  return batch
}

try {
  // AC-002-1：高置信度国家线写入 approved，查询立即可见。
  const highNational = makeBatch({
    scope: 'national',
    exam: 'postgrad',
    province: '',
    schoolId: '',
    region: 'A区',
    track: '工学',
    year: 2025,
    confidence: 0.8,
    metrics: [{ subjectName: '总分', fullScore: 500, value: 300 }]
  })
  assert.equal(crawlWrite(highNational), 'approved')
  const highQuery = queryScoreLines({ exam: 'postgrad', year: 2025, region: 'A区', track: '工学' })
  assert.ok(highQuery.main, '高置信度国家线应可查询')
  assert.ok(highQuery.main.years.some((year) => year.year === 2025), '查询应含 2025')
  console.log('✓ AC-002-1 高置信度写入 approved 且可查询')

  // AC-002-9 落库归一：小写 b区 经 normalizeImportBatch 归一为 B区，写入后按 B区 可查。
  const lowerRegion = makeBatch({
    scope: 'national',
    exam: 'postgrad',
    province: '',
    schoolId: '',
    region: 'b区',
    track: '工学',
    year: 2025,
    confidence: 0.9,
    metrics: [{ subjectName: '总分', fullScore: 500, value: 290 }]
  })
  assert.equal(lowerRegion.region, 'B区', '落库 region 应为 B区')
  assert.equal(crawlWrite(lowerRegion), 'approved')
  const lowerRegionQuery = queryScoreLines({
    exam: 'postgrad',
    year: 2025,
    region: 'B区',
    track: '工学'
  })
  assert.ok(lowerRegionQuery.main, '小写 b区 落库后按 B区 应可查询')
  assert.ok(lowerRegionQuery.main.years.some((year) => year.year === 2025))
  console.log('✓ AC-002-9 小写 b区 落库归一为 B区 且查询可见')

  // AC-002-2：低置信度写入 rejected，查询不可见但记录保留。
  const lowNational = makeBatch({
    scope: 'national',
    exam: 'postgrad',
    province: '',
    schoolId: '',
    region: 'A区',
    track: '工学',
    year: 2024,
    confidence: 0.5,
    metrics: [{ subjectName: '总分', fullScore: 500, value: 290 }]
  })
  assert.equal(crawlWrite(lowNational), 'rejected')
  const lowQuery = queryScoreLines({ exam: 'postgrad', year: 2024, region: 'A区', track: '工学' })
  assert.equal(lowQuery.main, null, '低置信度数据不应出现在查询里')
  const lowRow = db
    .prepare("SELECT review_status FROM scoreline_batches WHERE scope = 'national' AND exam = 'postgrad' AND year = 2024")
    .get() as { review_status: string }
  assert.equal(lowRow.review_status, 'rejected', 'rejected 记录应保留')
  console.log('✓ AC-002-2 低置信度写入 rejected 且查询不可见')

  // AC-002-3：同 checksum 重抓保留原状态（approved / rejected 均不改变）。
  const approvedBatch = makeBatch({
    year: 2023,
    confidence: 0.9,
    metrics: [{ subjectName: '总分', fullScore: 300, value: 260 }]
  })
  assert.equal(crawlWrite(approvedBatch), 'approved')
  const approvedId = findBatchId(approvedBatch) as string
  // 内容不变、置信度变低 → checksum 相同 → skip，保留 approved 与原值。
  assert.equal(crawlWrite({ ...approvedBatch, confidence: 0.2 }), 'skipped')
  assert.equal(batchById(approvedId).reviewStatus, 'approved')
  assert.equal(batchById(approvedId).metrics?.[0]?.value, 260)

  const rejectedBatch = makeBatch({ year: 2022, confidence: 0.4 })
  assert.equal(crawlWrite(rejectedBatch), 'rejected')
  const rejectedId = findBatchId(rejectedBatch) as string
  assert.equal(crawlWrite({ ...rejectedBatch, confidence: 0.95 }), 'skipped')
  assert.equal(batchById(rejectedId).reviewStatus, 'rejected')
  console.log('✓ AC-002-3 同 checksum 重抓不改变 approved / rejected')

  // AC-002-4：变更 checksum，低置信度不覆盖旧 approved；高置信度才覆盖。
  const changedLow = makeBatch({
    year: 2023,
    confidence: 0.4,
    metrics: [{ subjectName: '总分', fullScore: 300, value: 999 }]
  })
  assert.equal(crawlWrite(changedLow), 'skipped')
  assert.equal(batchById(approvedId).reviewStatus, 'approved')
  assert.equal(batchById(approvedId).metrics?.[0]?.value, 260, '低置信度不得覆盖旧 approved')

  const changedHigh = makeBatch({
    year: 2023,
    confidence: 0.9,
    metrics: [{ subjectName: '总分', fullScore: 300, value: 999 }]
  })
  assert.equal(crawlWrite(changedHigh), 'approved')
  assert.equal(batchById(approvedId).metrics?.[0]?.value, 999, '高置信度可覆盖为 approved')
  console.log('✓ AC-002-4 变更 checksum：低置信度保护旧 approved，高置信度覆盖')

  // P2-3：维度认不出时 confidence 必须低于阈值，最终自动 rejected（不能落在 0.70 边界）。
  const dimensionIssue = normalizeParsedBatch(
    {
      scope: 'school',
      exam: 'upgrade',
      year: 2020,
      province: '浙江',
      schoolId: 'sch_test',
      category: '未知批次XYZ',
      track: '未知科类XYZ',
      title: '维度认不出测试',
      sourceName: '测试',
      sourceUrl: '',
      confidence: 0.95,
      metrics: [{ subjectName: '总分', value: 200 }]
    },
    {
      sourceId: '',
      sourceName: '测试',
      sourceUrl: '',
      exam: 'upgrade',
      province: '浙江',
      schoolId: 'sch_test'
    }
  )
  assert.ok(dimensionIssue.batch, '维度 issue 不应导致整批丢弃')
  assert.ok(
    dimensionIssue.batch.confidence < SCORELINE_AUTO_APPROVE_CONFIDENCE,
    '维度 issue 的置信度应低于自动收录阈值'
  )
  const dimensionDecision = decideAutoReview({
    confidence: dimensionIssue.batch.confidence,
    checksum: 'dim',
    previous: null
  })
  assert.equal(dimensionDecision.action, 'write', '维度 issue 应走写入路径留档')
  if (dimensionDecision.action === 'write') {
    assert.equal(dimensionDecision.reviewStatus, 'rejected', '维度 issue 应自动 rejected')
  }
  console.log('✓ P2-3 维度 issue 置信度低于阈值并判为 rejected')

  // AC-002-8：唯一键补 major_name。先模拟旧库索引并保留存量行，再迁移。
  db.exec('DROP INDEX IF EXISTS idx_school_programs_key')
  db.exec(
    `CREATE UNIQUE INDEX idx_school_programs_key
     ON school_programs(school_id, year, exam, province, major_code, degree_type, study_mode)`
  )
  db.prepare(
    `INSERT INTO school_programs
       (id, school_id, year, exam, province, major_code, major_name, degree_type, study_mode,
        plan_count, tuition, exam_subjects, note, source_url, review_status, updated_at)
     VALUES ('prg_legacy', 'sch_test', 2026, 'upgrade', '浙江', '', '旧专业', '', '', NULL, '', '[]', '', '', 'approved', ?)`
  ).run(at)
  const countPrograms = () =>
    Number(
      (db.prepare("SELECT COUNT(*) AS count FROM school_programs WHERE school_id = 'sch_test'").get() as {
        count: number
      }).count
    )
  const beforeMigration = countPrograms()
  migrateSchoolProgramsKey()
  assert.equal(countPrograms(), beforeMigration, '迁移不应丢存量招生计划')
  migrateSchoolProgramsKey()
  assert.equal(countPrograms(), beforeMigration, '迁移可重复执行')

  const progA = upsertProgram({
    schoolId: 'sch_test',
    year: 2026,
    exam: 'upgrade',
    province: '浙江',
    majorCode: '',
    majorName: '计算机科学与技术',
    reviewStatus: 'approved'
  })
  const progB = upsertProgram({
    schoolId: 'sch_test',
    year: 2026,
    exam: 'upgrade',
    province: '浙江',
    majorCode: '',
    majorName: '软件工程',
    reviewStatus: 'approved'
  })
  assert.notEqual(progA.id, progB.id, '空 major_code、不同专业名应是两行')
  const progARepeat = upsertProgram({
    schoolId: 'sch_test',
    year: 2026,
    exam: 'upgrade',
    province: '浙江',
    majorCode: '',
    majorName: '计算机科学与技术',
    reviewStatus: 'approved'
  })
  assert.equal(progARepeat.id, progA.id, '重复同名仍 upsert 到同一行')
  assert.equal(countPrograms(), beforeMigration + 2, '应新增两行不同专业名')
  console.log('✓ AC-002-8 招生计划唯一键补 major_name 且迁移不丢存量')

  // AC-002-7：存量 pending 迁移（批次按阈值、招生计划 trusted）与幂等。
  const pendingHigh = makeBatch({ year: 2021, confidence: 0.75 })
  const pendingHighId = saveBatch(pendingHigh, {
    reviewStatus: 'pending',
    checksum: batchChecksum(pendingHigh),
    fetchedAt: at
  }).id
  const pendingLow = makeBatch({ year: 2021, confidence: 0.5, track: '理工' })
  const pendingLowId = saveBatch(pendingLow, {
    reviewStatus: 'pending',
    checksum: batchChecksum(pendingLow),
    fetchedAt: at
  }).id
  const pendingProgram = upsertProgram({
    schoolId: 'sch_test',
    year: 2021,
    exam: 'upgrade',
    province: '浙江',
    majorCode: 'M1',
    majorName: '待审专业',
    reviewStatus: 'pending'
  })

  migrateScoreLineAutoReview()
  assert.equal(batchById(pendingHighId).reviewStatus, 'approved', 'pending 高置信度应转 approved')
  assert.equal(batchById(pendingLowId).reviewStatus, 'rejected', 'pending 低置信度应转 rejected')
  assert.equal(
    (db.prepare('SELECT review_status FROM school_programs WHERE id = ?').get(pendingProgram.id) as {
      review_status: string
    }).review_status,
    'approved',
    'pending 招生计划应 trusted 转 approved'
  )
  const marker = db
    .prepare("SELECT value FROM settings WHERE key = 'scoreline_auto_review_v1'")
    .get() as { value: string } | undefined
  assert.equal(marker?.value, '1', '迁移成功应写标记')
  const coverage = db
    .prepare("SELECT status, school_line FROM school_coverage WHERE school_id = 'sch_test' AND exam = 'upgrade' AND year = 2021")
    .get() as { status: string; school_line: number } | undefined
  assert.ok(coverage, '迁移后应刷新受影响覆盖')
  assert.notEqual(coverage.status, 'pending', '迁移后不应残留 pending 覆盖')
  assert.equal(Number(coverage.school_line), 1)

  // 再跑一次：标记已写，不再改动。
  const approvedBefore = Number(
    (db.prepare("SELECT COUNT(*) AS count FROM scoreline_batches WHERE review_status = 'approved'").get() as {
      count: number
    }).count
  )
  migrateScoreLineAutoReview()
  const approvedAfter = Number(
    (db.prepare("SELECT COUNT(*) AS count FROM scoreline_batches WHERE review_status = 'approved'").get() as {
      count: number
    }).count
  )
  assert.equal(approvedAfter, approvedBefore, '迁移可重复执行，第二次不重复处理')
  console.log('✓ AC-002-7 存量 pending 迁移幂等且覆盖刷新')

  console.log('\n分数线自动收录集成用例全部通过')
} finally {
  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
}
