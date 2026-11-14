import type {
  Answers,
  JobCard,
  ReportSearchMeta,
  ReportSearchSource,
  Survey
} from '../../../shared/src/types'
import { cityInText, friendlySearchError } from '../../../shared/src/doc'
import { jobDirections } from '../../../shared/src/job-map'
import { config } from '../env'
import { now } from '../db'
import { log } from '../log'
import { searchWeb, type SearchResult } from './bocha'
import {
  cleanJobTitle,
  companyOf,
  judgeJob,
  requirementOf,
  type DropReason,
  type JobVerdict
} from './job-evidence'
import { dedupeKey, salaryOf } from './job-card'
import { buildQueryPlan, buildSearchIntent, QUERY_BUDGET } from './search-plan'

export { clipSentence } from './job-card'
export { isCityLanding, isOldJob, parseTime } from './job-evidence'

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

interface JudgedJob {
  item: SearchResult
  verdict: JobVerdict
}

function configReason(): string {
  return !config.bochaApiKey
    ? '未配置 BOCHA_API_KEY，无法检索招聘原文'
    : '未配置 BOCHA_BASE_URL，无法检索招聘原文'
}

/** 答卷人侧的失败说明：只讲结果和下一步，内部原因进日志。 */
function failureMessage(hasJobs: boolean): string {
  return hasJobs
    ? '部分原文暂时没能取到，可稍后重试'
    : '本次没能获取招聘原文，可稍后重试'
}

