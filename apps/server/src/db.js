// ===== 新传研背 后端 · 数据库模块 =====
// 使用 Node.js 内置 SQLite（node:sqlite，需 Node >= 22），零第三方依赖。
// 数据库文件存放在 apps/server/data/xinchuan.db（已在 .gitignore 忽略）。
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'xinchuan.db');
const db = new DatabaseSync(DB_PATH);

/**
 * 初始化数据库表结构（幂等：已存在则跳过）。
 * 首次启动会自动创建全部表与索引。
 * @returns {void}
 */
function initSchema() {
  db.exec(`
    -- 用户账号
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname      TEXT,
      phone         TEXT,
      role          TEXT NOT NULL DEFAULT 'student',   -- admin / student
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 题库（名词解释/简答/论述/实务）
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

    -- 学习资料
    CREATE TABLE IF NOT EXISTS materials (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      source_type  TEXT,                                -- 教材 / 真题 / 其他
      file_type    TEXT,                                -- PDF / Word ...
      word_count   INTEGER,
      chapter_info TEXT,
      parse_status TEXT,                                -- pending / done / failed
      uploaded_by  INTEGER,
      created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 收藏关系（用户 × 题目）
    CREATE TABLE IF NOT EXISTS favorites (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, question_id)
    );

    -- 笔记
    CREATE TABLE IF NOT EXISTS notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      question_id INTEGER,
      content     TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 学习进度（掌握度）
    CREATE TABLE IF NOT EXISTS study_progress (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      rating      TEXT,                                 -- known / blur / unknown
      updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, question_id)
    );

    -- 考试 / 训练历史
    CREATE TABLE IF NOT EXISTS exam_history (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL,
      type           TEXT,                              -- interview / comment / news ...
      question_index INTEGER,
      answer         TEXT,
      updated_at     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 用户反馈
    CREATE TABLE IF NOT EXISTS feedback (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER,
      content    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 题库发布日志
    CREATE TABLE IF NOT EXISTS publish_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      action      TEXT,                                 -- create / update / publish / unpublish / delete
      operator    INTEGER,
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_questions_type_status ON questions(question_type, status);
    CREATE INDEX IF NOT EXISTS idx_favorites_user        ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_user            ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user         ON study_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_exam_user             ON exam_history(user_id);
  `);
}

module.exports = { db, initSchema, DB_PATH };
