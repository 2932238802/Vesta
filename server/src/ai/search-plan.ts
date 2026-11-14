import type { JobDirection } from '../../../shared/src/job-map'

export interface QuerySpec {
  key?: string
  query: string
  /** 博查时间窗：主检索用一年，补位用一个月；不传时沿用博查默认 */
  freshness?: string
  /** 补位结果只作要求结构参考，不参与门槛统计 */
  fallback?: boolean
}

export function buildSearchSpecs(input: {
  city: string
  role: string
  directions: JobDirection[]
  useDirections: boolean
  year: number
}): QuerySpec[] {
  const place = input.city ? `${input.city} ` : ''
  // 年份固定取检索当年（2026 年搜「2026 届」），不按年级推算毕业届别。
  const fresh = (keyword: string, key?: string): QuerySpec => ({
    key,
    query: `${place}${keyword} ${input.year} 届 招聘`.trim(),
    freshness: 'oneYear'
  })
  const specs: QuerySpec[] = []
  if (input.useDirections) {
    input.directions.forEach((direction) => {
      specs.push(fresh(direction.query, direction.key))
    })
  } else {
    specs.push(fresh(input.role))
  }
  return specs
}
