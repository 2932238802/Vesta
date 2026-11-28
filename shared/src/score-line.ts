/**
 * 分数线模块 v3 的共享类型、科目归一化与导入校验。
 *
 * 四层口径：主线（national / provincial）→ 院校线（school）→ 专业线（program）
 * → 招生计划（school_programs）。所有数字必须带来源；v2.06 起抓取按 confidence 自动收录
 * （≥0.70 approved / <0.70 rejected），查询只读 approved。
 */

import { normalizeProvince, normalizeRegion, provinceRegion } from './score-line-region'

export type ExamType = 'upgrade' | 'postgrad'
export type ScoreLineScope = 'national' | 'provincial' | 'school' | 'program'
export type CoverageStatus =
  | 'covered'
  | 'partial'
  | 'pending'
  | 'no_data'
  | 'not_offered'
  | 'failed'
export type MinimumType = '' | 'admit' | 'retest' | 'transfer' | 'other'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export const SCORELINE_HISTORY_YEARS = 10
export const SCORELINE_MAX_IMPORT_BATCHES = 200
export const SCORELINE_MAX_METRICS_PER_BATCH = 100

/**
 * v2.06 自动收录阈值：抓取批次 confidence ≥ 0.70 自动 approved，低于则 rejected。
 * 阈值只在这里定义一次，抓取写入与启动迁移共用。
 */
export const SCORELINE_AUTO_APPROVE_CONFIDENCE = 0.7

export const EXAM_LABELS: Record<ExamType, string> = {
  upgrade: '专升本',
  postgrad: '考研'
}

export const SCOPE_LABELS: Record<ScoreLineScope, string> = {
  national: '国家线',
  provincial: '省控线',
  school: '校线',
  program: '专业线'
}

export const COVERAGE_LABELS: Record<CoverageStatus, string> = {
  covered: '已收录',
  partial: '部分收录',
  // v2.06 后不再产生新的 pending；该状态只用于历史数据，避免运营误以为还有复核队列。
  pending: '历史待定',
  no_data: '暂无数据',
  not_offered: '不招生',
  failed: '抓取失败'
}

export const MINIMUM_TYPE_LABELS: Record<Exclude<MinimumType, ''>, string> = {
  admit: '录取最低分',
  retest: '复试最低分',
  transfer: '投档最低分',
  other: '其他最低分'
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '待复核',
  approved: '已通过',
  rejected: '已拒绝'
}

export const COVERAGE_MISSING_LABELS: Record<string, string> = {
  main_line: '主线',
  school_line: '校线',
  program_line: '专业线',
  plan_count: '招生计划'
}

export interface ExamSubject {
  code: string
  name: string
  fullScore?: number | null
}

