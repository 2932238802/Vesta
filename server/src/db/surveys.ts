import { defaultSurvey } from '../../../shared/src/survey'
import type { Survey } from '../../../shared/src/types'
import { db } from './connection'
import { getSetting, newId, now, setSetting } from './core'

export function getSurvey(id: string): Survey | null {
  const row = db.prepare('SELECT data FROM surveys WHERE id = ?').get(id) as
    | { data: string }
    | undefined
  if (!row) return null
  try {
    return JSON.parse(row.data) as Survey
  } catch {
    return null
  }
}

export function getActiveSurvey(): Survey {
  const id = getSetting('active_survey')
  const survey = id ? getSurvey(id) : null
  if (survey) return survey
  db.prepare('INSERT OR IGNORE INTO surveys (id, version, data, created_at) VALUES (?, ?, ?, ?)').run(
    defaultSurvey.id,
    1,
    JSON.stringify(defaultSurvey),
    now()
  )
  setSetting('active_survey', defaultSurvey.id)
  return defaultSurvey
}

export function publishSurvey(survey: Survey): Survey {
  const current = getActiveSurvey()
  const version = Math.max(current.version, survey.version || 0) + 1
  const id = newId('survey')
  const next: Survey = { ...survey, id, version, customized: true }

  db.exec('BEGIN')
  try {
    db.prepare('INSERT INTO surveys (id, version, data, created_at) VALUES (?, ?, ?, ?)').run(
      id,
      version,
      JSON.stringify(next),
      now()
    )
    setSetting('active_survey', id)
    db.prepare(
      'UPDATE invites SET survey_id = ? WHERE id NOT IN (SELECT invite_id FROM submissions)'
    ).run(id)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return next
}
