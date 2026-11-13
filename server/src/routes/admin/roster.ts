import { Router, raw } from 'express'
import { noStore } from '../../auth'
import { db, newId, now } from '../../db'
import { clampString, parseJson } from '../../util'
import { ROSTER_CATEGORIES, localDateKey, reportModeOf, rosterCategoryMatches, rosterStage, surveyReportModes } from './shared'
import type { RosterRow } from './shared'

export const rosterRouter = Router()

rosterRouter.get('/roster', (req, res) => {
  noStore(res)
  const q = clampString(req.query.q, 80)
  const requested = clampString(req.query.category, 20)
  const category = ROSTER_CATEGORIES.has(requested) ? requested : ''
  const groupParam = clampString(req.query.group, 60)
  const selectedDates = new Set(
    clampString(req.query.dates, 2000)
      .split(',')
      .map((date) => date.trim())
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .slice(0, 120)
  )
  const rows = db
    .prepare(
      `SELECT i.id AS invite_id, i.token, i.name, i.note, i.channel,
              i.created_at AS invite_created_at, i.opened_at, i.submitted_at, i.expires_at,
              i.group_id, g.name AS group_name,
              s.id AS submission_id, s.survey_id, s.slug, s.total, s.tier, s.claimed_at, s.slots,
              s.contact_status, s.created_at AS submission_created_at
       FROM invites i
       LEFT JOIN submissions s ON s.invite_id = i.id
       LEFT JOIN roster_groups g ON g.id = i.group_id AND g.deleted_at IS NULL
       ORDER BY COALESCE(s.created_at, i.created_at) DESC LIMIT 1000`
    )
    .all() as unknown as RosterRow[]

  const prepared = rows.map((row) => ({
    row,
    stage: rosterStage(row),
    date: localDateKey(row.invite_created_at)
  }))

  const reportModes = surveyReportModes()

  const dateCounts = new Map<string, number>()
  for (const item of prepared) {
    if (!item.date) continue
    dateCounts.set(item.date, (dateCounts.get(item.date) ?? 0) + 1)
  }

  const needle = q.toLocaleLowerCase()
  const queryFiltered = needle
    ? prepared.filter(({ row }) =>
        [row.name, row.note, row.channel].some((value) =>
          String(value ?? '')
            .toLocaleLowerCase()
            .includes(needle)
        )
      )
    : prepared

  const dateFiltered = selectedDates.size
    ? queryFiltered.filter((item) => selectedDates.has(item.date))
    : queryFiltered
  const counts: Record<string, number> = {
    all: dateFiltered.length,
    unsubmitted: 0,
    pending: 0,
    opened: 0,
    expired: 0,
    unclaimed: 0,
    new: 0,
    contacted: 0,
    scheduled: 0,
    done: 0
  }

  for (const item of dateFiltered) {
    counts[item.stage] += 1
    if (item.stage === 'pending' || item.stage === 'opened' || item.stage === 'expired') {
      counts.unsubmitted += 1
    }
  }

  const mapped = dateFiltered
    .filter((item) => rosterCategoryMatches(category, item.stage))
    .map(({ row, stage }) => {
      // 分组被删掉时，旧的 group_id 不再算数，这些人回到「未分组」。
      const activeGroupId = row.group_id && row.group_name ? row.group_id : null
      return {
        id: row.invite_id,
        inviteId: row.invite_id,
        submissionId: row.submission_id,
        token: row.token,
        name: row.name,
        note: row.note,
        channel: row.channel,
        stage,
        groupId: activeGroupId,
        groupName: activeGroupId ? row.group_name : null,
        inviteCreatedAt: row.invite_created_at,
        openedAt: row.opened_at,
        submittedAt: row.submitted_at ?? row.submission_created_at,
        expiresAt: row.expires_at,
        total: row.total,
        tier: row.tier,
        reportMode: row.submission_id ? reportModeOf(reportModes, row.survey_id) : null,
        claimed: Boolean(row.claimed_at),
        slots: parseJson<string[]>(row.slots, []),
        contactStatus: row.contact_status,
        reportSlug: row.slug,
        reportPath: row.slug ? `/r/${row.slug}` : null,
        detailPath: row.submission_id ? `/admin/submissions/${row.submission_id}` : null
      }
    })

  const groupRows = db
    .prepare('SELECT id, name, created_at, deleted_at FROM roster_groups ORDER BY created_at ASC')
    .all() as { id: string; name: string; created_at: string; deleted_at: string | null }[]

  const groupCounts = new Map<string, number>()
  let ungrouped = 0
  for (const row of mapped) {
    if (row.groupId) groupCounts.set(row.groupId, (groupCounts.get(row.groupId) ?? 0) + 1)
    else ungrouped += 1
  }

  const groups = groupRows
    .filter((group) => !group.deleted_at)
    .map((group) => ({ id: group.id, name: group.name, count: groupCounts.get(group.id) ?? 0 }))

  const deletedGroups = groupRows
    .filter((group) => group.deleted_at)
    .map((group) => ({
      id: group.id,
      name: group.name,
      count: Number(
        (
          db.prepare('SELECT COUNT(*) AS count FROM invites WHERE group_id = ?').get(group.id) as {
            count: number
          }
        ).count
      ),
      deletedAt: group.deleted_at
    }))

  const filtered =
    groupParam === 'none'
      ? mapped.filter((row) => !row.groupId)
      : groupParam
        ? mapped.filter((row) => row.groupId === groupParam)
        : mapped

  const dateRows = db
    .prepare('SELECT date, hidden_at FROM roster_hidden_dates')
    .all() as { date: string; hidden_at: string }[]
  const hiddenDateSet = new Set(dateRows.map((row) => row.date))

  const visibleDates = [...dateCounts.entries()]
    .filter(([date]) => !hiddenDateSet.has(date))
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))

  const hiddenDates = dateRows
    .map((row) => ({ date: row.date, count: dateCounts.get(row.date) ?? 0, hiddenAt: row.hidden_at }))
    .sort((a, b) => b.date.localeCompare(a.date))

  res.json({
    roster: filtered,
    counts,
    groups,
    deletedGroups,
    ungrouped,
    dates: visibleDates,
    hiddenDates
  })
})

