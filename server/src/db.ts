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

  CREATE TABLE IF NOT EXISTS resume_images (
    id TEXT PRIMARY KEY,
    major TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_resume_images_major ON resume_images(major, created_at DESC);

  CREATE TABLE IF NOT EXISTS admin_sessions (
    sid TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

  CREATE TABLE IF NOT EXISTS consult_runs (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    context TEXT NOT NULL DEFAULT '{}',
    path TEXT NOT NULL,
    steps TEXT NOT NULL DEFAULT '[]',
    output TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ready',
    error TEXT NOT NULL DEFAULT '',
    outcome TEXT NOT NULL DEFAULT '',
    outcome_node_id TEXT NOT NULL DEFAULT '',
    target_length INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT '',
    finished_at TEXT,
    outcome_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_consult_runs_created ON consult_runs(created_at DESC);

  CREATE TABLE IF NOT EXISTS consult_run_sections (
    run_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    title TEXT NOT NULL,
    goal TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT NOT NULL DEFAULT '',
    target_chars INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (run_id, seq)
  );
  CREATE INDEX IF NOT EXISTS idx_consult_run_sections_run ON consult_run_sections(run_id, seq);

  CREATE TABLE IF NOT EXISTS consult_purpose_feedback (
    template_id TEXT NOT NULL,
    purpose_key TEXT NOT NULL,
    selected INTEGER NOT NULL DEFAULT 0,
    won INTEGER NOT NULL DEFAULT 0,
    lost INTEGER NOT NULL DEFAULT 0,
    liked INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (template_id, purpose_key)
  );

  CREATE TABLE IF NOT EXISTS consult_collections (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL DEFAULT 'quote',
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_consult_collections_updated ON consult_collections(pinned DESC, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_consult_collections_kind ON consult_collections(kind);
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

function ensureConsultColumns(): void {
  const columns = new Set(
    (db.prepare('PRAGMA table_info(consult_runs)').all() as { name: string }[]).map(
      (column) => column.name
    )
  )
  const additions: [string, string][] = [
    ['target_length', 'INTEGER NOT NULL DEFAULT 0'],
    ['updated_at', "TEXT NOT NULL DEFAULT ''"],
    ['finished_at', 'TEXT'],
    ['mode', "TEXT NOT NULL DEFAULT 'sentence'"],
    ['purpose_template_id', "TEXT NOT NULL DEFAULT ''"],
    ['purpose_path', "TEXT NOT NULL DEFAULT ''"]
  ]
  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE consult_runs ADD COLUMN ${name} ${definition}`)
    }
  }

  const sectionColumns = new Set(
    (db.prepare('PRAGMA table_info(consult_run_sections)').all() as { name: string }[]).map(
      (column) => column.name
    )
  )
  if (!sectionColumns.has('purpose_keys')) {
    db.exec("ALTER TABLE consult_run_sections ADD COLUMN purpose_keys TEXT NOT NULL DEFAULT '[]'")
  }
  const sectionAdditions: [string, string][] = [
    ['module_id', "TEXT NOT NULL DEFAULT ''"],
    ['options_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['selected_option_id', "TEXT NOT NULL DEFAULT ''"],
    ['beats_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['notes', "TEXT NOT NULL DEFAULT ''"],
    ['edited', 'INTEGER NOT NULL DEFAULT 0']
  ]
  for (const [name, definition] of sectionAdditions) {
    if (!sectionColumns.has(name)) {
      db.exec(`ALTER TABLE consult_run_sections ADD COLUMN ${name} ${definition}`)
    }
  }
}

ensureConsultColumns()

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

interface AdminSessionRow {
  sid: string
  username: string
  created_at: string
  expires_at: string
}

export function createAdminSession(sid: string, username: string, expiresAt: string): void {
  clearExpiredAdminSessions()
  db.prepare(
    'INSERT INTO admin_sessions (sid, username, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).run(sid, username, now(), expiresAt)
}

export function getAdminSession(sid: string): AdminSessionRow | null {
  const row = db
    .prepare('SELECT sid, username, created_at, expires_at FROM admin_sessions WHERE sid = ?')
    .get(sid) as AdminSessionRow | undefined
  if (!row) return null
  if (row.expires_at <= now()) {
    deleteAdminSession(sid)
    return null
  }
  return row
}

export function deleteAdminSession(sid: string): void {
  db.prepare('DELETE FROM admin_sessions WHERE sid = ?').run(sid)
}

export function clearExpiredAdminSessions(): void {
  db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(now())
}

function migrateLegacyAdminSession(): void {
  const sessionId = getSetting('admin_session')
  if (!sessionId) return
  const expiresAt = new Date(Date.now() + config.sessionTtl * 1000).toISOString()
  db.prepare(
    'INSERT OR IGNORE INTO admin_sessions (sid, username, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).run(sessionId, config.adminUser, now(), expiresAt)
  db.prepare("DELETE FROM settings WHERE key = 'admin_session'").run()
}

migrateLegacyAdminSession()
clearExpiredAdminSessions()

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
}

seed()

function insertAfter(questions: Survey['questions'], afterId: string, question: Survey['questions'][number]) {
  const index = questions.findIndex((item) => item.id === afterId)
  if (index >= 0) questions.splice(index + 1, 0, question)
  else questions.push(question)
}

/** Q18「上次四级哪部分丢分最多」从单选改成多选；只在题目本身还是默认形态时生效。 */
function patchQ18Multi(questions: Survey['questions']): boolean {
  const q18 = questions.find((q) => q.id === 'q18')
  if (!q18 || q18.type !== 'single') return false
  const labels = (q18.options ?? []).map((option) => option.label)
  const defaults = ['听力', '阅读', '写作翻译', '完形选词', '说不清']
  if (!defaults.every((label) => labels.includes(label))) return false
  q18.type = 'multi'
  return true
}

/** Q21「背单词的情况」从单选改成多选；同样只认默认选项。 */
function patchQ21Multi(questions: Survey['questions']): boolean {
  const q21 = questions.find((q) => q.id === 'q21')
  if (!q21 || q21.type !== 'single') return false
  const labels = (q21.options ?? []).map((option) => option.label)
  const defaults = ['每天背、能记住', '背了忘、忘了背', '考前突击', '基本不背']
  if (!defaults.every((label) => labels.includes(label))) return false
  q21.type = 'multi'
  return true
}

function upgradeSurvey(survey: Survey): { survey: Survey; changed: boolean } {
  // 后台保存过的问卷（运营自己调过选项、加过题）一律不再自动迁移，
  // 否则每次升级都会把她改的选项改回去。要恢复默认，只能重新发布一份默认问卷。
  // 但「题目本身还是默认形态」的结构修正（比如单选改多选）仍然安全应用。
  if (survey.customized) {
    const patched = [...survey.questions]
    const changed = patchQ18Multi(patched) || patchQ21Multi(patched)
    return changed ? { survey: { ...survey, questions: patched }, changed } : { survey, changed: false }
  }

  // 文档版问卷（《规划自测问卷-设计文档》）：以 q1 为标记，旧问卷整份替换。
  // 题目、分组、计分、报告方式全换，不再沿用旧的三段/九维结构。
  if (!survey.questions?.some((q) => q.id === 'q1')) {
    return { survey: { ...defaultSurvey, id: survey.id }, changed: true }
  }

  const questions = [...survey.questions]
  let changed = false

  if (patchQ18Multi(questions)) changed = true
  if (patchQ21Multi(questions)) changed = true

  // Q1 学校档位里的「双一流学科」统一改叫「双一流」。
  const q1 = questions.find((q) => q.id === 'q1')
  const shuangyiliu = q1?.options?.find((option) => option.label === '双一流学科')
  if (shuangyiliu) {
    shuangyiliu.label = '双一流'
    changed = true
  }

  const canonical = defaultSurvey.questions

  // Q7「现在在准备什么」换成新的 9 个选项；只认旧默认那套，避免覆盖运营自己配的。
  const q7 = questions.find((q) => q.id === 'q7')
  const canonicalQ7 = canonical.find((q) => q.id === 'q7')
  if (q7?.options && canonicalQ7?.options) {
    const labels = q7.options.map((option) => option.label)
    const looksDefault =
      labels.includes('四级') && labels.includes('六级') && labels.includes('还没开始')
    if (looksDefault) {
      q7.options = canonicalQ7.options.map((option) => ({ ...option }))
      changed = true
    }
  }

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

  // A1 补「双一流」：只认原来那套默认选项，插在 985/211 后面；
  // 管理员自己改过选项就不动，避免把自定义内容覆盖掉。
  const a1 = questions.find((q) => q.id === 'a1')
  const canonicalA1 = canonical.find((q) => q.id === 'a1')
  if (a1?.options && canonicalA1?.options) {
    const labels = a1.options.map((option) => option.label)
    const syl = canonicalA1.options.find((option) => option.label === '双一流')
    if (
      syl &&
      !labels.includes('双一流') &&
      labels.includes('985 / 211') &&
      labels.includes('双非一本')
    ) {
      const index = a1.options.findIndex((option) => option.label === '985 / 211')
      a1.options.splice(index + 1, 0, { ...syl })
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

  // 英语从“学业基础”里拆出来，成为独立维度 b9。
  const b9 = canonical.find((q) => q.id === 'b9')
  if (b9 && !questions.some((q) => q.id === 'b9')) {
    insertAfter(questions, 'b8', b9)
    changed = true
  }

  const d3 = questions.find((q) => q.id === 'd3')
  if (d3 && d3.dimension === 'b2') {
    d3.dimension = 'b9'
    changed = true
  }

  // 英语独立成 b9 后，B2 的锚点不再用四六级举例，避免同一件事被问三遍。
  const b2 = questions.find((q) => q.id === 'b2')
  const canonicalB2 = canonical.find((q) => q.id === 'b2')
  if (b2?.anchors && canonicalB2?.anchors) {
    if (b2.anchors.low === '四六级都没过，绩点中下，经常担心挂科') {
      b2.anchors.low = canonicalB2.anchors.low
      changed = true
    }
    if (b2.anchors.high === '四级已过、六级在准备或已过，绩点稳定在专业前列') {
      b2.anchors.high = canonicalB2.anchors.high
      changed = true
    }
  }

  const c2Question = questions.find((q) => q.id === 'c2')
  if (
    c2Question?.type === 'matrix' &&
    Array.isArray(c2Question.rows) &&
    !c2Question.rows.some((row) => row.id === 'c2_6')
  ) {
    c2Question.rows.push({ id: 'c2_6', label: '英语', dimension: 'b9' })
    changed = true
  }

  if (!survey.dimensions.some((dimension) => dimension.key === 'b9')) {
    const oldDefaultWeights: Record<string, number> = { b2: 15, b4: 12, b5: 12, b6: 16 }
    const newDefaultWeights: Record<string, number> = { b2: 8, b4: 11, b5: 11, b6: 15 }
    const matchesOldDefaults = Object.entries(oldDefaultWeights).every(
      ([key, weight]) =>
        survey.dimensions.find((dimension) => dimension.key === key)?.weight === weight
    )
    if (matchesOldDefaults) {
      for (const dimension of survey.dimensions) {
        const nextWeight = newDefaultWeights[dimension.key]
        if (typeof nextWeight === 'number') dimension.weight = nextWeight
      }
    }
    survey.dimensions.push({ key: 'b9', name: '英语能力', weight: 10 })
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
    // 兼容旧版本里写死的选项名，统一到新的展示文案。雅思拆成单独一档，这条只剩四六级。
    const englishGoal = a10.options?.find((option) =>
      ['英语考试或使用', '四六级雅思准备', '四级、六级或雅思准备'].includes(option.label)
    )
    if (englishGoal) {
      englishGoal.label = '四级、六级准备'
      changed = true
    }
    const goalOptions = a10.options
    if (goalOptions) {
      const goalLabels = goalOptions.map((option) => option.label)
      const ielts = canonicalA10.options.find((option) => option.label === '雅思准备')
      if (
        ielts &&
        !goalLabels.includes('雅思准备') &&
        goalLabels.includes('四级、六级准备')
      ) {
        const index = goalOptions.findIndex((option) => option.label === '四级、六级准备')
        goalOptions.splice(index + 1, 0, { ...ielts })
        changed = true
      }
    }
    if (a10.notePlaceholder === '例：明年 3 月前拿到六级 500 分；没想清楚也可以写「不知道」') {
      delete a10.notePlaceholder
      changed = true
    }
  }

  // A12 的原因选项以前太笼统，换成能对上 A9 方向、A10 目标的具体处境。
  // 只认旧默认那套，管理员改过就不动；a12_1/4/5/6/8 含义没变，老答卷还能读出来。
  const a12 = questions.find((q) => q.id === 'a12')
  const canonicalA12 = canonical.find((q) => q.id === 'a12')
  if (a12 && canonicalA12) {
    const labels = (a12.options ?? []).map((option) => option.label)
    if (
      a12.options &&
      canonicalA12.options &&
      (labels.includes('已有明确考试或申请节点') ||
        labels.includes('某次经历受到影响') ||
        labels.includes('看到同学行动'))
    ) {
      a12.options = canonicalA12.options.map((option) => ({ ...option }))
      changed = true
    }
    // 已经换成新原因、但还没有「其他」这一档的，补在最后。
    const nextLabels = (a12.options ?? []).map((option) => option.label)
    const otherOption = canonicalA12.options?.find((option) => option.label === '其他')
    if (
      a12.options &&
      otherOption &&
      !nextLabels.includes('其他') &&
      nextLabels.includes('还没想清楚，只是觉得现在该动起来')
    ) {
      a12.options.push({ ...otherOption })
      changed = true
    }
    if (a12.hint === '多选，最多 2 项，不计分') {
      a12.hint = canonicalA12.hint
      changed = true
    }
  }

  // B 组从 1—5 分自评改成若干道客观事实题：旧的整组替换。
  // B 组改成客观事实题：旧版（1—5 分自评，或只问一题的过渡版）整组替换。
  // 用 b1a 当新版标记：B 组里没有 b1a，就认为它还是旧版，整组换掉。
  const hasNewB = questions.some((q) => q.groupId === 'b' && q.id === 'b1a')
  const freshB = canonical
    .filter((q) => q.groupId === 'b')
    .map((q) => ({ ...q, options: q.options?.map((option) => ({ ...option })) }))
  if (!hasNewB && freshB.length > 0) {
    const kept = questions.filter((q) => q.groupId !== 'b')
    const insertAt = kept.findIndex((q) => q.groupId === 'c')
    kept.splice(insertAt === -1 ? kept.length : insertAt, 0, ...freshB)
    questions.splice(0, questions.length, ...kept)
    changed = true
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

  for (const removedId of ['a5', 'a13', 'a15', 'a16', 'c3', 'd5', 'q7a', 'q17b']) {
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

  // 分组说明：C 组旧文案，B 组从“打 1—5 分”改成“选实际情况”。
  const groups = survey.groups.map((group) => {
    if (group.id === 'c' && group.subtitle === '没有标准答案，选你真正相信的') {
      return { ...group, subtitle: '每一项都按 1 到 5 分打分，分数会计入报告判定' }
    }
    if (
      group.id === 'b' &&
      (group.subtitle === '每题 1 到 5 分，按第一反应选，不用想太久' ||
        group.subtitle === '每题选一个最接近你现状的选项，不用纠结对错')
    ) {
      return { ...group, subtitle: '每题都选实际情况，选项都是可以核对的事实' }
    }
    if (group.id === 'a' && group.subtitle === '这些信息只用来调整参照线，学校类型不计入总分') {
      // 学校档位现在在 B 组计分，这句「不计入总分」已经不准了。
      return { ...group, subtitle: '先补背景和目标，没有对错，按真实情况选' }
    }
    return group
  })
  if (groups.some((group, index) => group !== survey.groups[index])) changed = true

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
      description: [
        '留两个你方便的时间段和微信号，我会按顺序联系你，一次约四十分钟',
        '留下两个你方便的时间段和微信号。我会先看自己的时间安排，不一定都能约上；能约上的话，一次聊四十分钟左右。'
      ],
      freeNote: [
        '这是一次免费的现状梳理，不代表任何课程推销。你不报课，这次梳理照样做',
        '如果时间合适，这次梳理是免费的，也不代表任何课程推销；约不上也不会向你收费。'
      ],
      submit: ['提交'],
      successTitle: ['收到了'],
      successBody: [
        '我会在两天内加你，按你留的时间段约',
        '我会尽快看时间安排：有合适的时间就加你确认；没有合适时间会直接告诉你，不会收费。'
      ]
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

  // 英语成为独立维度后，旧模板需要补上 b9 的话术，雷达图标题也从八项改为九项。
  if (!next.dimensions.b9) {
    next.dimensions.b9 = defaultTemplate.dimensions.b9
  }
  if (next.copy.radar?.title === '八项现状') {
    next.copy.radar.title = defaultTemplate.copy.radar.title
  }

  return {
    template: next,
    changed: JSON.stringify(next) !== before
  }
}

// 未改过的默认 Skill 才自动升级；管理员自己编辑过的内容保持原样。
const LEGACY_SKILL_HASHES = new Set([
  '76d1851d6dcf5cb6a41f50e2f8f9890fdb2733f7f848b9193efcaca0ade62349',
  // v0.1 的默认 Skill：把英语放在“条件项”位置，已被新规则替换。
  '9671baff4538eef9fcda41afa77a77ddeb92c046189abc6bf16306df0ce1858e'
])

function migrateReportSkill(): void {
  const current = getSetting('report_skill')
  if (!current) return
  const hash = crypto.createHash('sha256').update(current).digest('hex')
  if (LEGACY_SKILL_HASHES.has(hash)) setSetting('report_skill', defaultReportSkill)
}

export const DEFAULT_REPORT_SKILL_ID = 'default'

export interface ReportSkillTemplate {
  id: string
  name: string
  skill: string
  createdAt: string
  updatedAt: string
}

const SKILL_TEMPLATES_KEY = 'report_skill_templates_v1'
const ACTIVE_SKILL_KEY = 'report_skill_active_v1'

function readSkillTemplates(): ReportSkillTemplate[] {
  const raw = getSetting(SKILL_TEMPLATES_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ReportSkillTemplate => {
      if (!item || typeof item !== 'object') return false
      const value = item as Record<string, unknown>
      return (
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        typeof value.skill === 'string' &&
        typeof value.createdAt === 'string' &&
        typeof value.updatedAt === 'string'
      )
    })
  } catch {
    return []
  }
}

function writeSkillTemplates(templates: ReportSkillTemplate[]): void {
  setSetting(SKILL_TEMPLATES_KEY, JSON.stringify(templates))
}

function migrateReportSkillTemplates(): void {
  if (getSetting(SKILL_TEMPLATES_KEY)) return
  const current = getSetting('report_skill')?.trim() ?? ''
  const templates: ReportSkillTemplate[] = []
  let activeId = DEFAULT_REPORT_SKILL_ID
  if (current && current !== defaultReportSkill) {
    const timestamp = now()
    const template: ReportSkillTemplate = {
      id: newId('skill'),
      name: '原有自定义规则',
      skill: current,
      createdAt: timestamp,
      updatedAt: timestamp
    }
    templates.push(template)
    activeId = template.id
  }
  writeSkillTemplates(templates)
  setSetting(ACTIVE_SKILL_KEY, activeId)
}

function migrate(): void {
  migrateReportSkill()
  migrateReportSkillTemplates()
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
          console.log(`[db] 问卷已升级到 v${version}（${survey.questions.length} 题）`)
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

export function getReportSkillState(): {
  templates: ReportSkillTemplate[]
  activeId: string
} {
  const templates = readSkillTemplates()
  const storedActiveId = getSetting(ACTIVE_SKILL_KEY) || DEFAULT_REPORT_SKILL_ID
  const activeId =
    storedActiveId === DEFAULT_REPORT_SKILL_ID ||
    templates.some((template) => template.id === storedActiveId)
      ? storedActiveId
      : DEFAULT_REPORT_SKILL_ID
  if (activeId !== storedActiveId) setSetting(ACTIVE_SKILL_KEY, activeId)
  return { templates, activeId }
}

export function getReportSkill(): string {
  const { templates, activeId } = getReportSkillState()
  return (
    templates.find((template) => template.id === activeId)?.skill.trim() || defaultReportSkill
  )
}

export function createReportSkillTemplate(name: string, skill: string): ReportSkillTemplate {
  const templates = readSkillTemplates()
  const timestamp = now()
  const template: ReportSkillTemplate = {
    id: newId('skill'),
    name,
    skill,
    createdAt: timestamp,
    updatedAt: timestamp
  }
  writeSkillTemplates([...templates, template])
  return template
}

export function updateReportSkillTemplate(
  id: string,
  name: string,
  skill: string
): ReportSkillTemplate | null {
  const templates = readSkillTemplates()
  const index = templates.findIndex((template) => template.id === id)
  if (index < 0) return null
  const template: ReportSkillTemplate = {
    ...templates[index],
    name,
    skill,
    updatedAt: now()
  }
  templates[index] = template
  writeSkillTemplates(templates)
  return template
}

export function deleteReportSkillTemplate(id: string): boolean {
  const templates = readSkillTemplates()
  const next = templates.filter((template) => template.id !== id)
  if (next.length === templates.length) return false
  writeSkillTemplates(next)
  if (getSetting(ACTIVE_SKILL_KEY) === id) setSetting(ACTIVE_SKILL_KEY, DEFAULT_REPORT_SKILL_ID)
  return true
}

export function activateReportSkill(id: string): boolean {
  if (id === DEFAULT_REPORT_SKILL_ID) {
    setSetting(ACTIVE_SKILL_KEY, DEFAULT_REPORT_SKILL_ID)
    return true
  }
  if (!readSkillTemplates().some((template) => template.id === id)) return false
  setSetting(ACTIVE_SKILL_KEY, id)
  return true
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
