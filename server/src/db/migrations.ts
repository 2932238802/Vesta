import {
  backfillEventFacts
} from './events'
import { migrateLegacyAdminSession, clearExpiredAdminSessions } from './sessions'
import { migrateReportSkill, migrateReportSkillTemplates } from './skill'
import { ensureRosterGroupSchema, migrateRosterGroupsV2 } from './roster-groups'
import { seedScorelineSources } from '../score-lines/sources'
import {
  ensureInviteColumns,
  ensureSubmissionColumns,
  ensureConsultColumns,
  ensureScoreLineColumns,
  backfillSubmissionReportModes
} from './migrations/columns'
import { seed } from './migrations/seed'
import { migrateSurvey } from './migrations/survey'
import { migrateTemplate } from './migrations/template'
import { seedConsultQuotes } from './migrations/consult-quotes'
import { migrateScoreLineV1 } from './migrations/scoreline'
import { migrateScoreLineAutoReview } from './migrations/scoreline-auto-review'
import { migrateSchoolProgramsKey } from './migrations/school-programs-key'

export function runMigrations(): void {
  ensureInviteColumns()
  ensureSubmissionColumns()
  ensureRosterGroupSchema()
  migrateRosterGroupsV2()
  ensureConsultColumns()
  // 先把历史事件沉淀成漏斗事实，再允许后续按保留期清理原始事件。
  backfillEventFacts()
  migrateLegacyAdminSession()
  clearExpiredAdminSessions()
  seed()
  migrateReportSkill()
  migrateReportSkillTemplates()
  migrateSurvey()
  migrateTemplate()
  // 放在问卷 / 模板升级之后：回填读的是问卷当前落库的数据，和旧读路径在同一时刻看到的一致。
  backfillSubmissionReportModes()
  migrateScoreLineV1()
  ensureScoreLineColumns()
  seedScorelineSources()
  // v2.06：存量 pending 按置信度自动落定 + 招生计划唯一键补 major_name；均幂等。
  migrateScoreLineAutoReview()
  migrateSchoolProgramsKey()
  seedConsultQuotes()
}
