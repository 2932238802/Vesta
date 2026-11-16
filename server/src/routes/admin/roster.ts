import { Router } from 'express'
import { currentCycleKey, cycleLabel, cycleRange, cycleStartKey } from '../../../../shared/src/cycle'
import { noStore } from '../../auth'
import { db, normalizeReportMode } from '../../db'
import { log } from '../../log'
import { clampString, parseJson } from '../../util'
import {
  CONSULT_RESULTS,
  normalizeConsultResult,
  ROSTER_CATEGORIES,
  rosterCategoryMatches,
  rosterStage
} from './shared'
import type { InviteRow, RosterRow } from './shared'

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
              i.consulted, i.consult_result, i.priority,
              s.id AS submission_id, s.survey_id, s.report_mode, s.slug, s.total,
              s.claimed_at, s.slots, s.contact_status, s.created_at AS submission_created_at
       FROM invites i
       LEFT JOIN submissions s ON s.invite_id = i.id
       ORDER BY i.consulted DESC, COALESCE(s.created_at, i.created_at) DESC, i.id
       LIMIT 1000`
    )
    .all() as unknown as RosterRow[]

  const prepared = rows.map((row) => ({
    row,
    stage: rosterStage(row),
    week: cycleStartKey(row.invite_created_at)
  }))

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
      consulted: Boolean(row.consulted),
      consultResult: normalizeConsultResult(row.consult_result),
      priority: row.priority ?? '',
      reportMode: row.submission_id ? normalizeReportMode(row.report_mode) : null,
      claimed: Boolean(row.claimed_at),
      slots: parseJson<string[]>(row.slots, []),
      contactStatus: row.contact_status,
      reportSlug: row.slug,
      reportPath: row.slug ? `/r/${row.slug}` : null,
      detailPath: row.submission_id ? `/admin/submissions/${row.submission_id}` : null
    }))

  res.json({ roster, counts, weeks, currentWeek })
})

/**
 * 名单里的咨询标记 / 咨询结果 / 手工优先级都挂在邀请上：未提交的邀请也能改，
 * 删掉答卷后咨询信息不会跟着消失。
 */
rosterRouter.patch('/roster/:inviteId', (req, res) => {
  noStore(res)
  const body = req.body ?? {}
  const hasConsulted = 'consulted' in body
  const hasResult = 'consultResult' in body
  const hasPriority = 'priority' in body
  const consultedInput: unknown = body.consulted
  const resultInput: unknown = body.consultResult
  const priorityInput: unknown = body.priority
  if (!hasConsulted && !hasResult && !hasPriority) {
    res.status(400).json({ error: '没有需要更新的内容' })
    return
  }
  if (hasConsulted && typeof consultedInput !== 'boolean') {
    res.status(400).json({ error: '咨询状态格式不对' })
    return
  }
  if (hasResult && resultInput !== '' && !CONSULT_RESULTS.has(resultInput as string)) {
    res.status(400).json({ error: '咨询结果不在允许范围' })
    return
  }
  if (hasPriority && typeof priorityInput !== 'string') {
    res.status(400).json({ error: '优先级格式不对' })
    return
  }

  const inviteId = String(req.params.inviteId)
  const row = db
    .prepare('SELECT id, consulted, consult_result, priority FROM invites WHERE id = ?')
    .get(inviteId) as Pick<InviteRow, 'id' | 'consulted' | 'consult_result' | 'priority'> | undefined
  if (!row) {
    res.status(404).json({ error: '记录不存在' })
    return
  }

  // 取消咨询时服务端强制清空结果，即使请求里带了非空结果。
  const consulted = hasConsulted ? (consultedInput as boolean) : Boolean(row.consulted)
  const nextResult = consulted
    ? hasResult
      ? (resultInput as string)
      : normalizeConsultResult(row.consult_result)
    : ''
  const nextPriority = hasPriority
    ? (priorityInput as string).trim().slice(0, 20)
    : row.priority

  const updates: string[] = []
  const values: (string | number)[] = []
  const changed: string[] = []
  if (hasConsulted && consulted !== Boolean(row.consulted)) {
    updates.push('consulted = ?')
    values.push(consulted ? 1 : 0)
    changed.push('consulted')
  }
  if (nextResult !== normalizeConsultResult(row.consult_result)) {
    updates.push('consult_result = ?')
    values.push(nextResult)
    changed.push('consult_result')
  }
  if (nextPriority !== row.priority) {
    updates.push('priority = ?')
    values.push(nextPriority)
    changed.push('priority')
  }

  if (updates.length > 0) {
    values.push(inviteId)
    db.prepare(`UPDATE invites SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    log.info('roster.consult_updated', {
      reqId: res.locals.reqId,
      inviteId,
      changed: changed.join(','),
      admin: res.locals.admin
    })
  }
  res.json({ ok: true })
})

rosterRouter.post('/roster/batch-delete', (req, res) => {
  noStore(res)
  const raw: unknown[] = Array.isArray(req.body?.inviteIds)
    ? (req.body.inviteIds as unknown[])
    : []
  const ids: string[] = []
  for (const rawId of raw) {
    if (typeof rawId !== 'string') continue
    const id = rawId.trim()
    // 邀请 id 很短；超过 100 字符的项直接跳过，避免截断后误删到另一个 id。
    if (!id || id.length > 100 || ids.includes(id)) continue
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
