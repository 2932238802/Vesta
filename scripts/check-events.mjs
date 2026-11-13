#!/usr/bin/env node
// events 表与 event_facts 的一致性核对（只读）。
// 只比较仍可能被清理窗口完整覆盖的数据：原始事件 >= 保留期，事实 at >= 保留期。
// 用法：node scripts/check-events.mjs（可手动跑，不接入 verify）
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const dataDir = process.env.DATA_DIR || 'data'
const dbPath = path.isAbsolute(dataDir) ? path.join(dataDir, 'vesta.db') : path.resolve(dataDir, 'vesta.db')
if (!fs.existsSync(dbPath)) {
  console.error(`❌ 找不到数据库：${dbPath}（用 DATA_DIR 指向数据目录）`)
  process.exit(1)
}

const retentionDays = Number(process.env.EVENT_RETENTION_DAYS) > 0 ? Number(process.env.EVENT_RETENTION_DAYS) : 180
const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
const db = new DatabaseSync(dbPath, { readOnly: true })

const rawEvents = db
  .prepare(
    `SELECT invite_id, type, payload, created_at FROM events
     WHERE created_at >= ? AND type IN ('quiz_start', 'group_complete', 'quiz_exit')
     ORDER BY id`
  )
  .all(cutoff)

const facts = db.prepare('SELECT invite_id, kind, key, at, seq FROM event_facts').all()
db.close()

const problems = []

for (const event of rawEvents) {
  if (!event.invite_id) continue
  let payload = {}
  try {
    payload = JSON.parse(event.payload)
  } catch {
    payload = {}
  }
  if (event.type === 'quiz_start') {
    if (!facts.some((fact) => fact.invite_id === event.invite_id && fact.kind === 'start')) {
      problems.push(`邀请 ${event.invite_id} 有 quiz_start，但 event_facts 没有 start`)
    }
  } else if (event.type === 'group_complete' && payload.groupId) {
    const key = String(payload.groupId)
    if (
      !facts.some(
        (fact) => fact.invite_id === event.invite_id && fact.kind === 'group' && fact.key === key
      )
    ) {
      problems.push(`邀请 ${event.invite_id} 有 group_complete(${key})，但 event_facts 没有对应 group`)
    }
  }
}

for (const fact of facts) {
  if (fact.at < cutoff) continue
  if (fact.kind === 'start') {
    const raw = rawEvents.some(
      (event) => event.invite_id === fact.invite_id && event.type === 'quiz_start'
    )
    if (!raw) problems.push(`邀请 ${fact.invite_id} 的 start 事实在窗口内，但原始事件没有 quiz_start`)
  } else if (fact.kind === 'group') {
    const raw = rawEvents.some((event) => {
      if (event.invite_id !== fact.invite_id || event.type !== 'group_complete') return false
      try {
        return String(JSON.parse(event.payload).groupId ?? '') === fact.key
      } catch {
        return false
      }
    })
    if (!raw) {
      problems.push(`邀请 ${fact.invite_id} 的 group(${fact.key}) 事实在窗口内，但原始事件没有对应记录`)
    }
  }
}

// 最后一道退出题：事实里 at 最大的那条，应与窗口内最后一条 quiz_exit 一致。
const lastRawExit = new Map()
for (const event of rawEvents) {
  if (event.type !== 'quiz_exit' || !event.invite_id) continue
  try {
    const questionId = JSON.parse(event.payload).questionId
    if (questionId) lastRawExit.set(event.invite_id, String(questionId))
  } catch {
    // 坏 payload 与旧读法一致：忽略
  }
}
const lastFactExit = new Map()
for (const fact of facts) {
  if (fact.kind !== 'exit') continue
  const previous = lastFactExit.get(fact.invite_id)
  if (!previous || fact.seq > previous.seq) lastFactExit.set(fact.invite_id, fact)
}
for (const [inviteId, fact] of lastFactExit) {
  if (fact.at < cutoff) continue
  const rawKey = lastRawExit.get(inviteId)
  if (rawKey !== fact.key) {
    problems.push(
      `邀请 ${inviteId} 的最后流失题不一致：原始事件=${rawKey ?? '无'}，event_facts=${fact.key}`
    )
  }
}

if (problems.length) {
  console.error(`❌ events 与 event_facts 有 ${problems.length} 处不一致（保留期 ${retentionDays} 天）：`)
  for (const problem of problems.slice(0, 50)) console.error(`  - ${problem}`)
  if (problems.length > 50) console.error(`  …其余 ${problems.length - 50} 条省略`)
  process.exit(1)
}
console.log(`✓ events 与 event_facts 一致：窗口 ${retentionDays} 天，原始事件 ${rawEvents.length} 条，事实 ${facts.length} 条`)
