import { db } from '../connection'
import { getSetting, setSetting } from '../core'
import { log } from '../../log'

const MARKER = 'school_programs_key_v2'

/**
 * v2.06 招生计划唯一键补 `major_name`，避免空 `major_code` 时不同专业互相覆盖。
 * 新键比旧键多一列（更宽松），旧库不会因迁移产生唯一冲突，存量行保留。
 * drop + create + 写标记放在同一事务：失败回滚，旧索引保持可用，下次启动重试。
 */
export function migrateSchoolProgramsKey(): void {
  if (getSetting(MARKER) === '1') return
  db.exec('BEGIN')
  try {
    db.exec('DROP INDEX IF EXISTS idx_school_programs_key')
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_school_programs_key
       ON school_programs(school_id, year, exam, province, major_code, degree_type, study_mode, major_name)`
    )
    setSetting(MARKER, '1')
    db.exec('COMMIT')
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch (rollbackError) {
      log.error('db.school_programs_key_rollback_failed', { err: rollbackError })
    }
    // 回滚后旧索引仍在；不写标记，下次启动重试。
    log.error('db.school_programs_key_migrate_failed', { err: error })
    return
  }
  log.info('db.school_programs_key_migrated', {})
}
