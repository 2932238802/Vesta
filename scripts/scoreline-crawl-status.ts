#!/usr/bin/env node
/**
 * 分数线抓取状态 CLI（CR-006 / T-024）。
 *
 * 只读打开 `<DATA_DIR>/vesta.db`，输出：
 * - running / queued / 疑似卡住的 running（超过 SCORELINE_CRAWL_PROVINCE_MINUTES，默认 30 分钟）
 * - 每个来源的 last_status / last_error / last_run_at / interval / 下次到期
 * - 最近 10 条 crawl_runs
 *
 * 不迁移、不写库、不打印页面正文或密钥；数据库不存在时给出明确提示并以非 0 退出。
 *
 * 用法：
 *   npx tsx scripts/scoreline-crawl-status.ts
 *   DATA_DIR=/path/to/data npx tsx scripts/scoreline-crawl-status.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// 与 server/src/env.ts 一致：先读仓库根 .env / server/.env，但这里不加载业务配置。
for (const file of [path.join(repoRoot, '.env'), path.join(repoRoot, 'server/.env')]) {
  try {
    process.loadEnvFile(file)
  } catch {
    // .env 不是必需的
  }
}

function resolveDataDir(): string {
  const raw = process.env.DATA_DIR?.trim()
  if (!raw) return path.join(repoRoot, 'data')
  return path.isAbsolute(raw) ? raw : path.join(repoRoot, raw)
}

interface RunRow {
  id: string
  province: string
  status: string
  started_at: string
  finished_at: string
  saved: number
  failed: number
  message: string
  created_at: string
}

interface SourceRow {
  id: string
  name: string
  province: string
  exam: string
  interval_hours: number
  enabled: number
  last_run_at: string
  last_status: string
  last_error: string
}

function text(value: string | null | undefined): string {
  const trimmed = String(value ?? '').trim()
  return trimmed || '-'
}

/** 运行消息 / 错误里可能带抓取 URL：只保留 origin+pathname，去掉 query / hash。 */
function redactUrls(value: string): string {
  return value.replace(/https?:\/\/[^\s；，,)]+/g, (raw) => {
    try {
      const url = new URL(raw)
      return `${url.origin}${url.pathname}`
    } catch {
      return raw
    }
  })
}

function safeText(value: string | null | undefined): string {
  return text(redactUrls(String(value ?? '')))
}

function nextDue(row: SourceRow): string {
  if (row.enabled !== 1) return '停用'
  if (!row.last_run_at) return '待首次'
  const last = Date.parse(row.last_run_at)
  if (Number.isNaN(last)) return '未知'
  const intervalHours = Number(row.interval_hours)
  if (!Number.isFinite(intervalHours) || intervalHours <= 0) return '未知'
  return new Date(last + intervalHours * 3600_000).toISOString()
}

function formatStatus(dbPath: string): string {
  const db = new DatabaseSync(dbPath, { readOnly: true })
  try {
    const running = db
      .prepare(
        `SELECT id, province, status, started_at, finished_at, saved, failed, message, created_at
         FROM crawl_runs WHERE status = 'running' ORDER BY started_at`
      )
      .all() as unknown as RunRow[]
    const queued = db
      .prepare(
        `SELECT id, province, status, started_at, finished_at, saved, failed, message, created_at
         FROM crawl_runs WHERE status = 'queued' ORDER BY priority DESC, created_at`
      )
      .all() as unknown as RunRow[]
    const sources = db
      .prepare(
        `SELECT id, name, province, exam, interval_hours, enabled, last_run_at, last_status, last_error
         FROM scoreline_sources ORDER BY enabled DESC, province, name`
      )
      .all() as unknown as SourceRow[]
    const recent = db
      .prepare(
        `SELECT id, province, status, started_at, finished_at, saved, failed, message, created_at
         FROM crawl_runs ORDER BY created_at DESC LIMIT 10`
      )
      .all() as unknown as RunRow[]

    const minutes = Math.max(1, Number(process.env.SCORELINE_CRAWL_PROVINCE_MINUTES) || 30)
    const staleCutoff = Date.now() - minutes * 60_000
    const stale = running.filter((row) => {
      const started = Date.parse(row.started_at)
      return !Number.isNaN(started) && started < staleCutoff
    })

    const lines: string[] = []
    lines.push('Vesta 分数线抓取状态（只读）')
    lines.push(`数据库：${dbPath}`)
    lines.push('')
    lines.push(`运行中：${running.length}`)
    for (const row of running) {
      lines.push(`  - ${row.id} | ${text(row.province)} | 开始 ${text(row.started_at)} | ${safeText(row.message)}`)
    }
    lines.push(`排队中：${queued.length}`)
    for (const row of queued) {
      lines.push(`  - ${row.id} | ${text(row.province)} | 创建 ${text(row.created_at)}`)
    }
    lines.push(`疑似卡住：${stale.length}（running 超过 ${minutes} 分钟）`)
    for (const row of stale) {
      lines.push(`  - ${row.id} | ${text(row.province)} | 开始 ${text(row.started_at)}`)
    }
    lines.push('')
    lines.push(`来源：${sources.length}`)
    for (const row of sources) {
      lines.push(
        `  - ${text(row.name)} | ${text(row.province)} | ${text(row.exam)} | ` +
          `${row.enabled === 1 ? `间隔 ${Number(row.interval_hours)}h` : '停用'} | ` +
          `最近 ${text(row.last_run_at)} | 状态 ${text(row.last_status)} | ` +
          `下次 ${nextDue(row)} | 错误 ${safeText(row.last_error)}`
      )
    }
    lines.push('')
    lines.push(`最近运行：${recent.length}`)
    for (const row of recent) {
      lines.push(
        `  - ${text(row.created_at)} | ${row.id} | ${text(row.province)} | ${text(row.status)} | ` +
          `saved=${Number(row.saved)} failed=${Number(row.failed)} | ${safeText(row.message)}`
      )
    }
    return `${lines.join('\n')}\n`
  } finally {
    db.close()
  }
}

function main(): void {
  const dbPath = path.join(resolveDataDir(), 'vesta.db')
  if (!fs.existsSync(dbPath)) {
    console.error(`数据库不存在：${dbPath}`)
    console.error('请先启动服务或初始化数据库，可用 DATA_DIR 指定数据目录。')
    process.exit(1)
  }
  process.stdout.write(formatStatus(dbPath))
}

main()