export interface School {
  id: string
  code: string
  name: string
  province: string
  city: string
  level: string
  nature: string
  tags: string[]
  officialUrl: string
  graduateUrl: string
  admissionsUrl: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface SchoolProgram {
  id: string
  schoolId: string
  year: number
  exam: ExamType
  province: string
  majorCode: string
  majorName: string
  degreeType: string
  studyMode: string
  planCount: number | null
  tuition: string
  examSubjects: ExamSubject[]
  note: string
  sourceUrl: string
  reviewStatus: ReviewStatus
  updatedAt: string
}

export interface ScoreLineMetric {
  id?: string
  subjectCode: string
  subjectName: string
  fullScore?: number | null
  value: number
  isMinimum: 0 | 1
  minimumType: MinimumType
  sortOrder?: number
  note?: string
}

export interface ScoreLineBatch {
  id: string
  scope: ScoreLineScope
  exam: ExamType
  year: number
  province: string
  region: string
  schoolId: string
  programId: string
  category: string
  track: string
  title: string
  sourceName: string
  sourceUrl: string
  publishedAt: string
  fetchedAt: string
  checksum: string
  confidence: number
  reviewStatus: ReviewStatus
  note: string
  createdAt: string
  updatedAt: string
  metrics?: ScoreLineMetric[]
}

export interface CoverageInfo {
  status: CoverageStatus | ''
  missing: string[]
  lastUpdatedAt: string
  pendingCount: number
}

export interface QuerySelection {
  exam: ExamType
  year: number
  province: string
  region: string
  schoolId: string
  programId: string
  category: string
  track: string
}

export interface ScoreLineYear {
  year: number
  metrics: ScoreLineMetric[]
}

export interface QueryLine {
  scope: ScoreLineScope
  region: string
  title: string
  years: ScoreLineYear[]
}

export interface MinimumPoint {
  subjectCode: string
  name: string
  year: number
  value: number
  fullScore?: number | null
  minimumType: Exclude<MinimumType, ''>
  label: string
  schoolId: string
  programId: string
}

export interface SeriesPoint {
  year: number
  value: number
  fullScore?: number | null
}

export interface QuerySeries {
  key: string
  lineType: 'main' | 'school' | 'program'
  subjectCode: string
  name: string
  points: SeriesPoint[]
  minimumType?: Exclude<MinimumType, ''>
}

export interface QuerySource {
  name: string
  url: string
  fetchedAt: string
}

export interface ScoreLineQueryResult {
  selection: QuerySelection
  school: School | null
  program: SchoolProgram | null
  coverage: CoverageInfo
  main: QueryLine | null
  schoolLine: QueryLine | null
  programLine: QueryLine | null
  minimums: MinimumPoint[]
  series: QuerySeries[]
  sources: QuerySource[]
  requires: string[]
}

export interface SchoolSearchItem extends School {
  planCount: number | null
  coverage: CoverageInfo | null
}

export interface CoverageItem {
  schoolId: string
  name: string
  province: string
  year: number
  status: CoverageStatus
  missing: string[]
  lastRunId: string
  lastError: string
  updatedAt: string
}

export interface ScoreLineSource {
  id: string
  name: string
  publisher: string
  url: string
  /** 已核验的栏目入口；为空时抓取仍从 url 开始 */
  entryUrl: string
  exam: ExamType
  province: string
  schoolId: string
  parserId: string
  tier: string
  intervalHours: number
  /** 发现深度：0 只抓入口页，默认 2（入口 → 列表 → 公告） */
  discoverDepth: number
  /** 候选链接正则；为空用内置关键词 */
  urlInclude: string
  /** 栏目入口是否人工核验过；未核验的省在失败时提示 needs_seed */
  verified: boolean
  enabled: boolean
  lastRunAt: string
  lastStatus: string
  lastError: string
  createdAt: string
  updatedAt: string
}

/** 抓取失败码：写进 crawl_documents.error / 来源 last_error，覆盖页据此给下一步。 */
export type CrawlFailureCode =
  | 'network'
  | 'blocked'
  | 'entry_redirect'
  | 'no_table'
  | 'unsupported_table'
  | 'no_text_layer'
  | 'parse'
  | 'decode'
  | 'needs_seed'

export const CRAWL_FAILURE_HINTS: Record<CrawlFailureCode, { label: string; next: string }> = {
  network: { label: '站点不可达', next: '稍后重试；连续失败时检查 URL 是否变更' },
  blocked: {
    label: '站点拒绝非浏览器请求',
    next: '换官方 JSON / 本地 HTML / 人工核验入口，不要重试'
  },
  entry_redirect: { label: '入口是引导页', next: '请补该省专升本栏目 URL，再重新抓取' },
  no_table: { label: '没有可解析的表格', next: '疑似前端渲染或入口错，需人工补源' },
  unsupported_table: { label: '表格形状未适配', next: '需补解析器（类别 × 分数）后重新抓取' },
  no_text_layer: { label: 'PDF 没有文本层', next: '扫描件需人工补录，不做 OCR' },
  parse: { label: '文件无法解析', next: '检查文件是否损坏或格式不受支持，必要时人工补录' },
  decode: { label: '页面编码异常', next: '需要补 charset 检测或换用编码正确的入口' },
  needs_seed: { label: '栏目入口未核验', next: '人工核验该省专升本栏目 URL 后再抓' }
}

/** 从错误文本里读机读前缀；没有前缀返回 null。 */
export function crawlFailureHint(
  error: string
): { code: CrawlFailureCode; label: string; next: string } | null {
  const match =
    /^(network|blocked|entry_redirect|no_table|unsupported_table|no_text_layer|parse|decode|needs_seed)\s*[:：]/.exec(
      String(error ?? '').trim()
    )
  if (!match) return null
  const code = match[1] as CrawlFailureCode
  return { code, ...CRAWL_FAILURE_HINTS[code] }
}

export type CrawlStatus = 'queued' | 'running' | 'success' | 'partial' | 'index' | 'failed'

export interface CrawlRun {
  id: string
  sourceId: string
  province: string
  priority: number
  trigger: string
  status: CrawlStatus
  startedAt: string
  finishedAt: string
  discovered: number
  fetched: number
  parsed: number
  saved: number
  failed: number
  message: string
  createdAt: string
}

/** 科目注册表与归一化拆到 `score-line-subject.ts`，此处保留既有导出路径。 */
import { resolveSubject } from './score-line-subject'
export type { SubjectDefinition } from './score-line-subject'
export { resolveSubject, subjectDefinitions, subjectNameOf } from './score-line-subject'

export function isExamType(value: unknown): value is ExamType {
  return value === 'upgrade' || value === 'postgrad'
}

export function isScoreLineScope(value: unknown): value is ScoreLineScope {
  return value === 'national' || value === 'provincial' || value === 'school' || value === 'program'
}

export function isCoverageStatus(value: unknown): value is CoverageStatus {
  return (
    value === 'covered' ||
    value === 'partial' ||
    value === 'pending' ||
    value === 'no_data' ||
    value === 'not_offered' ||
    value === 'failed'
  )
}

export function isMinimumType(value: unknown): value is Exclude<MinimumType, ''> {
  return value === 'admit' || value === 'retest' || value === 'transfer' || value === 'other'
}

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === 'pending' || value === 'approved' || value === 'rejected'
}

