import type {
  Answers,
  JobCard,
  ReportSearchMeta,
  ReportSearchSource,
  Survey
} from '../../../shared/src/types'
import { cityInText, friendlySearchError, resolveTargetCity } from '../../../shared/src/doc'
import { inferDirectionKey, jobDirections } from '../../../shared/src/job-map'
import { config } from '../env'
import { now } from '../db'
import { log } from '../log'
import { searchWeb, type SearchResult } from './bocha'
import {
  cleanJobTitle,
  companyOf,
  dedupeKey,
  directionRelevant,
  isCityLanding,
  isOldJob,
  isPortalPage,
  jobScore,
  looksLikeArticle,
  looksLikeJob,
  requirementOf,
  salaryOf
} from './job-evidence'
import { buildSearchSpecs, type QuerySpec } from './search-plan'

export { clipSentence, isOldJob, isCityLanding, parseTime } from './job-evidence'
export type { QuerySpec } from './search-plan'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const LIMITED_ERROR = /429|request limit|rate limit|频率|限流|too many/i
/** 瞬时网络错误：重试一次通常就好，不该直接触发整轮补搜。 */
const TRANSIENT_ERROR =
  /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|network|aborted|timeout|timed out/i

async function searchOne(query: string, freshness = 'oneYear'): Promise<SearchResult[]> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await searchWeb(query, { count: 6, freshness })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const limited = LIMITED_ERROR.test(message)
      const transient = TRANSIENT_ERROR.test(message)
      // 无权限、参数错误这类确定性失败，重试也没用，直接抛出。
      if (!limited && !transient) throw error
      // 瞬时网络错误只补一次；429 / 限流保持原来的最多三次退避。
      if (transient && !limited && attempt >= 1) throw error
      if (attempt === 2) throw error
      await sleep(1200 * (attempt + 1))
    }
  }
  return []
}

interface SearchRun {
  results: SearchResult[][]
  errors: string[]
  queries: string[]
  uniqueUrls: Set<string>
}

/** 博查有 QPS 限制，串行跑并留间隔，避免一份报告把配额瞬间打满。 */
async function runSearches(
  specs: QuerySpec[],
  logContext: { submissionId?: string } = {}
): Promise<SearchRun> {
  const results: SearchResult[][] = []
  const errors: string[] = []
  const queries: string[] = []
  const uniqueUrls = new Set<string>()
  for (let index = 0; index < specs.length; index += 1) {
    if (index > 0) await sleep(500)
    const query = specs[index].query
    queries.push(query)
    try {
      const items = await searchOne(query, specs[index].freshness)
      results.push(items)
      items.forEach((item) => uniqueUrls.add(item.url.replace(/\/$/, '')))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const friendly = friendlySearchError(message)
      log.warn('search.query_failed', {
        submissionId: logContext.submissionId,
        query,
        error: message
      })
      errors.push(`${query}：${friendly}`)
      results.push([])
    }
  }
  return { results, errors, queries, uniqueUrls }
}

interface RankedJob {
  item: SearchResult
  score: number
  weak: boolean
  directionKey?: string
  fallback: boolean
}

