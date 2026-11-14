import type { ExamType, ScoreLineSource } from '../../../shared/src/score-line'
import {
  normalizeProvince,
  provinceUpgradeEntry,
  provinces
} from '../../../shared/src/score-line-region'
import { db } from '../db/connection'
import { newId, now } from '../db/core'

interface SourceRow {
  id: string
  name: string
  publisher: string
  url: string
  entry_url: string
  exam: string
  province: string
  school_id: string
  parser_id: string
  tier: string
  interval_hours: number
  discover_depth: number
  url_include: string
  verified: number
  enabled: number
  last_run_at: string
  last_status: string
  last_error: string
  created_at: string
  updated_at: string
}

export function sourceFromRow(row: SourceRow): ScoreLineSource {
  return {
    id: row.id,
    name: row.name,
    publisher: row.publisher,
    url: row.url,
    entryUrl: row.entry_url ?? '',
    exam: row.exam as ExamType,
    province: row.province,
    schoolId: row.school_id,
    parserId: row.parser_id,
    tier: row.tier,
    intervalHours: Number(row.interval_hours),
    discoverDepth: Number(row.discover_depth ?? 2),
    urlInclude: row.url_include ?? '',
    verified: row.verified === 1,
    enabled: row.enabled === 1,
    lastRunAt: row.last_run_at,
    lastStatus: row.last_status,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listSources(query: {
  exam?: ExamType
  province?: string
  tier?: string
  enabled?: boolean
} = {}): ScoreLineSource[] {
  const conditions: string[] = []
  const params: (string | number)[] = []
  if (query.exam) {
    conditions.push('exam = ?')
    params.push(query.exam)
  }
  if (query.province) {
    conditions.push('province = ?')
    params.push(normalizeProvince(query.province) || query.province)
  }
  if (query.tier) {
    conditions.push('tier = ?')
    params.push(query.tier)
  }
  if (query.enabled !== undefined) {
    conditions.push('enabled = ?')
    params.push(query.enabled ? 1 : 0)
  }
  const rows = db
    .prepare(
      `SELECT * FROM scoreline_sources
       ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY tier, province, name`
    )
    .all(...params) as unknown as SourceRow[]
  return rows.map(sourceFromRow)
}

export function getSource(id: string): ScoreLineSource | null {
  const row = db.prepare('SELECT * FROM scoreline_sources WHERE id = ?').get(id) as
    | SourceRow
    | undefined
  return row ? sourceFromRow(row) : null
}

export function sourcesForProvince(province: string): ScoreLineSource[] {
  const name = province === '全国' ? '全国' : normalizeProvince(province)
  const rows = db
    .prepare('SELECT * FROM scoreline_sources WHERE enabled = 1 AND province = ? ORDER BY tier, name')
    .all(name) as unknown as SourceRow[]
  return rows.map(sourceFromRow)
}

export interface SourceInput {
  id?: string
  name: string
  publisher?: string
  url: string
  entryUrl?: string
  exam: ExamType
  province?: string
  schoolId?: string
  parserId?: string
  tier?: string
  intervalHours?: number
  discoverDepth?: number
  urlInclude?: string
  verified?: boolean
  enabled?: boolean
}

/** 只接受服务端种子 / 管理员配置的 URL；不接收普通请求传入的抓取地址。 */
export function upsertSource(input: SourceInput): ScoreLineSource {
  const id = input.id ?? newId('src')
  const at = now()
  const province =
    input.province === '全国' ? '全国' : normalizeProvince(input.province ?? '')
  const existing = getSource(id)
  if (existing) {
    db.prepare(
      `UPDATE scoreline_sources SET name = ?, publisher = ?, url = ?, entry_url = ?, exam = ?,
         province = ?, school_id = ?, parser_id = ?, tier = ?, interval_hours = ?,
         discover_depth = ?, url_include = ?, verified = ?, enabled = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      input.name,
      input.publisher ?? existing.publisher,
      input.url,
      input.entryUrl ?? existing.entryUrl,
      input.exam,
      province,
      input.schoolId ?? existing.schoolId,
      input.parserId ?? existing.parserId,
      input.tier ?? existing.tier,
      input.intervalHours ?? existing.intervalHours,
      input.discoverDepth ?? existing.discoverDepth,
      input.urlInclude ?? existing.urlInclude,
      input.verified === undefined ? (existing.verified ? 1 : 0) : input.verified ? 1 : 0,
      input.enabled === undefined ? (existing.enabled ? 1 : 0) : input.enabled ? 1 : 0,
      at,
      id
    )
  } else {
    db.prepare(
      `INSERT INTO scoreline_sources
       (id, name, publisher, url, entry_url, exam, province, school_id, parser_id, tier,
        interval_hours, discover_depth, url_include, verified, enabled, last_run_at, last_status,
        last_error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', ?, ?)`
    ).run(
      id,
      input.name,
      input.publisher ?? '',
      input.url,
      input.entryUrl ?? '',
      input.exam,
      province,
      input.schoolId ?? '',
      input.parserId ?? 'html-table@1',
      input.tier ?? 'T0',
      input.intervalHours ?? 168,
      input.discoverDepth ?? 2,
      input.urlInclude ?? '',
      input.verified ? 1 : 0,
      input.enabled === false ? 0 : 1,
      at,
      at
    )
  }
  return getSource(id) as ScoreLineSource
}

export function markSourceRun(
  id: string,
  result: { status: string; error?: string; at: string }
): void {
  db.prepare(
    'UPDATE scoreline_sources SET last_run_at = ?, last_status = ?, last_error = ?, updated_at = ? WHERE id = ?'
  ).run(result.at, result.status, result.error ?? '', result.at, id)
}

/** 幂等种子：31 省专升本 + 研招网国家线 / 复试线汇总。不覆盖管理员改过的启用状态和上次运行。 */
export function seedScorelineSources(): number {
  const at = now()
  const insert = db.prepare(
    `INSERT INTO scoreline_sources
     (id, name, publisher, url, entry_url, exam, province, school_id, parser_id, tier,
      interval_hours, discover_depth, url_include, verified, enabled, last_run_at, last_status,
      last_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, 2, '', ?, 1, '', '', '', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, publisher = excluded.publisher, url = excluded.url,
       entry_url = excluded.entry_url, exam = excluded.exam, province = excluded.province,
       parser_id = excluded.parser_id, tier = excluded.tier,
       interval_hours = excluded.interval_hours, discover_depth = excluded.discover_depth,
       url_include = excluded.url_include, verified = excluded.verified,
       updated_at = excluded.updated_at`
  )
  let count = 0
  for (const province of provinces) {
    const entry = provinceUpgradeEntry(province.name)
    insert.run(
      `src_upgrade_${province.name}`,
      `${province.name}专升本省控线`,
      `${province.name}教育考试院`,
      entry.url,
      entry.verified ? entry.url : '',
      'upgrade',
      province.name,
      'html-table@1',
      'T0',
      24,
      entry.verified ? 1 : 0,
      at,
      at
    )
    count += 1
  }
  insert.run(
    'src_postgrad_national',
    '研招网考研国家线',
    '中国研究生招生信息网',
    'https://yz.chsi.com.cn/kyzx/zt/lnfsx.shtml',
    '',
    'postgrad',
    '全国',
    'yz-topic@1',
    'T0',
    24,
    1,
    at,
    at
  )
  insert.run(
    'src_postgrad_retest',
    '研招网复试分数线汇总',
    '中国研究生招生信息网',
    'https://yz.chsi.com.cn/kyzx/zt/kyfs.shtml',
    '',
    'postgrad',
    '全国',
    'html-table@1',
    'T1',
    168,
    0,
    at,
    at
  )
  return count + 2
}