/** 用博查抓真实招聘原文，做成可点开的卡片；检索词、丢弃原因只进后台日志。 */
export async function searchJobs(
  survey: Survey,
  answers: Answers,
  logContext: { submissionId?: string } = {}
): Promise<{ jobs: JobCard[]; search: ReportSearchMeta }> {
  const startedMs = Date.now()
  const searchedAt = now()
  const configured = Boolean(config.bochaApiKey && config.bochaBaseUrl)
  const emptyMeta = (error: string): ReportSearchMeta => ({
    configured,
    attempted: false,
    queries: [],
    error,
    resultCount: 0,
    searchedAt,
    sources: []
  })
  if (!configured) {
    const reason = configReason()
    log.warn('search.skipped', { submissionId: logContext.submissionId, reason })
    return { jobs: [], search: emptyMeta(failureMessage(false)) }
  }

  const intent = buildSearchIntent(survey, answers)
  if (!intent) {
    log.warn('search.skipped', {
      submissionId: logContext.submissionId,
      reason: '问卷里没有专业或目标岗位'
    })
    // 没有可检索的岗位词时不展示检索块，也不把内部规则写进报告。
    return { jobs: [], search: emptyMeta('') }
  }

  const directions = jobDirections(intent.major)
  const useDirections = directions.length > 0 && !intent.roleCanonical
  const plan = buildQueryPlan(intent, directions)
  log.info('search.start', {
    submissionId: logContext.submissionId,
    city: intent.city,
    mode: intent.mode,
    explicitRole: Boolean(intent.roleCanonical),
    directions: directions.length,
    planned: plan.length
  })

  const byUrl = new Map<string, { item: SearchResult; directionKey?: string }>()
  const allErrors: string[] = []
  const queries: string[] = []
  const allUrls = new Set<string>()

  const judged = (): JudgedJob[] => {
    const seenTitles = new Set<string>()
    const output: JudgedJob[] = []
    for (const { item, directionKey } of byUrl.values()) {
      const verdict = judgeJob(item, {
        city: intent.city,
        roleCanonical: intent.roleCanonical,
        directions,
        directionKey,
        useDirections
      })
      const titleKey = `${item.title.replace(/\s+/g, '')}|${item.site}`
      if (verdict.keep && seenTitles.has(titleKey)) continue
      if (verdict.keep) {
        seenTitles.add(titleKey)
        output.push({ item, verdict })
      }
    }
    return output.sort((a, b) => b.verdict.score - a.verdict.score)
  }

  // 只有纯方向检索才要求「每个方向都有原文」；写了岗位词时，主检索达标就可以停。
  const covered = (usable: JudgedJob[]): boolean =>
    !useDirections ||
    directions.every((direction) =>
      usable.some((entry) => entry.verdict.directionKey === direction.key)
    )

  for (let index = 0; index < Math.min(plan.length, QUERY_BUDGET); index += 1) {
    const variant = plan[index]
    if (index > 0) await sleep(500)
    queries.push(variant.query)
    let items: SearchResult[] = []
    try {
      items = await searchOne(variant.query, variant.freshness)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.warn('search.query_failed', {
        submissionId: logContext.submissionId,
        key: variant.key,
        query: variant.query,
        error: message
      })
      allErrors.push(`${variant.query}：${friendlySearchError(message)}`)
      continue
    }

    let passed = 0
    for (const item of items) {
      const key = dedupeKey(item.url)
      allUrls.add(key)
      const existing = byUrl.get(key)
      if (!existing) {
        byUrl.set(key, { item, directionKey: variant.directionKey })
      } else if (!existing.directionKey && variant.directionKey) {
        existing.directionKey = variant.directionKey
      }
      const verdict = judgeJob(item, {
        city: intent.city,
        roleCanonical: intent.roleCanonical,
        directions,
        directionKey: existing?.directionKey ?? variant.directionKey,
        useDirections
      })
      if (verdict.keep) passed += 1
    }
    log.info('search.query_result', {
      submissionId: logContext.submissionId,
      key: variant.key,
      query: variant.query,
      reason: variant.reason,
      returned: items.length,
      passed
    })

    const usable = judged()
    if (usable.length >= 3 && covered(usable)) break
  }

  const usable = judged().filter((entry) => entry.verdict.keep)

  // 方向模式：每个方向最多 2 条，再用方向外结果补到最多 2 条；普通岗位模式取前 3 条。
  const picked: JudgedJob[] = []
  if (useDirections) {
    for (const direction of directions) {
      picked.push(
        ...usable.filter((entry) => entry.verdict.directionKey === direction.key).slice(0, 2)
      )
    }
    const rest = usable.filter(
      (entry) =>
        !picked.some(
          (pickedItem) => dedupeKey(pickedItem.item.url) === dedupeKey(entry.item.url)
        )
    )
    picked.push(...rest.slice(0, 2))
  } else {
    picked.push(...usable.slice(0, 3))
  }

  const jobs: JobCard[] = picked.map(({ item, verdict }) => ({
    title: cleanJobTitle(item.title),
    company: companyOf(item),
    city: cityInText(`${item.title} ${item.snippet}`),
    salary: salaryOf(item.snippet),
    requirement: requirementOf(item),
    url: item.url,
    date: verdict.date,
    directionKey: verdict.directionKey,
    stale: false,
    fallback: false
  }))

  let error = ''
  if (allErrors.length > 0) error = failureMessage(jobs.length > 0)
  else if (jobs.length === 0) error = '近期没有可核对的招聘原文'

  const sources: ReportSearchSource[] = jobs.map((job) => ({
    title: job.title,
    url: job.url,
    site: job.company,
    date: job.date
  }))

  const dropTotals = new Map<DropReason, number>()
  for (const { item, directionKey } of byUrl.values()) {
    const verdict = judgeJob(item, {
      city: intent.city,
      roleCanonical: intent.roleCanonical,
      directions,
      directionKey,
      useDirections
    })
    if (!verdict.reason) continue
    dropTotals.set(verdict.reason, (dropTotals.get(verdict.reason) ?? 0) + 1)
  }
  const drops = [...dropTotals.entries()]
    .map(([reason, count]) => `${reason}:${count}`)
    .join(',')

  log.info('search.done', {
    submissionId: logContext.submissionId,
    queries: queries.length,
    resultCount: allUrls.size,
    jobs: jobs.length,
    dates: jobs.map((job) => job.date).sort(),
    drops: drops || undefined,
    ms: Date.now() - startedMs,
    error: error || undefined
  })

  return {
    jobs,
    search: {
      configured: true,
      attempted: queries.length > 0,
      queries: [...new Set(queries)],
      error,
      resultCount: allUrls.size,
      searchedAt,
      sources
    }
  }
}
