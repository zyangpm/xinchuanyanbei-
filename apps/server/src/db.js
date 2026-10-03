// ===== 新传研背 后端 · 数据库模块（双模式适配）=====
// XC_DB 环境变量选择模式：
//   sqlite（默认）：node:sqlite 本地文件库（Node >= 22），开发 / 打包版使用
//   turso        ：@libsql/client 连接云端 Turso 库（SQLite 方言，业务 SQL 零改动）
//
// 统一对外异步接口（Promise）：
//   db.prepare(sql).run(...args)  -> { changes, lastInsertRowid }
//   db.prepare(sql).get(...args)  -> row | undefined
//   db.prepare(sql).all(...args)  -> rows[]
//   db.exec(sql)                  -> void
const path = require('path');
const fs = require('fs');

const MODE = process.env.XC_DB || 'sqlite';

const DATA_DIR = process.env.XC_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'xinchuan.db');

// 仅本地 sqlite 模式需要创建/访问本地数据目录；云端 turso 模式运行在只读 serverless
// 环境（如 Vercel /var/task），绝不触碰本地磁盘，否则模块加载即崩溃。
if (MODE !== 'turso') {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function toNumber(v) {
  if (v == null) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

async function createDb() {
  if (MODE === 'turso') {
    // ---------- 云端 Turso（SQLite 方言，持久化） ----------
    const { createClient } = require('@libsql/client');
    const url = process.env.XC_TURSO_URL;
    if (!url) throw new Error('[db] XC_TURSO_URL 未设置（turso 模式需要云库连接串）');
    const client = createClient({ url, authToken: process.env.XC_TURSO_TOKEN });
    return {
      mode: 'turso',
      async exec(sql) { await client.executeMultiple(sql); },
      prepare(sql) {
        return {
          async run(...args) {
            const r = await client.execute({ sql, args: [...args] });
            return { changes: r.rowsAffected ?? 0, lastInsertRowid: toNumber(r.lastInsertRowid) };
          },
          async get(...args) {
            const r = await client.execute({ sql, args: [...args] });
            return r.rows[0];
          },
          async all(...args) {
            const r = await client.execute({ sql, args: [...args] });
            return r.rows;
          }
        };
      },
      async close() { /* 无连接池需手动关闭 */ }
    };
  }

  // ---------- 本地 SQLite（node:sqlite，同步 API 包一层 Promise） ----------
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(DB_PATH);
  return {
    mode: 'sqlite',
    async exec(sql) { raw.exec(sql); },
    prepare(sql) {
      const stmt = raw.prepare(sql);
      return {
        async run(...args) {
          const r = stmt.run(...args);
          return { changes: r.changes, lastInsertRowid: toNumber(r.lastInsertRowid) };
        },
        async get(...args) { return stmt.get(...args); },
        async all(...args) { return stmt.all(...args); }
      };
    },
    async close() { raw.close(); }
  };
}

/** 幂等初始化表结构 + 老库缺列迁移（不重建、不丢数据）。 */
async function initSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname      TEXT,
      phone         TEXT,
      role          TEXT NOT NULL DEFAULT 'student',   -- admin / student
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      question_type TEXT NOT NULL,                      -- noun / short / essay / practice
      title         TEXT NOT NULL,
      category      TEXT,
      tag           TEXT,
      status        TEXT NOT NULL DEFAULT 'draft',      -- draft / published / unpublished
      content_json  TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at    TEXT
    );

    CREATE TABLE IF NOT EXISTS materials (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      source_type  TEXT,
      file_type    TEXT,
      word_count   INTEGER,
      chapter_info TEXT,
      parse_status TEXT,
      uploaded_by  INTEGER,
      created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      deleted     INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      question_id INTEGER,
      content     TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      deleted     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS study_progress (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      rating      TEXT,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      deleted     INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS exam_history (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL,
      type           TEXT,
      question_index INTEGER,
      answer         TEXT,
      updated_at     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      deleted        INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER,
      content    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS publish_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      action      TEXT,
      operator    INTEGER,
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_questions_type_status ON questions(question_type, status);
    CREATE INDEX IF NOT EXISTS idx_favorites_user    ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_user        ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user     ON study_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_exam_user         ON exam_history(user_id);
  `);

  // 老库迁移：为既有表补充新增列（ALTER 幂等，仅缺列时执行）
  await ensureColumn(db, 'favorites', 'updated_at', "TEXT NOT NULL DEFAULT (datetime('now','localtime'))");
  await ensureColumn(db, 'favorites', 'deleted', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'notes', 'updated_at', "TEXT NOT NULL DEFAULT (datetime('now','localtime'))");
  await ensureColumn(db, 'notes', 'deleted', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'study_progress', 'deleted', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'exam_history', 'deleted', 'INTEGER NOT NULL DEFAULT 0');
}

/** 检查表是否已有某列，缺则 ALTER TABLE ADD COLUMN。 */
async function ensureColumn(db, table, column, ddl) {
  try {
    const rows = await db.prepare('PRAGMA table_info(' + table + ')').all();
    const exists = rows.some((c) => c && c.name === column);
    if (!exists) await db.exec('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + ddl);
  } catch (e) { /* 表不存在时跳过（建表已覆盖） */ }
}

module.exports = { createDb, initSchema, MODE, DB_PATH, DATA_DIR };