/** 用博查抓真实招聘原文，做成可点开的卡片；查询词、来源和失败原因全部记录下来。 */
export async function searchJobs(
  survey: Survey,
  answers: Answers,
  logContext: { submissionId?: string } = {}
): Promise<{ jobs: JobCard[]; search: ReportSearchMeta }> {
  const startedMs = Date.now()
  const searchedAt = now()
  const configured = Boolean(config.bochaApiKey && config.bochaBaseUrl)
  if (!configured) {
    const reason = !config.bochaApiKey
      ? '未配置 BOCHA_API_KEY，无法检索招聘原文'
      : '未配置 BOCHA_BASE_URL，无法检索招聘原文'
    log.warn('search.skipped', { submissionId: logContext.submissionId, reason })
    return {
      jobs: [],
      search: {
        configured: false,
        attempted: false,
        queries: [],
        error: reason,
        resultCount: 0,
        searchedAt,
        sources: []
      }
    }
  }

  const city = resolveTargetCity(survey, answers).city
  // 届别年份直接用检索当年，不从 Q3 年级推算：问卷信息不足，产品也不需要。
  const searchYear = new Date().getFullYear()
  const explicitRole = String(answers.q5a ?? '').trim()
  const major = String(answers.q2 ?? '').trim()
  // 学生没写具体岗位时，用专业方向去搜；不要把「专业+相关岗位」当岗位名。
  const role = explicitRole || major
  if (!role) {
    const reason = '问卷里没有专业或目标岗位，无法生成检索词'
    log.warn('search.skipped', { submissionId: logContext.submissionId, reason })
    return {
      jobs: [],
      search: {
        configured: true,
        attempted: false,
        queries: [],
        error: '问卷里没有专业或目标岗位，无法生成检索词',
        resultCount: 0,
        searchedAt,
        sources: []
      }
    }
  }

  const directions = jobDirections(major)
  const useDirections = directions.length > 0 && !explicitRole
  const primarySpecs = buildSearchSpecs({ city, role, directions, useDirections, year: searchYear })
  log.info('search.start', {
    submissionId: logContext.submissionId,
    city,
    explicitRole: Boolean(explicitRole),
    directions: directions.length,
    primaryQueries: primarySpecs.length
  })

  const byUrl = new Map<string, { item: SearchResult; directionKey?: string; fallback: boolean }>()
  const allErrors: string[] = []
  const allQueries: string[] = []
  const allUrls = new Set<string>()

  const collect = (run: SearchRun, specs: QuerySpec[]): void => {
    allErrors.push(...run.errors)
    allQueries.push(...run.queries)
    run.uniqueUrls.forEach((url) => allUrls.add(url))
    run.results.forEach((items, index) => {
      const spec = specs[index]
      for (const item of items) {
        const key = dedupeKey(item.url)
        const existing = byUrl.get(key)
        if (!existing) {
          byUrl.set(key, {
            item,
            directionKey: spec?.key,
            fallback: Boolean(spec?.fallback)
          })
        } else {
          // 同一 URL 在主检索和补位里都出现时，按主检索处理（不标 fallback）。
          if (!existing.directionKey && spec?.key) existing.directionKey = spec.key
          if (!spec?.fallback) existing.fallback = false
        }
      }
    })
  }

  const buildRanked = (): RankedJob[] => {
    const seenTitles = new Set<string>()
    const ranked: RankedJob[] = []
    for (const { item, directionKey, fallback } of byUrl.values()) {
      const titleKey = `${item.title.replace(/\s+/g, '')}|${item.site}`
      if (seenTitles.has(titleKey)) continue
      seenTitles.add(titleKey)
      if (isCityLanding(item.title)) continue
      if (isPortalPage(item.title)) continue
      const text = `${item.title} ${item.snippet}`
      const article = looksLikeArticle(text)
      const inferred = directionKey || inferDirectionKey(text, directions)
      if (useDirections && inferred) {
        const direction = directions.find((entry) => entry.key === inferred)
        if (direction && !directionRelevant(text, direction)) continue
      }
      ranked.push({
        item,
        directionKey: inferred,
        score: jobScore(item, city) + (inferred ? 1 : 0) - (article ? 2 : 0) - (fallback ? 1 : 0),
        weak: article || !looksLikeJob(item.title, item.snippet),
        fallback
      })
    }
    return ranked
  }

  const usableOf = (ranked: RankedJob[]): RankedJob[] =>
    ranked
      .filter(
        (entry) => !entry.weak && !isOldJob(entry.item.publishedAt, entry.item.title)
      )
      .sort((a, b) => b.score - a.score)

  // 渐进式检索：先搜第 1 个方向，可用原文够 3 条就不再花后面的额度；
  // 不足时才退回全量检索，行为与改动前一致（见 docs/archive/20261112/7-博查检索成本优化-设计方案.md）。
  const [firstSpec, ...restSpecs] = primarySpecs
  let run = await runSearches(firstSpec ? [firstSpec] : [], logContext)
  collect(run, firstSpec ? [firstSpec] : [])
  let ranked = buildRanked()
  let usable = usableOf(ranked)
  let searchedAll = restSpecs.length === 0

  if (usable.length < 3 && restSpecs.length > 0) {
    // runSearches 只在同一个 run 内保持 500ms 间隔；这里另起一轮，手动补上间隔。
    await sleep(500)
    run = await runSearches(restSpecs, logContext)
    collect(run, restSpecs)
    ranked = buildRanked()
    usable = usableOf(ranked)
    searchedAll = true
  }

  // 没搜完就不判断缺失方向，避免「只搜了一个方向」把其余方向当成缺位再补搜一次。
  const missingDirections =
    searchedAll && useDirections
      ? directions.filter(
          (direction) => !usable.some((entry) => entry.directionKey === direction.key)
        )
      : []

  // 校招方向没搜到足够的新岗位、或某个方向完全没有原文时，再用通用词补位。
  if (usable.length < 3 || missingDirections.length > 0) {
    const supplementSpecs: QuerySpec[] = missingDirections.slice(0, 2).map((direction) => ({
      key: direction.key,
      query: `${city ? `${city} ` : ''}${direction.query} ${searchYear} 届 招聘`.trim(),
      freshness: 'oneYear'
    }))
    if (usable.length < 3) {
      supplementSpecs.push({
        query: `${city ? `${city} ` : ''}${role} ${searchYear} 届 招聘`.trim(),
        freshness: 'oneYear'
      })
    }
    if (supplementSpecs.length) {
      run = await runSearches(supplementSpecs, logContext)
      collect(run, supplementSpecs)
      ranked = buildRanked()
      usable = usableOf(ranked)
    }
  }

  // 一年内可用原文仍不足 3 条时，用一个月窗补一次。
  // 补来的结果只作「要求结构参考」，标记 fallback 后不进 directionFacts 统计。
  if (usable.length < 3 && primarySpecs[0]) {
    const fallbackSpec: QuerySpec = {
      ...primarySpecs[0],
      freshness: 'oneMonth',
      fallback: true
    }
    run = await runSearches([fallbackSpec], logContext)
    collect(run, [fallbackSpec])
    ranked = buildRanked()
    usable = usableOf(ranked)
  }

  // 还没有任何可用原文时，才退回普通网页检索；只接受像具体招聘的结果。
  if (ranked.length === 0) {
    const fallbackSpec: QuerySpec = {
      query: `${city ? `${city} ` : ''}${role} ${searchYear} 届 校园招聘`.trim(),
      freshness: 'oneYear',
      fallback: true
    }
    run = await runSearches([fallbackSpec], logContext)
    collect(run, [fallbackSpec])
    ranked = buildRanked()
    usable = usableOf(ranked)
  }

  // 优先取「像具体招聘且不太旧」的结果；不够 3 条时，再补其他可核对原文。
  const picked = [...usable]
  if (useDirections) {
    const perDirection: RankedJob[] = []
    for (const direction of directions) {
      perDirection.push(
        ...usable.filter((entry) => entry.directionKey === direction.key).slice(0, 2)
      )
    }
    picked.length = 0
    picked.push(...perDirection)
    const rest = usable.filter(
      (entry) =>
        !picked.some(
          (pickedItem) => dedupeKey(pickedItem.item.url) === dedupeKey(entry.item.url)
        )
    )
    picked.push(...rest.slice(0, 2))
  } else {
    picked.length = 0
    picked.push(...usable.slice(0, 3))
  }
  if (picked.length < 3) {
    const rest = ranked
      .filter(
        (entry) =>
          !picked.some(
            (pickedItem) => dedupeKey(pickedItem.item.url) === dedupeKey(entry.item.url)
          )
      )
      .filter(
        (entry) =>
          !entry.weak || /招聘|岗位|职位/.test(`${entry.item.title} ${entry.item.snippet}`)
      )
      .sort((a, b) => b.score - a.score)
    picked.push(...rest.slice(0, 3 - picked.length))
  }

  picked.sort((a, b) => b.score - a.score)
  const jobs = picked.slice(0, 10).map(({ item, directionKey, fallback }) => ({
    title: cleanJobTitle(item.title),
    company: companyOf(item),
    city: cityInText(`${item.title} ${item.snippet}`),
    salary: salaryOf(item.snippet),
    requirement: requirementOf(item),
    url: item.url,
    date: item.publishedAt,
    directionKey,
    stale: isOldJob(item.publishedAt, item.title),
    fallback
  }))

  let error = ''
  if (allErrors.length > 0) {
    error = jobs.length
      ? `部分检索失败：${allErrors[0]}`
      : `检索失败：${allErrors[0]}`
  } else if (jobs.length === 0) {
    error = '检索已经执行，但没有返回可用的招聘原文'
  }

  const sources: ReportSearchSource[] = jobs.map((job) => ({
    title: job.title,
    url: job.url,
    site: job.company,
    date: job.date
  }))

  log.info('search.done', {
    submissionId: logContext.submissionId,
    queries: new Set(allQueries).size,
    resultCount: allUrls.size,
    jobs: jobs.length,
    ms: Date.now() - startedMs,
    error: error || undefined
  })

  return {
    jobs,
    search: {
      configured: true,
      attempted: allQueries.length > 0,
      queries: [...new Set(allQueries)],
      error,
      resultCount: allUrls.size,
      searchedAt,
      sources,
      searchYear
    }
  }
}
