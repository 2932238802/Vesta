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

  -- 历史数据：简历收集已于 2026-11 下线，代码不再读写；
  -- 存量图片保留在库中，便于回滚或人工导出。确认清理前不要 DROP。
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

  -- 分数线：类型（考研 / 四六级…）在 shared/src/score-line.ts 的注册表里，
  -- 这里只存「数据集 → 条目」两层；新增类型不需要改表。
  CREATE TABLE IF NOT EXISTS score_line_sets (
    id          TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    title       TEXT NOT NULL,
    year        INTEGER NOT NULL DEFAULT 0,
    region      TEXT NOT NULL DEFAULT '',
    source_name TEXT NOT NULL DEFAULT '',
    source_url  TEXT NOT NULL DEFAULT '',
    note        TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_score_line_sets_category
    ON score_line_sets(category_id, year DESC, updated_at DESC);

  CREATE TABLE IF NOT EXISTS score_line_entries (
    id         TEXT PRIMARY KEY,
    set_id     TEXT NOT NULL,
    label      TEXT NOT NULL,
    value      REAL NOT NULL,
    max_value  REAL,
    note       TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_score_line_entries_set
    ON score_line_entries(set_id, sort_order);

  -- 分数线 v3：全国院校主表、院校线 / 专业线 / 招生计划与抓取任务。
  -- 旧的 score_line_sets / score_line_entries 保留为 legacy，只由迁移读取。
  CREATE TABLE IF NOT EXISTS schools (
    id             TEXT PRIMARY KEY,
    code           TEXT NOT NULL DEFAULT '',
    name           TEXT NOT NULL,
    province       TEXT NOT NULL DEFAULT '',
    city           TEXT NOT NULL DEFAULT '',
    level          TEXT NOT NULL DEFAULT '',
    nature         TEXT NOT NULL DEFAULT '',
    tags           TEXT NOT NULL DEFAULT '[]',
    official_url   TEXT NOT NULL DEFAULT '',
    graduate_url   TEXT NOT NULL DEFAULT '',
    admissions_url TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'active',
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_name_province ON schools(name, province);
  CREATE INDEX IF NOT EXISTS idx_schools_province ON schools(province, level);
  CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(code);

  CREATE TABLE IF NOT EXISTS school_aliases (
    id        TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    alias     TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_school_alias ON school_aliases(alias);
  CREATE INDEX IF NOT EXISTS idx_school_alias_school ON school_aliases(school_id);

  CREATE TABLE IF NOT EXISTS school_programs (
    id            TEXT PRIMARY KEY,
    school_id     TEXT NOT NULL,
    year          INTEGER NOT NULL,
    exam          TEXT NOT NULL,
    province      TEXT NOT NULL DEFAULT '',
    major_code    TEXT NOT NULL DEFAULT '',
    major_name    TEXT NOT NULL,
    degree_type   TEXT NOT NULL DEFAULT '',
    study_mode    TEXT NOT NULL DEFAULT '',
    plan_count    INTEGER,
    tuition       TEXT NOT NULL DEFAULT '',
    exam_subjects TEXT NOT NULL DEFAULT '[]',
    note          TEXT NOT NULL DEFAULT '',
    source_url    TEXT NOT NULL DEFAULT '',
    review_status TEXT NOT NULL DEFAULT 'pending',
    updated_at    TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_school_programs_key
    ON school_programs(school_id, year, exam, province, major_code, degree_type, study_mode);
  CREATE INDEX IF NOT EXISTS idx_school_programs_school
    ON school_programs(school_id, year DESC, exam);

  CREATE TABLE IF NOT EXISTS scoreline_batches (
    id            TEXT PRIMARY KEY,
    scope         TEXT NOT NULL,
    exam          TEXT NOT NULL,
    year          INTEGER NOT NULL,
    province      TEXT NOT NULL DEFAULT '',
    region        TEXT NOT NULL DEFAULT '',
    school_id     TEXT NOT NULL DEFAULT '',
    program_id    TEXT NOT NULL DEFAULT '',
    category      TEXT NOT NULL DEFAULT '',
    track         TEXT NOT NULL DEFAULT '',
    title         TEXT NOT NULL DEFAULT '',
    source_name   TEXT NOT NULL DEFAULT '',
    source_url    TEXT NOT NULL DEFAULT '',
    published_at  TEXT NOT NULL DEFAULT '',
    fetched_at    TEXT NOT NULL,
    checksum      TEXT NOT NULL DEFAULT '',
    confidence    REAL NOT NULL DEFAULT 1,
    review_status TEXT NOT NULL DEFAULT 'pending',
    note          TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_scoreline_batches_key
    ON scoreline_batches(scope, exam, year, province, region, school_id, program_id, category, track);
  CREATE INDEX IF NOT EXISTS idx_scoreline_batches_school
    ON scoreline_batches(school_id, year DESC, exam);
  CREATE INDEX IF NOT EXISTS idx_scoreline_batches_main
    ON scoreline_batches(scope, exam, province, year DESC);
  CREATE INDEX IF NOT EXISTS idx_scoreline_batches_review
    ON scoreline_batches(review_status, year DESC);

  CREATE TABLE IF NOT EXISTS scoreline_metrics (
    id           TEXT PRIMARY KEY,
    batch_id     TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    full_score   REAL,
    value        REAL NOT NULL,
    is_minimum   INTEGER NOT NULL DEFAULT 0,
    minimum_type TEXT NOT NULL DEFAULT '',
    sort_order   INTEGER NOT NULL DEFAULT 0,
    note         TEXT NOT NULL DEFAULT ''
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_scoreline_metrics_key
    ON scoreline_metrics(batch_id, subject_code, is_minimum, minimum_type);
  CREATE INDEX IF NOT EXISTS idx_scoreline_metrics_batch
    ON scoreline_metrics(batch_id, sort_order);

  CREATE TABLE IF NOT EXISTS school_coverage (
    school_id    TEXT NOT NULL,
    exam         TEXT NOT NULL,
    year         INTEGER NOT NULL,
    status       TEXT NOT NULL,
    main_line    INTEGER NOT NULL DEFAULT 0,
    school_line  INTEGER NOT NULL DEFAULT 0,
    program_line INTEGER NOT NULL DEFAULT 0,
    plan_count   INTEGER NOT NULL DEFAULT 0,
    last_run_id  TEXT NOT NULL DEFAULT '',
    last_error   TEXT NOT NULL DEFAULT '',
    updated_at   TEXT NOT NULL,
    PRIMARY KEY (school_id, exam, year)
  );
  CREATE INDEX IF NOT EXISTS idx_school_coverage_status ON school_coverage(status, year DESC);

  CREATE TABLE IF NOT EXISTS scoreline_sources (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    publisher      TEXT NOT NULL DEFAULT '',
    url            TEXT NOT NULL,
    entry_url      TEXT NOT NULL DEFAULT '',
    exam           TEXT NOT NULL,
    province       TEXT NOT NULL DEFAULT '',
    school_id      TEXT NOT NULL DEFAULT '',
    parser_id      TEXT NOT NULL DEFAULT '',
    tier           TEXT NOT NULL DEFAULT 'T0',
    interval_hours INTEGER NOT NULL DEFAULT 168,
    discover_depth INTEGER NOT NULL DEFAULT 2,
    url_include    TEXT NOT NULL DEFAULT '',
    verified       INTEGER NOT NULL DEFAULT 0,
    enabled        INTEGER NOT NULL DEFAULT 1,
    last_run_at    TEXT NOT NULL DEFAULT '',
    last_status    TEXT NOT NULL DEFAULT '',
    last_error     TEXT NOT NULL DEFAULT '',
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scoreline_sources_next
    ON scoreline_sources(enabled, exam, province, tier);

  CREATE TABLE IF NOT EXISTS crawl_runs (
    id           TEXT PRIMARY KEY,
    source_id    TEXT NOT NULL DEFAULT '',
    province     TEXT NOT NULL DEFAULT '',
    priority     INTEGER NOT NULL DEFAULT 0,
    trigger      TEXT NOT NULL DEFAULT 'schedule',
    scope        TEXT NOT NULL DEFAULT '{}',
    status       TEXT NOT NULL,
    started_at   TEXT NOT NULL DEFAULT '',
    finished_at  TEXT NOT NULL DEFAULT '',
    discovered   INTEGER NOT NULL DEFAULT 0,
    fetched      INTEGER NOT NULL DEFAULT 0,
    parsed       INTEGER NOT NULL DEFAULT 0,
    saved        INTEGER NOT NULL DEFAULT 0,
    failed       INTEGER NOT NULL DEFAULT 0,
    message      TEXT NOT NULL DEFAULT '',
    details      TEXT NOT NULL DEFAULT '[]',
    created_at   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_crawl_runs_created ON crawl_runs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_crawl_runs_queue
    ON crawl_runs(status, priority DESC, created_at);

  CREATE TABLE IF NOT EXISTS crawl_documents (
    id           TEXT PRIMARY KEY,
    run_id       TEXT NOT NULL DEFAULT '',
    source_id    TEXT NOT NULL DEFAULT '',
    url          TEXT NOT NULL,
    http_status  INTEGER NOT NULL DEFAULT 0,
    content_type TEXT NOT NULL DEFAULT '',
    checksum     TEXT NOT NULL DEFAULT '',
    storage_path TEXT NOT NULL DEFAULT '',
    parser_id    TEXT NOT NULL DEFAULT '',
    parse_status TEXT NOT NULL DEFAULT 'pending',
    error        TEXT NOT NULL DEFAULT '',
    note         TEXT NOT NULL DEFAULT '',
    shape        TEXT NOT NULL DEFAULT '',
    fetched_at   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_crawl_documents_run ON crawl_documents(run_id);
  CREATE INDEX IF NOT EXISTS idx_crawl_documents_source
    ON crawl_documents(source_id, fetched_at DESC);
`)
}
