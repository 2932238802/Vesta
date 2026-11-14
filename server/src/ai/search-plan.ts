import type { Answers, Survey } from '../../../shared/src/types'
import { cleanRole, type JobDirection } from '../../../shared/src/job-map'
import { resolveTargetCity } from '../../../shared/src/doc'

/** 每份报告最多 4 次博查外呼。 */
export const QUERY_BUDGET = 4

export interface SearchIntent {
  city: string
  mode: 'campus' | 'internship'
  /** 清洗后的岗位词；空串表示没写清岗位，走专业方向 */
  roleCanonical: string
  /** Q6 原话，只用于报告展示，不进检索词 */
  roleRaw: string
  major: string
  grade: number
  freshness: 'oneYear'
  cutoffMonths: number
}

export interface QueryVariant {
  key: string
  query: string
  directionKey?: string
  /** 这一级为什么搜；进后台日志 */
  reason: string
  freshness: 'oneYear'
}

const GRADE_NUMBER: Record<string, number> = { 大一: 1, 大二: 2, 大三: 3, 大四: 4 }

function gradeOf(survey: Survey, answers: Answers): number {
  const question = survey.questions.find((item) => item.id === 'q3')
  const value = answers.q3
  if (typeof value !== 'string') return 0
  const label = question?.options?.find((option) => option.id === value)?.label ?? ''
  return GRADE_NUMBER[label] ?? 0
}

export function buildSearchIntent(survey: Survey, answers: Answers): SearchIntent | null {
  const roleRaw = String(answers.q5a ?? '').trim()
  const roleCanonical = cleanRole(roleRaw)
  const major = String(answers.q2 ?? '').trim()
  if (!roleCanonical && !major) return null
  const grade = gradeOf(survey, answers)
  return {
    city: resolveTargetCity(survey, answers).city,
    mode: grade >= 1 && grade <= 2 ? 'internship' : 'campus',
    roleCanonical,
    roleRaw,
    major,
    grade,
    freshness: 'oneYear',
    cutoffMonths: 12
  }
}

/**
 * 查询计划：变体互不相同，按「通用 → 低年级实习 → 应届生求职网 → 猎聘 → 专业方向」排列。
 * 调用方逐条执行，够 3 条且方向覆盖完整就停，最多 QUERY_BUDGET 次。
 */
export function buildQueryPlan(
  intent: SearchIntent,
  directions: JobDirection[]
): QueryVariant[] {
  const place = intent.city ? `${intent.city} ` : ''
  const role = intent.roleCanonical
  const variants: QueryVariant[] = []
  const add = (
    key: string,
    query: string,
    reason: string,
    directionKey?: string
  ): void => {
    const clean = query.replace(/\s+/g, ' ').trim()
    if (clean) {
      variants.push({ key, query: clean, directionKey, reason, freshness: 'oneYear' })
    }
  }

  if (role) {
    add('primary', `${place}${role} 应届 招聘`, '通用主检索，不写届')
    if (intent.mode === 'internship') add('intern', `${place}${role} 实习`, '低年级实习')
    add('yingjiesheng', `site:yingjiesheng.com ${place}${role} 招聘`, '校招主力来源')
    add('liepin', `site:liepin.com ${place}${role} 招聘`, '社招 / 实习补充')
  }

  directions.forEach((direction) => {
    add(
      direction.key,
      `${place}${direction.query} 招聘`,
      role ? `方向兜底：${direction.name}` : `专业方向：${direction.name}`,
      direction.key
    )
  })

  if (!role && intent.mode === 'internship' && directions[0]) {
    add('intern', `${place}${directions[0].query} 实习`, '低年级实习')
  }

  const seen = new Set<string>()
  return variants.filter((variant) => {
    if (seen.has(variant.query)) return false
    seen.add(variant.query)
    return true
  })
}
