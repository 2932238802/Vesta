import { db } from '../connection'
import { log } from '../../log'

export function ensureInviteColumns(): void {
  const columns = new Set(
    (db.prepare('PRAGMA table_info(invites)').all() as { name: string }[]).map(
      (column) => column.name
    )
  )
  const additions: [string, string][] = [
    // 历史数据：界面已改为按期次自动分组，group_id 只保留存量，不再读写。
    ['group_id', 'TEXT'],
    ['consulted', 'INTEGER NOT NULL DEFAULT 0'],
    ['consult_result', "TEXT NOT NULL DEFAULT ''"],
    ['priority', "TEXT NOT NULL DEFAULT ''"]
  ]
  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE invites ADD COLUMN ${name} ${definition}`)
    }
  }
}

export function ensureSubmissionColumns(): void {
  const columns = new Set(
    (
      db.prepare('PRAGMA table_info(submissions)').all() as { name: string }[]
    ).map((column) => column.name)
  )
  const additions: [string, string][] = [
    ['ai_status', "TEXT NOT NULL DEFAULT 'pending'"],
    ['ai_report', 'TEXT'],
    ['ai_error', "TEXT NOT NULL DEFAULT ''"],
    ['ai_attempts', 'INTEGER NOT NULL DEFAULT 0'],
    ['ai_meta', "TEXT NOT NULL DEFAULT '{}'"],
    ['ai_started_at', 'TEXT'],
    ['ai_finished_at', 'TEXT'],
    ['report_mode', "TEXT NOT NULL DEFAULT ''"]
  ]
  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE submissions ADD COLUMN ${name} ${definition}`)
    }
  }
}

/**
 * 答卷报告模式固化（v1.81）：历史行按当年问卷的 reportMode 回填，
 * 语义与旧 reportModeOf() 一致（doc → doc，其余 → ai）。可重复执行：
 * 回填后不再有空串，第二次执行改动 0 行。
 */
export function backfillSubmissionReportModes(): void {
  const result = db
    .prepare(
      `UPDATE submissions SET report_mode = CASE
         WHEN (SELECT json_extract(s.data, '$.reportMode')
                 FROM surveys s WHERE s.id = submissions.survey_id) = 'doc'
         THEN 'doc' ELSE 'ai' END
       WHERE report_mode = ''`
    )
    .run()
  const rows = Number(result.changes)
  if (rows > 0) log.info('db.submission_report_mode_backfilled', { rows })
}

export function ensureConsultColumns(): void {
  const columns = new Set(
    (db.prepare('PRAGMA table_info(consult_runs)').all() as { name: string }[]).map(
      (column) => column.name
    )
  )
  const additions: [string, string][] = [
    ['target_length', 'INTEGER NOT NULL DEFAULT 0'],
    ['updated_at', "TEXT NOT NULL DEFAULT ''"],
    ['finished_at', 'TEXT'],
    ['mode', "TEXT NOT NULL DEFAULT 'sentence'"],
    ['purpose_template_id', "TEXT NOT NULL DEFAULT ''"],
    ['purpose_path', "TEXT NOT NULL DEFAULT ''"]
  ]
  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE consult_runs ADD COLUMN ${name} ${definition}`)
    }
  }

  const sectionColumns = new Set(
    (db.prepare('PRAGMA table_info(consult_run_sections)').all() as { name: string }[]).map(
      (column) => column.name
    )
  )
  if (!sectionColumns.has('purpose_keys')) {
    db.exec("ALTER TABLE consult_run_sections ADD COLUMN purpose_keys TEXT NOT NULL DEFAULT '[]'")
  }
  const sectionAdditions: [string, string][] = [
    ['module_id', "TEXT NOT NULL DEFAULT ''"],
    ['options_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['selected_option_id', "TEXT NOT NULL DEFAULT ''"],
    ['beats_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['notes', "TEXT NOT NULL DEFAULT ''"],
    ['edited', 'INTEGER NOT NULL DEFAULT 0']
  ]
  for (const [name, definition] of sectionAdditions) {
    if (!sectionColumns.has(name)) {
      db.exec(`ALTER TABLE consult_run_sections ADD COLUMN ${name} ${definition}`)
    }
  }
}

/** 分数线抓取：栏目入口、发现深度、失败码形状等增量列；可重复执行。 */
export function ensureScoreLineColumns(): void {
  const sourceColumns = new Set(
    (db.prepare('PRAGMA table_info(scoreline_sources)').all() as { name: string }[]).map(
      (column) => column.name
    )
  )
  const sourceAdditions: [string, string][] = [
    ['entry_url', "TEXT NOT NULL DEFAULT ''"],
    ['discover_depth', 'INTEGER NOT NULL DEFAULT 2'],
    ['url_include', "TEXT NOT NULL DEFAULT ''"],
    ['verified', 'INTEGER NOT NULL DEFAULT 0']
  ]
  for (const [name, definition] of sourceAdditions) {
    if (!sourceColumns.has(name)) {
      db.exec(`ALTER TABLE scoreline_sources ADD COLUMN ${name} ${definition}`)
    }
  }

  const documentColumns = new Set(
    (db.prepare('PRAGMA table_info(crawl_documents)').all() as { name: string }[]).map(
      (column) => column.name
    )
  )
  const documentAdditions: [string, string][] = [
    ['note', "TEXT NOT NULL DEFAULT ''"],
    ['shape', "TEXT NOT NULL DEFAULT ''"]
  ]
  for (const [name, definition] of documentAdditions) {
    if (!documentColumns.has(name)) {
      db.exec(`ALTER TABLE crawl_documents ADD COLUMN ${name} ${definition}`)
    }
  }
}