rosterRouter.delete('/roster/dates/:date', (req, res) => {
  noStore(res)
  const date = String(req.params.date ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: '日期格式不对' })
    return
  }
  db.prepare('INSERT OR REPLACE INTO roster_hidden_dates (date, hidden_at) VALUES (?, ?)').run(
    date,
    now()
  )
  res.json({ ok: true })
})

rosterRouter.post('/roster/dates/:date/restore', (req, res) => {
  noStore(res)
  const date = String(req.params.date ?? '')
  db.prepare('DELETE FROM roster_hidden_dates WHERE date = ?').run(date)
  res.json({ ok: true })
})

rosterRouter.post('/roster/groups', (req, res) => {
  noStore(res)
  const name = clampString(req.body?.name, 24).trim()
  if (!name) {
    res.status(400).json({ error: '分组名不能为空' })
    return
  }
  const exists = db
    .prepare('SELECT id FROM roster_groups WHERE name = ? AND deleted_at IS NULL')
    .get(name)
  if (exists) {
    res.status(409).json({ error: '已经有同名分组了' })
    return
  }
  const id = newId('group')
  db.prepare('INSERT INTO roster_groups (id, name, created_at) VALUES (?, ?, ?)').run(
    id,
    name,
    now()
  )
  res.json({ group: { id, name, count: 0 } })
})

rosterRouter.patch('/roster/groups/:id', (req, res) => {
  noStore(res)
  const name = clampString(req.body?.name, 24).trim()
  if (!name) {
    res.status(400).json({ error: '分组名不能为空' })
    return
  }
  const row = db
    .prepare('SELECT id FROM roster_groups WHERE id = ? AND deleted_at IS NULL')
    .get(req.params.id) as { id: string } | undefined
  if (!row) {
    res.status(404).json({ error: '分组不存在' })
    return
  }
  const duplicate = db
    .prepare('SELECT id FROM roster_groups WHERE name = ? AND deleted_at IS NULL AND id != ?')
    .get(name, req.params.id)
  if (duplicate) {
    res.status(409).json({ error: '已经有同名分组了' })
    return
  }
  db.prepare('UPDATE roster_groups SET name = ? WHERE id = ?').run(name, req.params.id)
  res.json({ ok: true })
})

rosterRouter.delete('/roster/groups/:id', (req, res) => {
  noStore(res)
  const result = db
    .prepare('UPDATE roster_groups SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL')
    .run(now(), req.params.id)
  if (Number(result.changes) === 0) {
    res.status(404).json({ error: '分组不存在或已删除' })
    return
  }
  // 只删分组，不删问卷；这些人的 group_id 还留着，撤销时自动回到原分组。
  res.json({ ok: true })
})

rosterRouter.post('/roster/groups/:id/restore', (req, res) => {
  noStore(res)
  const result = db
    .prepare('UPDATE roster_groups SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL')
    .run(req.params.id)
  if (Number(result.changes) === 0) {
    res.status(404).json({ error: '没有找到可恢复的分组' })
    return
  }
  res.json({ ok: true })
})

rosterRouter.post('/roster/assign', (req, res) => {
  noStore(res)
  const raw: unknown[] = Array.isArray(req.body?.inviteIds)
    ? (req.body.inviteIds as unknown[])
    : []
  const ids: string[] = []
  for (const id of raw) {
    if (typeof id !== 'string' || !id || ids.includes(id)) continue
    ids.push(id)
    if (ids.length >= 200) break
  }
  if (ids.length === 0) {
    res.status(400).json({ error: '先选中要归类的记录' })
    return
  }
  const groupId =
    typeof req.body?.groupId === 'string' && req.body.groupId ? req.body.groupId : null
  if (groupId) {
    const group = db
      .prepare('SELECT id FROM roster_groups WHERE id = ? AND deleted_at IS NULL')
      .get(groupId) as { id: string } | undefined
    if (!group) {
      res.status(404).json({ error: '分组不存在' })
      return
    }
  }
  const statement = db.prepare('UPDATE invites SET group_id = ? WHERE id = ?')
  db.exec('BEGIN')
  try {
    for (const id of ids) statement.run(groupId, id)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  res.json({ ok: true, assigned: ids.length })
})

rosterRouter.post('/roster/batch-delete', (req, res) => {
  noStore(res)
  const raw: unknown[] = Array.isArray(req.body?.inviteIds)
    ? (req.body.inviteIds as unknown[])
    : []
  const ids: string[] = []
  for (const id of raw) {
    if (typeof id !== 'string' || !id || ids.includes(id)) continue
    ids.push(id)
    if (ids.length >= 200) break
  }
  if (ids.length === 0) {
    res.status(400).json({ error: '没有选中要删除的记录' })
    return
  }

  let deleted = 0
  db.exec('BEGIN')
  try {
    for (const inviteId of ids) {
      // 先删答卷，再删邀请；没有答卷的记录直接删邀请。
      db.prepare('DELETE FROM submissions WHERE invite_id = ?').run(inviteId)
      const result = db.prepare('DELETE FROM invites WHERE id = ?').run(inviteId)
      if (Number(result.changes) > 0) deleted += 1
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  res.json({ ok: true, deleted })
})
