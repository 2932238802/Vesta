import { defaultSurvey } from '../../../../shared/src/survey'
import { defaultTemplate } from '../../../../shared/src/template'
import { db } from '../connection'
import { getSetting, now, setSetting } from '../core'

export function seed(): void {
  const count = db.prepare('SELECT COUNT(*) AS count FROM surveys').get() as
    | { count: number }
    | undefined
  if (!count?.count) {
    db.prepare('INSERT INTO surveys (id, version, data, created_at) VALUES (?, ?, ?, ?)').run(
      defaultSurvey.id,
      1,
      JSON.stringify(defaultSurvey),
      now()
    )
    setSetting('active_survey', defaultSurvey.id)
  }
  if (!getSetting('report_template')) {
    setSetting('report_template', JSON.stringify(defaultTemplate))
  }
}
