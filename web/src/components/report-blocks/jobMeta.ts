import type { JobCard } from '@shared/types'
import { formatDate } from '../../format'

export function jobMeta(job: JobCard): string {
  const parts: string[] = []
  if (job.company) parts.push(`来源：${job.company}`)
  if (job.city) parts.push(job.city)
  if (job.salary) parts.push(job.salary)
  if (job.date) parts.push(`发布：${formatDate(job.date, false)}`)
  return parts.join(' · ')
}
