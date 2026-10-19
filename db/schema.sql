-- ============================================================
--  tfkir.net — مخطط قاعدة البيانات (Cloudflare D1)
--  تُطبَّق بـ:  wrangler d1 migrations apply tfkir-content --remote
--  أو:         node tools/seed.mjs   (يفرّغ الجداول ويعيد الزرع)
-- ============================================================

PRAGMA foreign_keys = ON;

-- ---------- المستخدمون (لوحة التحكم) ----------
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  username       TEXT NOT NULL,
  username_lower TEXT NOT NULL UNIQUE,
  display_name   TEXT NOT NULL DEFAULT '',
  password_hash  TEXT NOT NULL,          -- pbkdf2_sha256$<iters>$<saltB64>$<hashB64>
  must_change    INTEGER NOT NULL DEFAULT 1,
  failed_count   INTEGER NOT NULL DEFAULT 0,
  locked_until   TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at  TEXT
);

-- ---------- الجلسات ----------
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,           -- sha256(التوكن) — لا يُخزَّن التوكن نفسه
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  ip         TEXT,
  agent      TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ---------- المحاولات الفاشلة (حماية من التخمين) ----------
CREATE TABLE IF NOT EXISTS login_attempts (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ip       TEXT NOT NULL,
  username TEXT,
  ok       INTEGER NOT NULL DEFAULT 0,
  at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts ON login_attempts(ip, at);

-- ---------- المقالات ----------
CREATE TABLE IF NOT EXISTS posts (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL DEFAULT '',
  excerpt      TEXT NOT NULL DEFAULT '',
  content      TEXT NOT NULL DEFAULT '',   -- HTML مُنقّى (server-side)
  content_text TEXT NOT NULL DEFAULT '',   -- نص صِرف: للبحث وقياس وقت القراءة
  category     TEXT NOT NULL DEFAULT 'تأملات',
  tags         TEXT NOT NULL DEFAULT '[]',  -- JSON array
  cover        TEXT,
  status       TEXT NOT NULL DEFAULT 'draft',  -- draft | published
  featured     INTEGER NOT NULL DEFAULT 0,
  read_minutes INTEGER NOT NULL DEFAULT 1,
  views        INTEGER NOT NULL DEFAULT 0,
  author_id    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_status  ON posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_updated ON posts(updated_at DESC);

-- ---------- لقطات الحفظ التلقائي (شبكة الأمان) ----------
CREATE TABLE IF NOT EXISTS revisions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id      TEXT NOT NULL,
  title        TEXT NOT NULL DEFAULT '',
  excerpt      TEXT NOT NULL DEFAULT '',
  content      TEXT NOT NULL DEFAULT '',
  content_text TEXT NOT NULL DEFAULT '',
  chars        INTEGER NOT NULL DEFAULT 0,
  saved_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_revisions_post ON revisions(post_id, id DESC);

-- ---------- عدّاد عامّ للمقالات المنشورة (للصفحة الرئيسية) ----------
CREATE TABLE IF NOT EXISTS kv_stats (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL DEFAULT '0',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);