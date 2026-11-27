/**
 * 吉林两校导入的写库辅助（CR-005 / T-020）。
 *
 * 该模块只依赖 `node:sqlite` 与纯函数，不 import 应用数据库入口，
 * 因此可以在任何阶段安全加载；真正的 `initSchema` / `runMigrations` 仍在
 * `school-import.ts` 的写库分支里动态导入。
 */

import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { normalizeProvince } from '../../../shared/src/score-line-region'
import type { ParsedBatch, ParserContext } from './parsers/types'
import type { JilinSchoolPage } from './school-import'

export function contextFor(page: JilinSchoolPage, url: string, schoolId: string): ParserContext {
  return {
    sourceId: page.sourceId,
    sourceName: page.sourceName,
    sourceUrl: url,
    exam: 'upgrade',
    province: '吉林',
    schoolId,
    schoolName: page.schoolName
  }
}

/**
 * 写库前只读检查院校；不 import '../db'，因此不会建库 / 迁移 / 种子。
 * DB 文件不存在或只读打不开时直接失败，失败路径不创建任何数据库文件。
 */
export async function readSchoolIds(pages: JilinSchoolPage[]): Promise<Map<string, string>> {
  const { config } = await import('../env')
  const dbFile = path.join(config.dataDir, 'vesta.db')
  if (!fs.existsSync(dbFile)) {
    throw new Error(
      `数据库尚未创建：${dbFile}。请先在服务器启动一次服务完成初始化（或先导入院校名单）；本次不创建数据库、不写库`
    )
  }
  const names = pages.map((page) => page.schoolName)
  let database: DatabaseSync | null = null
  try {
    database = new DatabaseSync(dbFile, { readOnly: true })
    const marks = names.map(() => '?').join(', ')
    const rows = database
      .prepare(`SELECT id, name FROM schools WHERE name IN (${marks})`)
      .all(...names) as unknown as { id: string; name: string }[]
    const found = new Map(rows.map((row) => [row.name, row.id]))
    const missing = [...new Set(names.filter((name) => !found.has(name)))]
    if (missing.length) {
      throw new Error(
        `院校未导入：${missing.join('、')}。请先运行 scripts/import-schools.ts 导入院校名单；本次不写库`
      )
    }
    return found
  } catch (error) {
    const message = (error as Error).message
    if (message.startsWith('院校未导入') || message.startsWith('数据库尚未创建')) throw error
    throw new Error(
      `无法只读检查数据库 ${dbFile}：${message}。请先在服务器启动一次服务完成初始化；本次不写库`
    )
  } finally {
    database?.close()
  }
}

export function existingProgramId(db: DatabaseSync, batch: ParsedBatch, schoolId: string): string {
  const row = db
    .prepare(
      `SELECT id FROM school_programs
       WHERE school_id = ? AND year = ? AND exam = ? AND province = ? AND major_code = ?
         AND degree_type = ? AND study_mode = '' AND major_name = ?`
    )
    .get(
      schoolId,
      batch.year,
      batch.exam,
      normalizeProvince(batch.province),
      batch.programCode ?? '',
      batch.degreeType ?? '',
      batch.programName ?? ''
    ) as { id: string } | undefined
  return row?.id ?? ''
}

export function backupDatabase(db: { exec: (sql: string) => void }, dbPath: string): string {
  const backupDir = path.join(path.dirname(dbPath), 'backups')
  fs.mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 17)
  let backup = path.join(backupDir, `vesta-jilin-${stamp}.db`)
  for (let index = 1; fs.existsSync(backup); index += 1) {
    backup = path.join(backupDir, `vesta-jilin-${stamp}-${index}.db`)
  }
  db.exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`)
  return backup
}
