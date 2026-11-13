import { Router } from 'express'
import { currentCycleKey, cycleLabel, cycleRange, cycleStartKey } from '../../../../shared/src/cycle'
import { noStore } from '../../auth'
import { db } from '../../db'
import { clampString, parseJson } from '../../util'
import {
  ROSTER_CATEGORIES,
  reportModeOf,
  rosterCategoryMatches,
  rosterStage,
  surveyReportModes
} from './shared'
import type { RosterRow } from './shared'

export const rosterRouter = Router()

rosterRouter.get('/roster', (req, res) => {
  noStore(res)
  const q = clampString(req.query.q, 80)
  const requested = clampString(req.query.category, 20)
  const category = ROSTER_CATEGORIES.has(requested) ? requested : ''
  const weekParam = clampString(req.query.week, 20)
  // 期次是纯派生值：week 只接受 YYYY-MM-DD，其他（含旧链接的 group/dates）一律按全部处理。
  const requestedWeek = /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : 'all'
  const currentWeek = currentCycleKey()

  const rows = db
    .prepare(
      `SELECT i.id AS invite_id, i.token, i.name, i.note, i.channel,
              i.created_at AS invite_created_at, i.opened_at, i.submitted_at, i.expires_at,
              s.id AS submission_id, s.survey_id, s.slug, s.total, s.tier, s.claimed_at, s.slots,
              s.contact_status, s.created_at AS submission_created_at
       FROM invites i
       LEFT JOIN submissions s ON s.invite_id = i.id
       ORDER BY COALESCE(s.created_at, i.created_at) DESC LIMIT 1000`
    )
    .all() as unknown as RosterRow[]

  const prepared = rows.map((row) => ({
    row,
    stage: rosterStage(row),
    week: cycleStartKey(row.invite_created_at)
  }))

  const reportModes = surveyReportModes()

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

  const weekCounts = new Map<string, number>()
  for (const item of queryFiltered) {
    if (!item.week) continue
    weekCounts.set(item.week, (weekCounts.get(item.week) ?? 0) + 1)
  }
  // 本期永远在列（哪怕 0 人），她周三打开就能看到新一期。
  if (!weekCounts.has(currentWeek)) weekCounts.set(currentWeek, 0)
  const weeks = [...weekCounts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, count]) => {
      const range = cycleRange(key)
      return {
        key,
        start: range.start,
        end: range.end,
        label: cycleLabel(key),
        count,
        current: key === currentWeek
      }
    })

  const weekFiltered =
    requestedWeek === 'all'
      ? queryFiltered
      : queryFiltered.filter((item) => item.week === requestedWeek)

  const counts: Record<string, number> = {
    all: weekFiltered.length,
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
  for (const item of weekFiltered) {
    counts[item.stage] += 1
    if (item.stage === 'pending' || item.stage === 'opened' || item.stage === 'expired') {
      counts.unsubmitted += 1
    }
  }

  const roster = weekFiltered
    .filter((item) => rosterCategoryMatches(category, item.stage))
    .map(({ row, stage, week }) => ({
      id: row.invite_id,
      inviteId: row.invite_id,
      submissionId: row.submission_id,
      token: row.token,
      name: row.name,
      note: row.note,
      channel: row.channel,
      stage,
      week,
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
    }))

  res.json({ roster, counts, weeks, currentWeek })
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
