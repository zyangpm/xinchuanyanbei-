// ===== 新传研背 后端 · 用户数据云同步路由 =====
// 按用户维度同步四类数据：收藏 favorites / 笔记 notes / 掌握度 study_progress / 考试历史 exam_history。
// 协议（同步引擎对外契约，客户端同构实现）：
//   GET  /api/sync/:collection?since=<ISO>  -> 该用户增量（updated_at > since，含 deleted=1 的记录）；无 since 返回全量
//   POST /api/sync/:collection {items:[]}   -> upsert（"后写覆盖"冲突策略：客户端时间新才覆盖），返回服务端权威行
// 统一时间格式 ISO 8601；SQL 使用 SQLite UPSERT 语法（ON CONFLICT DO UPDATE），云端 Turso 同方言。
const { sendJson, readJsonBody, nowIso } = require('../util');

// 集合元数据：表、冲突键、upsert SQL、行转对外对象
const COLLECTIONS = {
  favorites: {
    table: 'favorites',
    rowToItem: (r) => ({ questionId: r.question_id, updatedAt: r.updated_at, deleted: !!r.deleted }),
    upsertSql:
      'INSERT INTO favorites (user_id, question_id, updated_at, deleted) VALUES (?,?,?,?) ' +
      'ON CONFLICT(user_id, question_id) DO UPDATE SET updated_at = excluded.updated_at, deleted = excluded.deleted ' +
      'WHERE excluded.updated_at >= favorites.updated_at',
    insertArgs: (uid, it) => [uid, it.questionId != null ? String(it.questionId) : '', it.updatedAt || nowIso(), it.deleted ? 1 : 0],
    findSql: 'SELECT * FROM favorites WHERE user_id = ? AND question_id = ?',
    findArgs: (uid, it) => [uid, it.questionId != null ? String(it.questionId) : '']
  },
  notes: {
    table: 'notes',
    rowToItem: (r) => ({
      id: Number(r.id), questionId: r.question_id != null ? Number(r.question_id) : null,
      content: r.content, createdAt: r.created_at, updatedAt: r.updated_at, deleted: !!r.deleted
    }),
    upsertSql:
      'INSERT INTO notes (id, user_id, question_id, content, created_at, updated_at, deleted) VALUES (?,?,?,?,?,?,?) ' +
      'ON CONFLICT(id) DO UPDATE SET question_id = excluded.question_id, content = excluded.content, ' +
      'updated_at = excluded.updated_at, deleted = excluded.deleted ' +
      'WHERE notes.user_id = excluded.user_id AND excluded.updated_at >= notes.updated_at',
    insertArgs: (uid, it) => [Number(it.id), uid, it.questionId != null ? Number(it.questionId) : null, it.content != null ? String(it.content) : '', it.createdAt || nowIso(), it.updatedAt || nowIso(), it.deleted ? 1 : 0],
    insertNoIdSql:
      'INSERT INTO notes (user_id, question_id, content, created_at, updated_at, deleted) VALUES (?,?,?,?,?,?)',
    insertNoIdArgs: (uid, it) => [uid, it.questionId != null ? Number(it.questionId) : null, it.content != null ? String(it.content) : '', it.createdAt || nowIso(), it.updatedAt || nowIso(), it.deleted ? 1 : 0],
    findByIdSql: 'SELECT * FROM notes WHERE id = ? AND user_id = ?',
    findByIdArgs: (uid, it) => [Number(it.id), uid]
  },
  progress: {
    table: 'study_progress',
    rowToItem: (r) => ({ questionId: r.question_id, rating: r.rating, updatedAt: r.updated_at, deleted: !!r.deleted }),
    upsertSql:
      'INSERT INTO study_progress (user_id, question_id, rating, updated_at, deleted) VALUES (?,?,?,?,?) ' +
      'ON CONFLICT(user_id, question_id) DO UPDATE SET rating = excluded.rating, updated_at = excluded.updated_at, deleted = excluded.deleted ' +
      'WHERE excluded.updated_at >= study_progress.updated_at',
    insertArgs: (uid, it) => [uid, it.questionId != null ? String(it.questionId) : '', it.rating != null ? String(it.rating) : 'unknown', it.updatedAt || nowIso(), it.deleted ? 1 : 0],
    findSql: 'SELECT * FROM study_progress WHERE user_id = ? AND question_id = ?',
    findArgs: (uid, it) => [uid, it.questionId != null ? String(it.questionId) : '']
  },
  history: {
    table: 'exam_history',
    rowToItem: (r) => ({
      id: Number(r.id), type: r.type, questionIndex: r.question_index != null ? Number(r.question_index) : null,
      answer: r.answer, updatedAt: r.updated_at, deleted: !!r.deleted
    }),
    upsertSql:
      'INSERT INTO exam_history (id, user_id, type, question_index, answer, updated_at, deleted) VALUES (?,?,?,?,?,?,?) ' +
      'ON CONFLICT(id) DO UPDATE SET type = excluded.type, question_index = excluded.question_index, ' +
      'answer = excluded.answer, updated_at = excluded.updated_at, deleted = excluded.deleted ' +
      'WHERE exam_history.user_id = excluded.user_id AND excluded.updated_at >= exam_history.updated_at',
    insertArgs: (uid, it) => [Number(it.id), uid, it.type || null, it.questionIndex != null ? Number(it.questionIndex) : null, it.answer != null ? String(it.answer) : '', it.updatedAt || nowIso(), it.deleted ? 1 : 0],
    insertNoIdSql:
      'INSERT INTO exam_history (user_id, type, question_index, answer, updated_at, deleted) VALUES (?,?,?,?,?,?)',
    insertNoIdArgs: (uid, it) => [uid, it.type || null, it.questionIndex != null ? Number(it.questionIndex) : null, it.answer != null ? String(it.answer) : '', it.updatedAt || nowIso(), it.deleted ? 1 : 0],
    findByIdSql: 'SELECT * FROM exam_history WHERE id = ? AND user_id = ?',
    findByIdArgs: (uid, it) => [Number(it.id), uid]
  }
};

