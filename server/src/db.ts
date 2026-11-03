import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { config } from './env'
import { defaultSurvey } from '../../shared/src/survey'
import { defaultTemplate } from '../../shared/src/template'
import { defaultReportSkill } from '../../shared/src/ai'
import type { ReportTemplate, Survey } from '../../shared/src/types'

fs.mkdirSync(config.dataDir, { recursive: true })

export const db = new DatabaseSync(path.join(config.dataDir, 'vesta.db'))

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS surveys (
    id TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL DEFAULT '',
    survey_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    opened_at TEXT,
    submitted_at TEXT,
    expires_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
  CREATE INDEX IF NOT EXISTS idx_invites_created ON invites(created_at DESC);

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    invite_id TEXT NOT NULL UNIQUE,
    survey_id TEXT NOT NULL,
    answers TEXT NOT NULL,
    scores TEXT NOT NULL,
    total REAL NOT NULL,
    tier TEXT NOT NULL,
    timing TEXT NOT NULL DEFAULT '{}',
    overrides TEXT NOT NULL DEFAULT '{}',
    contact_status TEXT NOT NULL DEFAULT 'new',
    admin_notes TEXT NOT NULL DEFAULT '',
    claimed_at TEXT,
    wechat_enc TEXT,
    slots TEXT,
    ai_status TEXT NOT NULL DEFAULT 'pending',
    ai_report TEXT,
    ai_error TEXT NOT NULL DEFAULT '',
    ai_attempts INTEGER NOT NULL DEFAULT 0,
    ai_meta TEXT NOT NULL DEFAULT '{}',
    ai_started_at TEXT,
    ai_finished_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invite_id TEXT,
    type TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

function ensureSubmissionColumns(): void {
  const columns = new Set(
    (
      db.prepare('PRAGMA table_info(submissions)').all() as { name: string }[]
    ).map((column) => column.name)
  )
  const additions: [string, string][] = [
    ['ai_status', "TEXT NOT NULL DEFAULT 'pending'"],
    ['ai_report', 'TEXT'],
    ['ai_error', "TEXT NOT NULL DEFAULT ''"],
    ['ai_attempts', 'INTEGER NOT NULL DEFAULT 0'],
    ['ai_meta', "TEXT NOT NULL DEFAULT '{}'"],
    ['ai_started_at', 'TEXT'],
    ['ai_finished_at', 'TEXT']
  ]
  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE submissions ADD COLUMN ${name} ${definition}`)
    }
  }
}

ensureSubmissionColumns()

export function now(): string {
  return new Date().toISOString()
}

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value)
}

// 后台同一时间只保留一个有效登录会话，存在 settings 里以便重启后仍然有效。
export function getActiveAdminSession(): string | null {
  return getSetting('admin_session')
}

export function setActiveAdminSession(sessionId: string): void {
  setSetting('admin_session', sessionId)
}

export function clearActiveAdminSession(): void {
  db.prepare("DELETE FROM settings WHERE key = 'admin_session'").run()
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`
}

function seed(): void {
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
  if (!getSetting('report_skill')) {
    setSetting('report_skill', defaultReportSkill)
  }
}

seed()

function insertAfter(questions: Survey['questions'], afterId: string, question: Survey['questions'][number]) {
  const index = questions.findIndex((item) => item.id === afterId)
  if (index >= 0) questions.splice(index + 1, 0, question)
  else questions.push(question)
}

function upgradeSurvey(survey: Survey): { survey: Survey; changed: boolean } {
  const questions = [...survey.questions]
  let changed = false

  const canonical = defaultSurvey.questions
  const profileAdditions: [string, string][] = [
    ['a8', 'a7'],
    ['a9', 'a8'],
    ['a10', 'a9'],
    ['a11', 'a10'],
    ['a12', 'a11'],
    ['a14', 'a12']
  ]
  for (const [id, afterId] of profileAdditions) {
    const next = canonical.find((q) => q.id === id)
    if (next && !questions.some((q) => q.id === id)) {
      insertAfter(questions, afterId, next)
      changed = true
    }
  }

  // A8 原来只收城市和岗位，现在补上“去的原因”。
  const a8 = questions.find((q) => q.id === 'a8')
  const canonicalA8 = canonical.find((q) => q.id === 'a8')
  if (a8 && canonicalA8?.fields) {
    if (
      a8.title === '你理想的第一份工作，在哪座城市、做什么' ||
      (a8.fields?.length ?? 0) < canonicalA8.fields.length
    ) {
      a8.title = canonicalA8.title
      a8.hint = canonicalA8.hint
      a8.fields = canonicalA8.fields
      changed = true
    }
  }

  // A9 的旧选项把“考公考编”和“教师招聘”并列，两者有重合；改为公务员 / 事业单位两档。
  const a9 = questions.find((q) => q.id === 'a9')
  const canonicalA9 = canonical.find((q) => q.id === 'a9')
  if (a9 && canonicalA9) {
    const labels = (a9.options ?? []).map((option) => option.label)
    if (
      labels.includes('考公考编') ||
      labels.includes('教师招聘') ||
      labels.includes('事业单位（非教师）')
    ) {
      a9.options = canonicalA9.options
      changed = true
    }
    if (a9.hint === '单选，不计分。教师招聘和考研不冲突，按现在最优先的一项选') {
      a9.hint = canonicalA9.hint
      changed = true
    }
  }

  const d1a = canonical.find((q) => q.id === 'd1a')
  if (d1a && !questions.some((q) => q.id === 'd1a')) {
    insertAfter(questions, 'd4', d1a)
    changed = true
  }

  const a10 = questions.find((q) => q.id === 'a10')
  const canonicalA10 = canonical.find((q) => q.id === 'a10')
  if (a10 && canonicalA10?.options) {
    const labels = (a10.options ?? []).map((option) => option.label)
    if (labels.includes('核实升学路线') || labels.includes('建立稳定学习安排')) {
      a10.options = canonicalA10.options
      a10.otherLabel = canonicalA10.otherLabel
      a10.otherPlaceholder = canonicalA10.otherPlaceholder
      changed = true
    }
  }

  for (const id of ['c1', 'c2']) {
    const next = canonical.find((q) => q.id === id)
    if (!next) continue
    const index = questions.findIndex((q) => q.id === id)
    if (index === -1) {
      const dIndex = questions.findIndex((q) => q.groupId === 'd')
      questions.splice(dIndex === -1 ? questions.length : dIndex, 0, next)
      changed = true
    } else if (questions[index].type !== next.type) {
      questions[index] = next
      changed = true
    }
  }

  // C2 旧的提示语说“1 分是不缺，5 分是缺得明显”，和实际要表达的极性相反。
  // 只替换这一版默认文案，不改管理员自己改过的内容。
  const c2 = questions.find((q) => q.id === 'c2')
  const canonicalC2 = canonical.find((q) => q.id === 'c2')
  if (c2 && canonicalC2) {
    if (
      c2.hint === '每一项都打 1 到 5 分：1 分是不缺，5 分是缺得很明显。这组分数会按比重计入总分'
    ) {
      c2.hint = canonicalC2.hint
      changed = true
    }
    if (!c2.anchors && canonicalC2.anchors) {
      c2.anchors = canonicalC2.anchors
      changed = true
    }
  }

  const c1 = questions.find((q) => q.id === 'c1')
  const canonicalC1 = canonical.find((q) => q.id === 'c1')
  if (c1 && canonicalC1 && !c1.anchors && canonicalC1.anchors) {
    c1.anchors = canonicalC1.anchors
    changed = true
  }

  for (const removedId of ['a5', 'a13', 'a15', 'c3', 'd5']) {
    const index = questions.findIndex((q) => q.id === removedId)
    if (index >= 0) {
      questions.splice(index, 1)
      changed = true
    }
  }

  if (survey.estimatedMinutes === 5) {
    survey = { ...survey, estimatedMinutes: defaultSurvey.estimatedMinutes }
    changed = true
  }

  const groupC = survey.groups.find((group) => group.id === 'c')
  const groups =
    groupC?.subtitle === '没有标准答案，选你真正相信的'
      ? survey.groups.map((group) =>
          group.id === 'c'
            ? { ...group, subtitle: '每一项都按 1 到 5 分打分，分数会计入报告判定' }
            : group
        )
      : survey.groups
  if (groups !== survey.groups) changed = true

  return {
    survey: changed ? { ...survey, questions, groups } : survey,
    changed
  }
}

function upgradeTemplate(template: ReportTemplate): { template: ReportTemplate; changed: boolean } {
  const before = JSON.stringify(template)
  const next = JSON.parse(before) as ReportTemplate & {
    copy: ReportTemplate['copy'] & { hero?: { quote?: string } }
  }

  if (!next.modules.some((module) => module.key === 'target')) {
    const heroIndex = next.modules.findIndex((module) => module.key === 'hero')
    next.modules.splice(heroIndex === -1 ? 0 : heroIndex + 1, 0, {
      key: 'target',
      enabled: true
    })
  }

  next.copy.target = {
    ...defaultTemplate.copy.target,
    ...(next.copy.target ?? {}),
    salaryBands: {
      ...defaultTemplate.copy.target.salaryBands,
      ...(next.copy.target?.salaryBands ?? {})
    }
  }

  next.copy.cognition = {
    ...defaultTemplate.copy.cognition,
    ...(next.copy.cognition ?? {}),
    options: {
      ...defaultTemplate.copy.cognition.options,
      ...(next.copy.cognition?.options ?? {})
    }
  }

  // 旧版认知模块是按“选一个最重要的因素”写的，变量和判定方式都已过时。
  // 只替换确定是旧版默认文案的字段，保留管理员自己改过的内容。
  const cognition = next.copy.cognition
  const legacy: Partial<Record<'title' | 'intro' | 'compare' | 'needLine' | 'closing', string[]>> = {
    title: ['你怎么看，和你实际缺什么'],
    intro: ['你把最关键的因素选成了「{{choice}}」，下面只把两个回答放在一起，不下结论'],
    compare: [
      '而你在「{{low}}」上打了 {{lowScore}} 分，是全卷最低的一项',
      '你在「{{top}}」上给了 {{topWeight}} 分，但这一项的实际得分是 {{topScore}} 分。'
    ],
    needLine: [
      '你在「{{need}}」上打的缺口权重最高（{{needWeight}} 分），所以它在总分里占了更高的比重，这次判定按这个权重计算。',
      '你在「{{need}}」上打的分数最低（{{needWeight}} 分），是五项里最缺的一项，所以它在总分里占了更高的比重，这次判定按这个权重计算。'
    ],
    closing: ['如果这两件事都成立，你打算先动哪一个']
  }
  for (const key of ['title', 'intro', 'compare', 'needLine', 'closing'] as const) {
    const current = cognition[key]
    if (
      legacy[key]?.includes(current) ||
      (key === 'intro' && current.includes('{{choice}}')) ||
      (key === 'compare' && /{{(low|lowScore)}}/.test(current))
    ) {
      cognition[key] = defaultTemplate.copy.cognition[key]
    }
  }

  if (next.copy.hero && 'quote' in next.copy.hero) {
    delete next.copy.hero.quote
  }

  if (next.theme.brand === 'Vesta') next.theme.brand = ''

  const footer = next.copy.footer as { note?: string; line1?: string; line2?: string } | undefined
  next.copy.footer = {
    note:
      !footer?.note || footer.note === '仅用于个人参考'
        ? defaultTemplate.copy.footer.note
        : footer.note
  }

  // 旧版领取文案默认“填完就能约到”，实际上要看时间安排，且约上才免费。
  // 只替换确认是旧默认值的字段，保留管理员自己改过的内容。
  const claim = next.copy.claim
  if (claim) {
    const legacyClaim: Partial<Record<keyof typeof claim, string[]>> = {
      title: ['领取一次免费规划'],
      description: ['留两个你方便的时间段和微信号，我会按顺序联系你，一次约四十分钟'],
      freeNote: [
        '这是一次免费的现状梳理，不代表任何课程推销。你不报课，这次梳理照样做',
        '如果时间合适，这次梳理是免费的，也不代表任何课程推销；约不上也不会向你收费。'
      ],
      submit: ['提交'],
      successTitle: ['收到了'],
      successBody: ['我会在两天内加你，按你留的时间段约']
    }
    for (const key of Object.keys(legacyClaim) as (keyof typeof claim)[]) {
      if (legacyClaim[key]?.includes(claim[key])) {
        claim[key] = defaultTemplate.copy.claim[key]
      }
    }
  }

  // 家庭支持不是学生能自己补的能力项，旧版“补家庭支持”的说法不再使用。
  const b8 = next.dimensions?.b8
  if (b8) {
    if (b8.gap?.what === '一次把规划讲清楚的沟通') {
      b8.gap.what = defaultTemplate.dimensions.b8.gap.what
    }
    if (
      b8.gap?.how === '用具体数字和步骤跟家里说明你要做什么、需要多少支持、多久能看到反馈'
    ) {
      b8.gap.how = defaultTemplate.dimensions.b8.gap.how
    }
    if (b8.gap?.when === '下次回家前准备好') {
      b8.gap.when = defaultTemplate.dimensions.b8.gap.when
    }
    if (b8.action30 === '把你的规划写成一页纸，找家里认真聊一次') {
      b8.action30 = defaultTemplate.dimensions.b8.action30
    }
  }

  return {
    template: next,
    changed: JSON.stringify(next) !== before
  }
}

// 未改过的默认 Skill 才自动升级；管理员自己编辑过的内容保持原样。
const LEGACY_SKILL_HASHES = new Set([
  '76d1851d6dcf5cb6a41f50e2f8f9890fdb2733f7f848b9193efcaca0ade62349'
])

function migrateReportSkill(): void {
  const current = getSetting('report_skill')
  if (!current) return
  const hash = crypto.createHash('sha256').update(current).digest('hex')
  if (LEGACY_SKILL_HASHES.has(hash)) setSetting('report_skill', defaultReportSkill)
}

function migrate(): void {
  migrateReportSkill()
  const surveyId = getSetting('active_survey')
  if (surveyId) {
    const row = db.prepare('SELECT version, data FROM surveys WHERE id = ?').get(surveyId) as
      | { version: number; data: string }
      | undefined
    if (row) {
      try {
        const current = JSON.parse(row.data) as Survey
        const result = upgradeSurvey(current)
        if (result.changed) {
          const version = Math.max(current.version, row.version, 0) + 1
          const survey = { ...result.survey, version }
          db.prepare('UPDATE surveys SET version = ?, data = ? WHERE id = ?').run(
            version,
            JSON.stringify(survey),
            surveyId
          )
        }
      } catch {
        // 数据损坏时保持原样，管理员可以重新发布问卷
      }
    }
  }

  const raw = getSetting('report_template')
  if (!raw) return
  try {
    const current = JSON.parse(raw) as ReportTemplate
    const result = upgradeTemplate(current)
    if (result.changed) setSetting('report_template', JSON.stringify(result.template))
  } catch {
    // 同上，保留原始数据
  }
}

migrate()

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
  const next: Survey = { ...survey, id, version }

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

export function getTemplate(): ReportTemplate {
  const raw = getSetting('report_template')
  if (!raw) return defaultTemplate
  try {
    return JSON.parse(raw) as ReportTemplate
  } catch {
    return defaultTemplate
  }
}

export function saveTemplate(template: ReportTemplate): void {
  setSetting('report_template', JSON.stringify(template))
}

export function getReportSkill(): string {
  return getSetting('report_skill')?.trim() || defaultReportSkill
}

export function saveReportSkill(skill: string): void {
  setSetting('report_skill', skill)
}

export function recordEvent(inviteId: string | null, type: string, payload: unknown = {}): void {
  try {
    db.prepare('INSERT INTO events (invite_id, type, payload, created_at) VALUES (?, ?, ?, ?)').run(
      inviteId,
      type,
      JSON.stringify(payload ?? {}),
      now()
    )
  } catch {
    // 埋点失败不影响主流程
  }
}