/** 已有批次的最少信息：自动收录判定只关心原审核状态与内容 checksum。 */
export interface PreviousReview {
  reviewStatus: ReviewStatus
  checksum: string
}

/** 自动收录跳过原因：内容未变（保留原状态）/ 低置信度不覆盖旧 approved。 */
export type AutoReviewSkipReason = 'same_checksum' | 'keep_previous_approved'

export type AutoReviewDecision =
  | { action: 'write'; reviewStatus: Exclude<ReviewStatus, 'pending'> }
  | { action: 'skip'; reason: AutoReviewSkipReason }

/**
 * v2.06 抓取写入判定（纯函数，不读写数据库）。
 *
 * 规则（与 R-002 / AC-002-1~4 一致）：
 * - 无历史：≥ 阈值 → approved，否则 rejected。
 * - checksum 相同：approved / rejected 保持原状态（不重写指标）；pending 按阈值迁移。
 * - checksum 变化：≥ 阈值 → approved；< 阈值且原为 approved → 跳过（保留旧 approved，防数据消失）；
 *   否则 → rejected。
 *
 * `checksum` 是本次抓取算出的内容指纹，与 `previous.checksum` 比较判断内容是否变化。
 */
export function decideAutoReview(input: {
  confidence: number
  checksum: string
  previous: PreviousReview | null
}): AutoReviewDecision {
  const confidence =
    typeof input.confidence === 'number' && Number.isFinite(input.confidence)
      ? input.confidence
      : 0
  const high = confidence >= SCORELINE_AUTO_APPROVE_CONFIDENCE
  const previous = input.previous
  if (!previous) return { action: 'write', reviewStatus: high ? 'approved' : 'rejected' }
  if (previous.checksum === input.checksum) {
    // 内容没变：已定状态不因重抓改变；只剩历史 pending 需要按阈值补齐。
    if (previous.reviewStatus !== 'pending') return { action: 'skip', reason: 'same_checksum' }
    return { action: 'write', reviewStatus: high ? 'approved' : 'rejected' }
  }
  if (high) return { action: 'write', reviewStatus: 'approved' }
  if (previous.reviewStatus === 'approved') {
    // 低置信度新内容会覆盖掉已通过的数字；保留旧值，交给解析器升级后重抓。
    return { action: 'skip', reason: 'keep_previous_approved' }
  }
  return { action: 'write', reviewStatus: 'rejected' }
}

export interface MetricInput {
  subjectCode?: string
  subjectName?: string
  fullScore?: number | string | null
  value: number | string
  isMinimum?: boolean | number
  minimumType?: string
  note?: string
}

export interface BatchInput {
  scope?: string
  exam?: string
  year?: number | string
  province?: string
  region?: string
  schoolId?: string
  programId?: string
  category?: string
  track?: string
  title?: string
  sourceName?: string
  sourceUrl?: string
  publishedAt?: string
  confidence?: number | string
  note?: string
  metrics?: MetricInput[]
}

export interface ImportPayload {
  dryRun?: boolean
  batches?: BatchInput[]
}

