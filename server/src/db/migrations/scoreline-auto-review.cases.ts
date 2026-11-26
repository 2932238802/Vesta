/**
 * P1-2 迁移失败可重试回归（隔离 DATA_DIR）。
 *
 * 用临时库触发器让 `school_coverage` 刷新抛错：
 * - 第一次迁移必须整体回滚：不写 marker、批次仍 pending、覆盖无行；
 * - 移除触发器后重跑，批次落定、覆盖刷新、marker 写入。
 *
 * 这样验证「更新 + 覆盖刷新 + 标记」是原子的，失败后下次启动能真正补刷。
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { batchChecksum, normalizeImportBatch } from '../../../../shared/src/score-line'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vesta-auto-review-migration-'))
process.env.DATA_DIR = tempDir
process.env.LOG_LEVEL = 'error'

const { initSchema } = await import('../schema')
const { db } = await import('../connection')
const { migrateScoreLineAutoReview } = await import('./scoreline-auto-review')
const { saveBatch } = await import('../../score-lines/batch-store')

try {
  initSchema()
  const at = new Date().toISOString()
  db.prepare(
    `INSERT INTO schools (id, code, name, province, city, level, nature, tags,
       official_url, graduate_url, admissions_url, status, created_at, updated_at)
     VALUES ('sch_mig', '', '迁移测试大学', '浙江', '杭州', '', '', '[]', '', '', '', 'active', ?, ?)`
  ).run(at, at)

  const batch = normalizeImportBatch({
    scope: 'school',
    exam: 'upgrade',
    year: 2025,
    province: '浙江',
    schoolId: 'sch_mig',
    title: '待迁移批次',
    confidence: 0.9,
    metrics: [{ subjectName: '总分', fullScore: 300, value: 250 }]
  })
  saveBatch(batch, { reviewStatus: 'pending', checksum: batchChecksum(batch), fetchedAt: at })

  const batchStatus = () =>
    (db.prepare("SELECT review_status FROM scoreline_batches WHERE school_id = 'sch_mig'").get() as {
      review_status: string
    }).review_status
  const marker = () =>
    (db.prepare("SELECT value FROM settings WHERE key = 'scoreline_auto_review_v1'").get() as
      | { value: string }
      | undefined)?.value ?? null
  const coverageCount = () =>
    Number(
      (db
        .prepare("SELECT COUNT(*) AS count FROM school_coverage WHERE school_id = 'sch_mig'")
        .get() as { count: number }).count
    )

  db.exec(
    `CREATE TRIGGER inject_coverage_fail BEFORE INSERT ON school_coverage
     BEGIN SELECT RAISE(ABORT, 'inject_coverage_fail'); END;`
  )

  // 第一次：覆盖刷新失败 → 更新回滚、marker 不写。
  migrateScoreLineAutoReview()
  assert.equal(marker(), null, '失败时不能写迁移标记')
  assert.equal(batchStatus(), 'pending', '失败时批次更新应回滚为 pending')
  assert.equal(coverageCount(), 0, '失败时覆盖刷新应回滚')

  db.exec('DROP TRIGGER inject_coverage_fail')

  // 第二次：修好后重跑应真正补刷覆盖，而不是把已更新行当成已处理。
  migrateScoreLineAutoReview()
  assert.equal(batchStatus(), 'approved', '重跑后 pending 高置信度应转 approved')
  assert.equal(coverageCount(), 1, '重跑后应补刷受影响覆盖')
  const coverage = db
    .prepare("SELECT status, school_line FROM school_coverage WHERE school_id = 'sch_mig'")
    .get() as { status: string; school_line: number }
  assert.notEqual(coverage.status, 'pending')
  assert.equal(Number(coverage.school_line), 1)
  assert.equal(marker(), '1', '成功后才写迁移标记')

  // 第三次：marker 已写，幂等返回。
  migrateScoreLineAutoReview()
  assert.equal(batchStatus(), 'approved')
  assert.equal(coverageCount(), 1)

  console.log('✓ P1-2 迁移失败整体回滚，移除故障后重跑补刷覆盖并写标记')
} finally {
  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
}
