import { initSchema } from './db/schema'
import { runMigrations } from './db/migrations'

initSchema()
runMigrations()

export { db } from './db/connection'
export { now, getSetting, setSetting, newId, recordEvent } from './db/core'
export {
  createAdminSession,
  getAdminSession,
  deleteAdminSession,
  clearExpiredAdminSessions
} from './db/sessions'
export {
  getSurvey,
  getActiveSurvey,
  publishSurvey,
  normalizeReportMode,
  surveyReportMode
} from './db/surveys'
export type { ReportMode } from './db/surveys'
export { getTemplate, saveTemplate } from './db/templates'
export {
  DEFAULT_REPORT_SKILL_ID,
  getReportSkillState,
  getReportSkill,
  getDocReportSkill,
  createReportSkillTemplate,
  updateReportSkillTemplate,
  deleteReportSkillTemplate,
  activateReportSkill
} from './db/skill'
export type { ReportSkillTemplate, ReportSkillSource } from './db/skill'
