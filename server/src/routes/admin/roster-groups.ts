import { Router } from 'express'
import { noStore } from '../../auth'
import { db, newId, now } from '../../db'
import { log } from '../../log'
import { clampString } from '../../util'

export const rosterGroupsRouter = Router()

interface GroupRow {
  id: string
  name: string
  is_default: number
}

function findValidGroup(groupId: string): GroupRow | undefined {
  return db
    .prepare(
      'SELECT id, name, is_default FROM roster_groups WHERE id = ? AND deleted_at IS NULL'
    )
    .get(groupId) as GroupRow | undefined
}

function validGroupCount(): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM roster_groups WHERE deleted_at IS NULL')
    .get() as { n: number }
  return Number(row.n)
}

/** 去重、去空白、最多 200 个；返回空数组表示没有可操作的学员。 */
function parseInviteIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const ids: string[] = []
  for (const value of raw) {
    if (typeof value !== 'string') continue
    const id = value.trim()
    if (!id || id.length > 100 || ids.includes(id)) continue
    ids.push(id)
    if (ids.length >= 200) break
  }
  return ids
}

rosterGroupsRouter.post('/roster/groups', (req, res) => {
  noStore(res)
  const name = clampString(req.body?.name, 24)
  if (!name) {
    res.status(400).json({ error: '分组名称不能为空' })
    return
  }
  const duplicate = db
    .prepare('SELECT id FROM roster_groups WHERE deleted_at IS NULL AND name = ? LIMIT 1')
    .get(name)
  if (duplicate) {
    res.status(409).json({ error: '分组名称已存在' })
    return
  }
  if (validGroupCount() >= 50) {
    res.status(409).json({ error: '分组数量已达上限' })
    return
  }

  const id = newId('grp')
  const createdAt = now()
  const hasDefault = db
    .prepare('SELECT 1 FROM roster_groups WHERE deleted_at IS NULL AND is_default = 1 LIMIT 1')
    .get()
  const isDefault = hasDefault ? 0 : 1
  db.prepare(
    `INSERT INTO roster_groups (id, name, created_at, deleted_at, is_default)
     VALUES (?, ?, ?, NULL, ?)`
  ).run(id, name, createdAt, isDefault)

  log.info('roster.group_created', {
    reqId: res.locals.reqId,
    groupId: id,
    admin: res.locals.admin
  })
  res.json({
    group: { id, name, count: 0, totalCount: 0, default: Boolean(isDefault) }
  })
})

rosterGroupsRouter.delete('/roster/groups/:groupId', (req, res) => {
  noStore(res)
  const groupId = String(req.params.groupId)
  const group = findValidGroup(groupId)
  if (!group) {
    res.status(404).json({ error: '分组不存在' })
    return
  }
  if (validGroupCount() <= 1) {
    res.status(409).json({ error: '至少保留一个分组' })
    return
  }

  // 只属于这个组的人：删组后会进入归档，前端用这个数确认。
  const archivedRow = db
    .prepare(
      `SELECT COUNT(DISTINCT m.invite_id) AS n
       FROM roster_group_members m
       WHERE m.group_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM roster_group_members m2
           JOIN roster_groups g2 ON g2.id = m2.group_id
           WHERE m2.invite_id = m.invite_id
             AND g2.deleted_at IS NULL AND m2.group_id <> ?
         )`
    )
    .get(groupId, groupId) as { n: number }

  db.exec('BEGIN')
  try {
    db.prepare('UPDATE roster_groups SET deleted_at = ? WHERE id = ?').run(now(), groupId)
    if (group.is_default) {
      const next = db
        .prepare(
          `SELECT id FROM roster_groups
           WHERE deleted_at IS NULL
           ORDER BY created_at ASC, id LIMIT 1`
        )
        .get() as { id: string } | undefined
      if (next) {
        db.prepare('UPDATE roster_groups SET is_default = CASE WHEN id = ? THEN 1 ELSE 0 END').run(
          next.id
        )
      }
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  const archived = Number(archivedRow.n)
  log.info('roster.group_deleted', {
    reqId: res.locals.reqId,
    groupId,
    archived,
    admin: res.locals.admin
  })
  res.json({ ok: true, archived })
})

rosterGroupsRouter.post('/roster/groups/:groupId/members', (req, res) => {
  noStore(res)
  const groupId = String(req.params.groupId)
  if (!findValidGroup(groupId)) {
    res.status(404).json({ error: '分组不存在' })
    return
  }
  const inviteIds = parseInviteIds(req.body?.inviteIds)
  if (inviteIds.length === 0) {
    res.status(400).json({ error: '没有选中要移动的学员' })
    return
  }

  const existsInvite = db.prepare('SELECT 1 FROM invites WHERE id = ? LIMIT 1')
  const insert = db.prepare(
    'INSERT OR IGNORE INTO roster_group_members (group_id, invite_id, created_at) VALUES (?, ?, ?)'
  )
  let added = 0
  let skipped = 0
  const at = now()
  db.exec('BEGIN')
  try {
    for (const inviteId of inviteIds) {
      if (!existsInvite.get(inviteId)) {
        skipped += 1
        continue
      }
      added += Number(insert.run(groupId, inviteId, at).changes)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  log.info('roster.group_members_added', {
    reqId: res.locals.reqId,
    groupId,
    added,
    admin: res.locals.admin
  })
  res.json({ ok: true, added, skipped })
})

rosterGroupsRouter.delete('/roster/groups/:groupId/members', (req, res) => {
  noStore(res)
  const groupId = String(req.params.groupId)
  if (!findValidGroup(groupId)) {
    res.status(404).json({ error: '分组不存在' })
    return
  }
  const inviteIds = parseInviteIds(req.body?.inviteIds)
  if (inviteIds.length === 0) {
    res.status(400).json({ error: '没有选中要移动的学员' })
    return
  }

  const remove = db.prepare(
    'DELETE FROM roster_group_members WHERE group_id = ? AND invite_id = ?'
  )
  const stillGrouped = db.prepare(
    `SELECT 1 FROM roster_group_members m
     JOIN roster_groups g ON g.id = m.group_id
     WHERE m.invite_id = ? AND g.deleted_at IS NULL LIMIT 1`
  )
  let removed = 0
  let archived = 0
  db.exec('BEGIN')
  try {
    for (const inviteId of inviteIds) {
      const changes = Number(remove.run(groupId, inviteId).changes)
      if (changes === 0) continue
      removed += changes
      if (!stillGrouped.get(inviteId)) archived += 1
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  log.info('roster.group_members_removed', {
    reqId: res.locals.reqId,
    groupId,
    removed,
    archived,
    admin: res.locals.admin
  })
  res.json({ ok: true, removed, archived })
})