export interface NormalizedBatch {
  scope: ScoreLineScope
  exam: ExamType
  year: number
  province: string
  region: string
  schoolId: string
  programId: string
  category: string
  track: string
  title: string
  sourceName: string
  sourceUrl: string
  publishedAt: string
  confidence: number
  note: string
  metrics: Array<{
    subjectCode: string
    subjectName: string
    fullScore: number | null
    value: number
    isMinimum: 0 | 1
    minimumType: MinimumType
    note: string
  }>
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function raw(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** 校验导入批次；返回中文错误，第一条可直接展示。 */
export function validateImportPayload(input: unknown): string[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['导入内容格式不对']
  const payload = input as ImportPayload
  const batches = Array.isArray(payload.batches) ? payload.batches : []
  if (batches.length === 0) return ['至少导入一条分数线']
  if (batches.length > SCORELINE_MAX_IMPORT_BATCHES) {
    return [`一次最多导入 ${SCORELINE_MAX_IMPORT_BATCHES} 条分数线`]
  }

  const errors: string[] = []
  batches.forEach((batch, index) => {
    const prefix = `第 ${index + 1} 条：`
    errors.push(...validateBatch(batch, prefix))
  })
  return errors
}

function validateBatch(batch: BatchInput | null | undefined, prefix: string): string[] {
  if (!batch || typeof batch !== 'object' || Array.isArray(batch)) return [`${prefix}格式不对`]
  const errors: string[] = []
  if (!isScoreLineScope(batch.scope)) errors.push(`${prefix}范围需为 national / provincial / school / program`)
  if (!isExamType(batch.exam)) errors.push(`${prefix}考试类型需为 upgrade / postgrad`)
  const year = num(batch.year)
  if (year === null || !Number.isInteger(year) || year < 2000 || year > 2100) {
    errors.push(`${prefix}年份需在 2000–2100 之间`)
  }
  const province = normalizeProvince(str(batch.province, 20))
  if (batch.scope !== 'national' && !province) errors.push(`${prefix}请选择省份`)
  const sourceUrl = raw(batch.sourceUrl)
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    errors.push(`${prefix}来源链接需以 http:// 或 https:// 开头`)
  }
  if (sourceUrl.length > 500) errors.push(`${prefix}来源链接最多 500 个字`)
  if (raw(batch.title).length > 200) errors.push(`${prefix}标题最多 200 个字`)
  if (raw(batch.category).length > 40) errors.push(`${prefix}批次最多 40 个字`)
  if (raw(batch.track).length > 60) errors.push(`${prefix}科类最多 60 个字`)
  if (raw(batch.note).length > 500) errors.push(`${prefix}说明最多 500 个字`)
  if (raw(batch.sourceName).length > 80) errors.push(`${prefix}来源最多 80 个字`)
  if (raw(batch.schoolId).length > 100 || raw(batch.programId).length > 100) {
    errors.push(`${prefix}院校或专业 id 太长`)
  }
  const confidence = batch.confidence === undefined ? 1 : num(batch.confidence)
  if (confidence === null || confidence < 0 || confidence > 1) {
    errors.push(`${prefix}置信度需在 0–1 之间`)
  }
  if (batch.scope === 'school' && !str(batch.schoolId, 100)) errors.push(`${prefix}院校线需要院校`)
  if (batch.scope === 'program' && (!str(batch.schoolId, 100) || !str(batch.programId, 100))) {
    errors.push(`${prefix}专业线需要院校和专业`)
  }
  if (batch.scope === 'national' && (str(batch.schoolId, 100) || str(batch.programId, 100))) {
    errors.push(`${prefix}国家线不能绑定院校或专业`)
  }
  // 考研国家线按 A 区 / B 区分别划线；region 为空或认不出会导致写入后按省份查不到。
  if (batch.scope === 'national' && batch.exam === 'postgrad') {
    const region = str(batch.region, 20).replace(/\s+/g, '').toUpperCase()
    if (region !== 'A区' && region !== 'B区') {
      errors.push(`${prefix}考研国家线需标明 A 区或 B 区（region 只能是「A区」或「B区」）`)
    }
  }

  const metrics = Array.isArray(batch.metrics) ? batch.metrics : []
  if (metrics.length === 0) errors.push(`${prefix}至少一条指标`)
  else if (metrics.length > SCORELINE_MAX_METRICS_PER_BATCH) {
    errors.push(`${prefix}最多 ${SCORELINE_MAX_METRICS_PER_BATCH} 条指标`)
  } else {
    const seen = new Set<string>()
    metrics.forEach((metric, metricIndex) => {
      const label = `${prefix}第 ${metricIndex + 1} 个指标：`
      if (!metric || typeof metric !== 'object' || Array.isArray(metric)) {
        errors.push(`${label}格式不对`)
        return
      }
      const subject = resolveSubject(metric.subjectCode) ?? resolveSubject(metric.subjectName)
      if (!subject) errors.push(`${label}科目认不出`)
      const value = num(metric.value)
      if (value === null || value < 0 || value > 1000) errors.push(`${label}分数需在 0–1000 之间`)
      const hasFull = metric.fullScore !== undefined && metric.fullScore !== null && metric.fullScore !== ''
      const fullScore = hasFull ? num(metric.fullScore) : null
      if (hasFull && (fullScore === null || fullScore <= 0 || fullScore > 1000)) {
        errors.push(`${label}满分需大于 0 且不超过 1000`)
      }
      if (value !== null && fullScore !== null && value > fullScore) {
        errors.push(`${label}分数不能大于满分`)
      }
      const isMinimum = metric.isMinimum === true || metric.isMinimum === 1
      const minimumType = str(metric.minimumType, 20)
      if (isMinimum && !isMinimumType(minimumType)) {
        errors.push(`${label}最低分必须标明录取 / 复试 / 投档`)
      }
      if (!isMinimum && minimumType) errors.push(`${label}非最低分不能带最低分类型`)
      if (raw(metric.note).length > 200) errors.push(`${label}备注最多 200 个字`)
      if (subject) {
        const key = `${subject.code}|${isMinimum ? 1 : 0}|${isMinimum ? minimumType : ''}`
        if (seen.has(key)) errors.push(`${label}同一科目和最低分类型重复`)
        seen.add(key)
      }
    })
  }
  return errors
}

/** 校验通过后调用：整理成可写库的批次（科目 code、最低分类型、省份）。 */
export function normalizeImportBatch(batch: BatchInput): NormalizedBatch {
  const metrics = Array.isArray(batch.metrics) ? batch.metrics : []
  const rawRegion = str(batch.region, 20)
  // 考研 region 落库前统一成 A区 / B区：校验大小写不敏感，但查询按标准值精确匹配。
  const region =
    batch.exam === 'postgrad'
      ? normalizeRegion(rawRegion) || rawRegion || provinceRegion(str(batch.province, 20))
      : rawRegion
  return {
    scope: batch.scope as ScoreLineScope,
    exam: batch.exam as ExamType,
    year: Number(batch.year),
    province: normalizeProvince(str(batch.province, 20)),
    region,
    schoolId: str(batch.schoolId, 100),
    programId: str(batch.programId, 100),
    category: str(batch.category, 40),
    track: str(batch.track, 60),
    title: str(batch.title, 200),
    sourceName: str(batch.sourceName, 80),
    sourceUrl: str(batch.sourceUrl, 500),
    publishedAt: str(batch.publishedAt, 40),
    confidence: batch.confidence === undefined ? 1 : Number(batch.confidence),
    note: str(batch.note, 500),
    metrics: metrics.map((metric) => {
      const subject = resolveSubject(metric.subjectCode) ?? resolveSubject(metric.subjectName)
      const hasFull = metric.fullScore !== undefined && metric.fullScore !== null && metric.fullScore !== ''
      const isMinimum = metric.isMinimum === true || metric.isMinimum === 1
      return {
        subjectCode: subject?.code ?? str(metric.subjectCode, 40),
        subjectName: subject?.name ?? str(metric.subjectName, 40),
        fullScore: hasFull ? Number(metric.fullScore) : null,
        value: Number(metric.value),
        isMinimum: isMinimum ? 1 : 0,
        minimumType: isMinimum ? (str(metric.minimumType, 20) as MinimumType) : '',
        note: str(metric.note, 200)
      }
    })
  }
}

/** 同一批次重复抓取时用于判断内容是否变化；不含抓取时间。 */
export function batchChecksum(batch: NormalizedBatch): string {
  const metrics = batch.metrics
    .map((metric) => [metric.subjectCode, metric.isMinimum, metric.minimumType, metric.value, metric.fullScore ?? ''].join(':'))
    .sort()
  return [
    batch.scope,
    batch.exam,
    batch.year,
    batch.province,
    batch.region,
    batch.schoolId,
    batch.programId,
    batch.category,
    batch.track,
    metrics.join('|')
  ].join('~')
}
