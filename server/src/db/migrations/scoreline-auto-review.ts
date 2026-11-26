import type { ExamType } from '../../../../shared/src/score-line'
import { SCORELINE_AUTO_APPROVE_CONFIDENCE } from '../../../../shared/src/score-line'
import { db } from '../connection'
import { getSetting, now, setSetting } from '../core'
import {
  refreshCoverage,
  refreshNationalCoverage,
  refreshProvinceCoverage
} from '../../score-lines/coverage'
import { log } from '../../log'

interface PendingBatch {
  scope: string
  exam: string
  year: number
  province: string
  school_id: string
}

interface PendingProgram {
  school_id: string
  exam: string
  year: number
}

interface SchoolTarget {
  schoolId: string
  exam: ExamType
  year: number
}

interface ProvinceTarget {
  exam: ExamType
  year: number
  province: string
}

interface NationalTarget {
  exam: ExamType
  year: number
}

const MARKER = 'scoreline_auto_review_v1'

/**
 * v2.06 存量一次性迁移：把历史 `pending` 数据按自动收录口径落定，并刷新受影响覆盖。
 *
 * - `scoreline_batches.pending`：confidence ≥ 0.70 → approved，否则 rejected。
 * - `school_programs.pending`：招生计划无 confidence，按 trusted → approved。
 * - 只刷新被更新批次 / 计划涉及的 (school / 省级 / 全国) 覆盖，不做全表刷新。
 * - 「更新 + 覆盖刷新 + 写标记」在一个事务内完成：任一步失败整体回滚、不写标记，
 *   下次启动仍能看到 pending 并真正补刷覆盖，而不是把已更新的行当成已处理。
 */
export function migrateScoreLineAutoReview(): void {
  if (getSetting(MARKER) === '1') return

  // 事务内不能嵌套：本迁移由启动流程串行调用，调用方不得再包事务。
  db.exec('BEGIN')
  let approvedChanges = 0
  let rejectedChanges = 0
  let programChanges = 0
  let coverageRefreshed = 0
  try {
    const pendingBatches = db
      .prepare(
        "SELECT scope, exam, year, province, school_id FROM scoreline_batches WHERE review_status = 'pending'"
      )
      .all() as unknown as PendingBatch[]
    const pendingPrograms = db
      .prepare("SELECT school_id, exam, year FROM school_programs WHERE review_status = 'pending'")
      .all() as unknown as PendingProgram[]

    const at = now()
    const approved = db
      .prepare(
        `UPDATE scoreline_batches SET review_status = 'approved', updated_at = ?
         WHERE review_status = 'pending' AND confidence >= ?`
      )
      .run(at, SCORELINE_AUTO_APPROVE_CONFIDENCE)
    const rejected = db
      .prepare(
        "UPDATE scoreline_batches SET review_status = 'rejected', updated_at = ? WHERE review_status = 'pending'"
      )
      .run(at)
    const programs = db
      .prepare(
        "UPDATE school_programs SET review_status = 'approved', updated_at = ? WHERE review_status = 'pending'"
      )
      .run(at)
    approvedChanges = Number(approved.changes)
    rejectedChanges = Number(rejected.changes)
    programChanges = Number(programs.changes)

    // 受影响范围去重后按现有刷新函数重算，避免每条批次都全表扫描。
    // 键用 \u0000 分隔，避免 id / 省份里出现 ~ 时串位。
    const schoolTargets = new Map<string, SchoolTarget>()
    const provinceTargets = new Map<string, ProvinceTarget>()
    const nationalTargets = new Map<string, NationalTarget>()
    const addSchool = (schoolId: string, exam: string, year: number) => {
      if (!schoolId) return
      schoolTargets.set(`${schoolId}\u0000${exam}\u0000${year}`, {
        schoolId,
        exam: exam as ExamType,
        year
      })
    }
    for (const batch of pendingBatches) {
      if (batch.school_id) addSchool(batch.school_id, batch.exam, batch.year)
      else if (batch.scope === 'provincial') {
        provinceTargets.set(`${batch.exam}\u0000${batch.year}\u0000${batch.province}`, {
          exam: batch.exam as ExamType,
          year: batch.year,
          province: batch.province
        })
      } else if (batch.scope === 'national') {
        nationalTargets.set(`${batch.exam}\u0000${batch.year}`, {
          exam: batch.exam as ExamType,
          year: batch.year
        })
      }
    }
    for (const program of pendingPrograms) {
      addSchool(program.school_id, program.exam, program.year)
    }

    for (const target of schoolTargets.values()) {
      refreshCoverage(target.schoolId, target.exam, target.year)
    }
    for (const target of provinceTargets.values()) {
      refreshProvinceCoverage(target.exam, target.year, target.province)
    }
    for (const target of nationalTargets.values()) {
      refreshNationalCoverage(target.exam, target.year)
    }
    coverageRefreshed = schoolTargets.size + provinceTargets.size + nationalTargets.size

    setSetting(MARKER, '1')
    db.exec('COMMIT')
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch (rollbackError) {
      log.error('db.scoreline_auto_review_rollback_failed', { err: rollbackError })
    }
    // 整体回滚、不写标记：下次启动仍能看到 pending，并重新补刷覆盖。
    log.error('db.scoreline_auto_review_migrate_failed', { err: error })
    return
  }

  log.info('db.scoreline_auto_review_migrated', {
    batchesApproved: approvedChanges,
    batchesRejected: rejectedChanges,
    programsApproved: programChanges,
    coverageRefreshed
  })
}
