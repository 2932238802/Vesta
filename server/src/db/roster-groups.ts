import { log } from '../log'
import { db } from './connection'
import { getSetting, newId, now, setSetting } from './core'

const MIGRATION_MARKER = 'roster_groups_v2_migrated'
const DEFAULT_GROUP_NAME = '默认分组'

/** 旧库补列；表本身由 schema.ts 的 CREATE TABLE IF NOT EXISTS 负责。 */
export function ensureRosterGroupSchema(): void {
  const columns = new Set(
    (db.prepare('PRAGMA table_info(roster_groups)').all() as { name: string }[]).map(
      (column) => column.name
    )
  )
  if (!columns.has('is_default')) {
    db.exec('ALTER TABLE roster_groups ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0')
  }
}

/**
 * v2 分组迁移：保留有效旧组，把 invites.group_id 的单组归属导入成员表，
 * 确定唯一默认组，并让所有没有有效组的邀请进入默认组——升级后不会出现整份名单掉进归档。
 * 用 settings 标记保证只执行一次；失败回滚且不写标记，下次启动重试。
 */
export function migrateRosterGroupsV2(): void {
  if (getSetting(MIGRATION_MARKER)) return

  db.exec('BEGIN')
  try {
    const validGroups = db
      .prepare(
        'SELECT id, name FROM roster_groups WHERE deleted_at IS NULL ORDER BY created_at ASC, id'
      )
      .all() as { id: string; name: string }[]
    const validIds = new Set(validGroups.map((group) => group.id))

    const insertMember = db.prepare(
      'INSERT OR IGNORE INTO roster_group_members (group_id, invite_id, created_at) VALUES (?, ?, ?)'
    )
    const legacy = db
      .prepare(
        "SELECT id, group_id, created_at FROM invites WHERE group_id IS NOT NULL AND group_id <> ''"
      )
      .all() as { id: string; group_id: string; created_at: string }[]
    let imported = 0
    for (const row of legacy) {
      if (!validIds.has(row.group_id)) continue
      imported += Number(insertMember.run(row.group_id, row.id, row.created_at ?? now()).changes)
    }

    const existingDefault = db
      .prepare(
        `SELECT id FROM roster_groups
         WHERE deleted_at IS NULL AND name = ?
         ORDER BY created_at ASC, id LIMIT 1`
      )
      .get(DEFAULT_GROUP_NAME) as { id: string } | undefined
    let defaultId = existingDefault?.id ?? ''
    if (!defaultId) {
      defaultId = newId('grp')
      db.prepare(
        `INSERT INTO roster_groups (id, name, created_at, deleted_at, is_default)
         VALUES (?, ?, ?, NULL, 1)`
      ).run(defaultId, DEFAULT_GROUP_NAME, now())
    }
    // 有效组里只保留一个默认组；优先复用同名旧组，否则用刚建的。
    db.prepare('UPDATE roster_groups SET is_default = CASE WHEN id = ? THEN 1 ELSE 0 END').run(
      defaultId
    )

    const defaulted = Number(
      db
        .prepare(
          `INSERT OR IGNORE INTO roster_group_members (group_id, invite_id, created_at)
           SELECT ?, i.id, i.created_at FROM invites i
           WHERE NOT EXISTS (
             SELECT 1 FROM roster_group_members m
             JOIN roster_groups g ON g.id = m.group_id
             WHERE m.invite_id = i.id AND g.deleted_at IS NULL
           )`
        )
        .run(defaultId).changes
    )

    setSetting(MIGRATION_MARKER, now())
    db.exec('COMMIT')
    log.info('db.roster_groups_migrated', {
      groups: validGroups.length,
      imported,
      defaulted
    })
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

/** 新邀请默认进这个组；手工改库导致没有有效组时返回空串，邀请照常创建。 */
export function getDefaultGroupId(): string {
  const row = db
    .prepare(
      `SELECT id FROM roster_groups
       WHERE deleted_at IS NULL
       ORDER BY is_default DESC, created_at ASC, id LIMIT 1`
    )
    .get() as { id: string } | undefined
  return row?.id ?? ''
}
