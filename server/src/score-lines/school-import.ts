/**
 * 吉林两校服务器导入核心（CR-005 / T-020）。
 *
 * 只做两件事：
 * 1. 抓取 / 读取两校官方录取表并解析成 `ParsedBatch`（纯逻辑，不碰数据库）；
 * 2. `--write` 时动态加载数据库模块，先 `VACUUM INTO` 备份，再 upsert
 *    `school_programs` + `scope='program'` 批次并刷新覆盖。
 *
 * 默认 dry-run 不导入数据库模块，因此不会创建 / 迁移 / 写入 `data/vesta.db`。
 * 解析失败、院校缺失、页面打不开都在写库前抛错，不写半成品数据。
 */

import fs from 'node:fs'
import type { ParsedBatch, ParserContext } from './parsers/types'
import { schoolAdmitParser } from './parsers/school-admit'
import { backupDatabase, contextFor, existingProgramId, readSchoolIds } from './school-import-store'

export interface JilinSchoolPage {
  key: 'ccit' | 'ccsfu'
  schoolName: string
  url: string
  sourceId: string
  sourceName: string
  publisher: string
}

export const JILIN_SCHOOL_PAGES: JilinSchoolPage[] = [
  {
    key: 'ccit',
    schoolName: '长春工程学院',
    url: 'https://zsb.ccit.edu.cn/info/1009/1931.htm',
    sourceId: 'src_upgrade_school_ccit',
    sourceName: '长春工程学院专升本录取分数线',
    publisher: '长春工程学院招生信息网'
  },
  {
    key: 'ccsfu',
    schoolName: '长春师范大学',
    url: 'https://zhaosheng.ccsfu.edu.cn/info/1171/129250.htm',
    sourceId: 'src_upgrade_school_ccsfu',
    sourceName: '长春师范大学专升本录取分数线',
    publisher: '长春师范大学招生网'
  }
]

export interface FetchedPage {
  content: Uint8Array
  contentType: string
  httpStatus: number
}

const FETCH_TIMEOUT_MS = 30_000
const MAX_BYTES = 10 * 1024 * 1024

