import { db } from './connection'

export function initSchema(): void {
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

  -- 历史数据：界面已改为按咨询期次自动分组，roster_groups / roster_hidden_dates
  -- 与 invites.group_id 只保留存量，不再读写（见第 12 篇开发文档）。
  CREATE TABLE IF NOT EXISTS roster_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS roster_hidden_dates (
    date TEXT PRIMARY KEY,
    hidden_at TEXT NOT NULL
  );

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
  CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_invite ON events(invite_id);

  -- 漏斗事实：从 events 沉淀出的长期数据，events 按保留期清理后后台数字不变。
  CREATE TABLE IF NOT EXISTS event_facts (
    invite_id TEXT NOT NULL,
    kind      TEXT NOT NULL,              -- 'start' | 'group' | 'exit'
    key       TEXT NOT NULL DEFAULT '',   -- group=groupId；exit=questionId；start 为空
    at        TEXT NOT NULL,              -- 首次（start/group）或最后一次（exit）发生时间
    seq       INTEGER NOT NULL DEFAULT 0, -- 原始事件 id；同一毫秒内的先后用它判定
    PRIMARY KEY (invite_id, kind, key)
  );
  CREATE INDEX IF NOT EXISTS idx_event_facts_kind ON event_facts(kind, key);

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

  CREATE TABLE IF NOT EXISTS search_cache (
    key TEXT PRIMARY KEY,
    results TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_search_cache_created ON search_cache(created_at);
`)
}