function isIsoDate(s) {
  return typeof s === 'string' && !Number.isNaN(Date.parse(s));
}

/**
 * GET /api/sync/:collection?since=<ISO>
 * 返回该用户集合的增量（含软删除标记），按 updated_at 升序。
 */
async function handlePull(req, res, db, url, authCtx, collection) {
  const meta = COLLECTIONS[collection];
  const uid = authCtx.user.uid;
  const since = url.searchParams.get('since');
  let rows;
  if (since && isIsoDate(since)) {
    rows = await db.prepare(
      'SELECT * FROM ' + meta.table + ' WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC'
    ).all(uid, since);
  } else {
    rows = await db.prepare('SELECT * FROM ' + meta.table + ' WHERE user_id = ? ORDER BY updated_at ASC').all(uid);
  }
  return sendJson(res, 200, { code: 0, message: 'ok', data: rows.map(meta.rowToItem) });
}

/**
 * POST /api/sync/:collection  body: { items: [...] }
 * upsert（客户端时间新才覆盖），返回服务端权威行，客户端以返回值覆盖本地。
 */
async function handlePush(req, res, db, authCtx, collection) {
  const meta = COLLECTIONS[collection];
  const uid = authCtx.user.uid;
  const b = await readJsonBody(req);
  const items = Array.isArray(b) ? b : (b.items || []);
  if (!items.length) return sendJson(res, 200, { code: 0, message: 'ok', data: [] });

  const outs = [];
  for (const it of items) {
    if (!it) continue;
    const item = Object.assign({}, it, {
      updatedAt: isIsoDate(it.updatedAt) ? it.updatedAt : nowIso(),
      createdAt: isIsoDate(it.createdAt) ? it.createdAt : nowIso()
    });
    let row;

    if (meta.upsertSql) {
      // 有 id 的集合（notes/history）走 UPSERT；无 id 走自增插入
      if ((collection === 'notes' || collection === 'history') && it.id == null) {
        const info = await db.prepare(meta.insertNoIdSql).run(...meta.insertNoIdArgs(uid, item));
        row = await db.prepare(meta.findByIdSql).get(Number(info.lastInsertRowid), uid);
      } else {
        await db.prepare(meta.upsertSql).run(...meta.insertArgs(uid, item));
        row = await db.prepare(meta.findSql || meta.findByIdSql).get(...(meta.findArgs ? meta.findArgs(uid, item) : meta.findByIdArgs(uid, item)));
      }
    } else {
      row = null;
    }
    if (row) outs.push(meta.rowToItem(row));
  }

  return sendJson(res, 200, { code: 0, message: 'ok', data: outs });
}

module.exports = { handlePull, handlePush, COLLECTIONS };
