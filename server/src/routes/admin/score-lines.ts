import { Router } from 'express'
import type { ExamType } from '../../../../shared/src/score-line'
import { isExamType } from '../../../../shared/src/score-line'
import { noStore } from '../../auth'
import { log } from '../../log'
import { scoreLineFacets } from '../../score-lines/facets'
import { getProgram, listPrograms } from '../../score-lines/program-store'
import { queryScoreLines } from '../../score-lines/query'
import { getSchool, listSchools } from '../../score-lines/store'
import { clampString } from '../../util'

export const scoreLinesRouter = Router()

function examOf(value: unknown): ExamType | null {
  const raw = clampString(value, 20)
  return isExamType(raw) ? raw : null
}

function yearOf(value: unknown): number | null {
  const raw = Number(clampString(value, 10))
  return Number.isInteger(raw) && raw >= 2000 && raw <= 2100 ? raw : null
}

scoreLinesRouter.get('/score-lines/schools', (req, res) => {
  noStore(res)
  const q = clampString(req.query.q, 80)
  const province = clampString(req.query.province, 20)
  const level = clampString(req.query.level, 20)
  const exam = examOf(req.query.exam)
  const year = yearOf(req.query.year)
  const limit = Number(clampString(req.query.limit, 3)) || 20
  res.json({
    schools: listSchools({
      q,
      province,
      level,
      exam: exam ?? undefined,
      year: year ?? undefined,
      limit
    })
  })
})

scoreLinesRouter.get('/score-lines/programs', (req, res) => {
  noStore(res)
  const schoolId = clampString(req.query.schoolId, 100)
  const exam = examOf(req.query.exam)
  const year = yearOf(req.query.year)
  if (!schoolId || !getSchool(schoolId)) {
    res.status(404).json({ error: '没有找到这所院校' })
    return
  }
  if (!exam || !year) {
    res.status(400).json({ error: '请选择考试类型和年份' })
    return
  }
  res.json({
    programs: listPrograms({
      schoolId,
      exam,
      year,
      q: clampString(req.query.q, 80),
      limit: Number(clampString(req.query.limit, 3)) || 50
    })
  })
})

scoreLinesRouter.get('/score-lines/query', (req, res) => {
  noStore(res)
  const exam = examOf(req.query.exam)
  const year = yearOf(req.query.year)
  if (!exam || !year) {
    res.status(400).json({ error: '请选择考试类型和年份' })
    return
  }
  let schoolId = clampString(req.query.schoolId, 100)
  const programId = clampString(req.query.programId, 100)
  if (programId) {
    const program = getProgram(programId)
    if (!program) {
      res.status(404).json({ error: '没有找到这个专业' })
      return
    }
    if (schoolId && program.schoolId !== schoolId) {
      res.status(400).json({ error: '专业不属于所选院校' })
      return
    }
    schoolId = program.schoolId
  }
  if (schoolId && !getSchool(schoolId)) {
    res.status(404).json({ error: '没有找到这所院校' })
    return
  }
  res.json(
    queryScoreLines({
      exam,
      year,
      province: clampString(req.query.province, 20),
      region: clampString(req.query.region, 10),
      schoolId,
      programId,
      category: clampString(req.query.category, 40),
      track: clampString(req.query.track, 60)
    })
  )
})

scoreLinesRouter.get('/score-lines/facets', (req, res) => {
  noStore(res)
  const exam = examOf(req.query.exam)
  const year = yearOf(req.query.year)
  if (!exam || !year) {
    res.status(400).json({ error: '请选择考试类型和年份' })
    return
  }
  const facets = scoreLineFacets({
    exam,
    year,
    province: clampString(req.query.province, 20),
    region: clampString(req.query.region, 10),
    category: clampString(req.query.category, 40),
    track: clampString(req.query.track, 60)
  })
  log.debug('scoreline.facets', {
    exam,
    scope: facets.scope,
    year,
    province: facets.scope === 'provincial' ? clampString(req.query.province, 20) : '',
    region: facets.region,
    categoryCount: facets.category.length,
    trackCount: facets.track.length
  })
  res.json(facets)
})
