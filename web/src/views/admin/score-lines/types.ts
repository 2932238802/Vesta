import type { ExamType, School, SchoolProgram } from '@/api'

export interface ScoreLineFilterState {
  exam: ExamType
  year: number
  province: string
  category: string
  track: string
  school: School | null
  program: SchoolProgram | null
}

export function emptyFilters(): ScoreLineFilterState {
  return {
    exam: 'upgrade',
    year: new Date().getFullYear(),
    province: '',
    category: '',
    track: '',
    school: null,
    program: null
  }
}

export function yearOptions(): number[] {
  const current = new Date().getFullYear()
  return Array.from({ length: 11 }, (_item, index) => current - index)
}