/** 抓取官方页。403 视为 WAF / 反爬，给出可操作提示；日志只记 URL 与状态。 */
export async function fetchSchoolPage(url: string): Promise<FetchedPage> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'VestaScorelineImport/1.0 (internal research; contact admin)',
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8'
      }
    })
    if (!response.ok) {
      const hint =
        response.status === 403
          ? '；站点可能启用了 WAF / 反爬。请在能正常访问该校招生网的服务器上重试，或用 --ccit-html/--ccsfu-html 传入浏览器另存的页面'
          : response.status === 404
            ? '；页面可能已改版，请核对栏目地址'
            : ''
      throw new Error(`HTTP ${response.status}${hint}`)
    }
    const buffer = new Uint8Array(await response.arrayBuffer())
    if (buffer.byteLength > MAX_BYTES) throw new Error('页面超过 10MB，已拒绝')
    return {
      content: buffer,
      contentType: response.headers.get('content-type') ?? '',
      httpStatus: response.status
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`抓取超时（${FETCH_TIMEOUT_MS / 1000} 秒）：${url}`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export interface ParsedSchoolPage {
  page: JilinSchoolPage
  url: string
  batches: ParsedBatch[]
  issues: string[]
  failure?: { code: string; detail: string }
}

/** 解析一页官方录取表；不含任何数据库访问。 */
export async function parseSchoolPage(
  page: JilinSchoolPage,
  input: { content: Uint8Array | string; contentType: string; url?: string }
): Promise<ParsedSchoolPage> {
  const url = input.url ?? page.url
  const context: ParserContext = {
    sourceId: page.sourceId,
    sourceName: page.sourceName,
    sourceUrl: url,
    exam: 'upgrade',
    province: '吉林',
    schoolName: page.schoolName
  }
  const result = await schoolAdmitParser.parse({
    parserId: 'school-admit@1',
    content: input.content,
    contentType: input.contentType,
    url,
    context
  })
  return { page, url, batches: result.batches, issues: result.issues, failure: result.failure }
}

export interface ImportPageOverride {
  url?: string
  htmlPath?: string
}

export interface RunImportOptions {
  write: boolean
  overrides?: Partial<Record<JilinSchoolPage['key'], ImportPageOverride>>
  fetchPage?: (url: string) => Promise<FetchedPage>
}

export interface ImportRow {
  year: number
  programCode: string
  programName: string
  degreeType: string
  planCount: number | null
  admitCount: number | null
  maxScore: number | null
  minimum: number
  note: string
}

export interface ImportPageReport {
  key: JilinSchoolPage['key']
  schoolName: string
  url: string
  rows: ImportRow[]
}

export interface ImportSummary {
  dryRun: boolean
  pages: ImportPageReport[]
  written: number
  skipped: number
  backup: string
  /** 预检判定全部跳过时不为无变化的写入生成备份。 */
  backupSkipped: boolean
}

function rowOf(batch: ParsedBatch): ImportRow {
  const metric = batch.metrics[0]
  return {
    year: batch.year,
    programCode: batch.programCode ?? '',
    programName: batch.programName ?? '',
    degreeType: batch.degreeType ?? batch.category ?? '',
    planCount: batch.planCount ?? null,
    admitCount: batch.admitCount ?? null,
    maxScore: batch.maxScore ?? null,
    minimum: metric?.value ?? 0,
    note: metric?.note ?? ''
  }
}

async function loadPages(
  options: RunImportOptions
): Promise<{ page: JilinSchoolPage; url: string; batches: ParsedBatch[]; report: ImportPageReport }[]> {
  const fetchPage = options.fetchPage ?? fetchSchoolPage
  const loaded: {
    page: JilinSchoolPage
    url: string
    batches: ParsedBatch[]
    report: ImportPageReport
  }[] = []
  for (const page of JILIN_SCHOOL_PAGES) {
    const override = options.overrides?.[page.key]
    const url = override?.url ?? page.url
    let content: Uint8Array | string
    let contentType: string
    if (override?.htmlPath) {
      content = fs.readFileSync(override.htmlPath, 'utf8')
      contentType = 'text/html; charset=utf-8'
    } else {
      const fetched = await fetchPage(url)
      content = fetched.content
      contentType = fetched.contentType
    }
    const parsed = await parseSchoolPage(page, { content, contentType, url })
    if (parsed.failure || parsed.batches.length === 0) {
      const detail = parsed.failure?.detail ?? parsed.issues[0] ?? '没有解析到专业行'
      throw new Error(
        `${page.schoolName} 解析失败（${parsed.failure?.code ?? 'parse'}）：${detail}；本次不写库`
      )
    }
    loaded.push({
      page,
      url,
      batches: parsed.batches,
      report: {
        key: page.key,
        schoolName: page.schoolName,
        url,
        rows: parsed.batches.map(rowOf)
      }
    })
  }
  return loaded
}

/** 抓取 → 解析 →（可选）写库。dry-run 在第一个 await 数据库导入之前返回。 */
export async function runImport(options: RunImportOptions): Promise<ImportSummary> {
  const loaded = await loadPages(options)
  const summary: ImportSummary = {
    dryRun: !options.write,
    pages: loaded.map((item) => item.report),
    written: 0,
    skipped: 0,
    backup: '',
    backupSkipped: false
  }
  if (!options.write) return summary

  // P2：先只读检查院校；失败路径不建库、不迁移、不写备份。
  const schoolIds = await readSchoolIds(loaded.map((item) => item.page))

  // 校验通过后才加载数据库与业务模块（会执行 initSchema / runMigrations）。
  const { db } = await import('../db')
  const { dbPath } = await import('../db/connection')
  const { batchChecksum, decideAutoReview } = await import('../../../shared/src/score-line')
  const { findBatchId, getBatch, saveBatch } = await import('./batch-store')
  const { refreshCoverage } = await import('./coverage')
  const { normalizeParsedBatch } = await import('./normalize')
  const { upsertProgram } = await import('./program-store')
  const { batchValueIssues } = await import('./validate')

  const schools = new Map<string, { id: string }>()
  const contexts = new Map<string, ParserContext>()
  for (const item of loaded) {
    const schoolId = schoolIds.get(item.page.schoolName) as string
    schools.set(item.page.key, { id: schoolId })
    contexts.set(item.page.key, contextFor(item.page, item.url, schoolId))
  }

  // 写库前先整体校验，避免解析半成功时留下部分批次。
  for (const item of loaded) {
    const schoolId = schools.get(item.page.key)?.id ?? ''
    const context = contexts.get(item.page.key) as ParserContext
    for (const batch of item.batches) {
      const probe = normalizeParsedBatch({ ...batch, schoolId, programId: '__pending__' }, context)
      const issues = probe.batch ? batchValueIssues(probe.batch) : []
      if (!probe.batch || issues.length) {
        throw new Error(
          `${item.page.schoolName}「${batch.programName ?? ''}」校验未通过：${
            [...probe.issues, ...issues].join('；') || '未知原因'
          }；本次不写库`
        )
      }
    }
  }

  // P3：预判本轮是否有实际写入；全部跳过时不生成无意义的备份。
  let plannedWrites = 0
  for (const item of loaded) {
    const schoolId = schools.get(item.page.key)?.id ?? ''
    const context = contexts.get(item.page.key) as ParserContext
    for (const batch of item.batches) {
      const programId = existingProgramId(db, batch, schoolId)
      if (!programId) {
        plannedWrites += 1
        continue
      }
      const normalized = normalizeParsedBatch({ ...batch, schoolId, programId }, context)
      if (!normalized.batch) {
        throw new Error(`${item.page.schoolName}「${batch.programName ?? ''}」归一化失败；本次不写库`)
      }
      const checksum = batchChecksum(normalized.batch)
      const previousId = findBatchId(normalized.batch)
      const previous = previousId ? getBatch(previousId) : null
      const decision = decideAutoReview({
        confidence: normalized.batch.confidence,
        checksum,
        previous: previous ? { reviewStatus: previous.reviewStatus, checksum: previous.checksum } : null
      })
      if (decision.action === 'write') plannedWrites += 1
    }
  }
  if (plannedWrites === 0) {
    summary.skipped = loaded.reduce((count, item) => count + item.batches.length, 0)
    summary.backupSkipped = true
    return summary
  }

  summary.backup = backupDatabase(db, dbPath)

  for (const item of loaded) {
    const schoolId = schools.get(item.page.key)?.id ?? ''
    const context = contexts.get(item.page.key) as ParserContext
    for (const batch of item.batches) {
      const program = upsertProgram({
        schoolId,
        year: batch.year,
        exam: batch.exam,
        province: batch.province,
        majorCode: batch.programCode ?? '',
        majorName: batch.programName ?? '',
        degreeType: batch.degreeType ?? '',
        studyMode: '',
        planCount: batch.planCount ?? null,
        sourceUrl: batch.sourceUrl,
        reviewStatus: 'approved'
      })
      const normalized = normalizeParsedBatch({ ...batch, schoolId, programId: program.id }, context)
      if (!normalized.batch) {
        throw new Error(`${item.page.schoolName}「${batch.programName ?? ''}」归一化失败，已备份上下文`)
      }
      const checksum = batchChecksum(normalized.batch)
      const previousId = findBatchId(normalized.batch)
      const previous = previousId ? getBatch(previousId) : null
      const decision = decideAutoReview({
        confidence: normalized.batch.confidence,
        checksum,
        previous: previous ? { reviewStatus: previous.reviewStatus, checksum: previous.checksum } : null
      })
      if (decision.action === 'skip') {
        summary.skipped += 1
        continue
      }
      saveBatch(normalized.batch, {
        reviewStatus: decision.reviewStatus,
        checksum,
        fetchedAt: new Date().toISOString()
      })
      if (normalized.batch.schoolId) {
        refreshCoverage(normalized.batch.schoolId, normalized.batch.exam, normalized.batch.year)
      }
      summary.written += 1
    }
  }
  return summary
}
