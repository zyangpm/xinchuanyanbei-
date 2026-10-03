// ===== 新传研背 后端 · 题库路由（CRUD + 批量同步，保持 V5.1 接口兼容）=====
function sendJson(res, httpCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(httpCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

async function readJsonBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 5 * 1024 * 1024) { req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

/** questions 行 -> 对外 JSON（驼峰 + BigInt 转 Number）。 */
function mapQuestion(row) {
  return {
    id: Number(row.id),
    questionType: row.question_type,
    title: row.title,
    category: row.category,
    tag: row.tag,
    status: row.status,
    contentJson: row.content_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/** /api/questions 系列（列表/详情/新增/编辑/删除）。
 *  ctx：可选鉴权上下文。GET 列表默认仅返回 published；查看非发布状态（draft/all）需 admin。
 *  写操作由上层路由负责 admin 校验，本函数不重复判断（保持薄路由职责）。
 */
async function handleQuestions(req, res, db, url, id, ctx) {
  if (req.method === 'GET' && id == null) {
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status') || 'published';
    // 非 published 状态（draft/all 等）仅管理员可见
    if (status !== 'published' && !(ctx && ctx.user && ctx.user.role === 'admin')) {
      return sendJson(res, 403, { code: 403, message: '无权限：仅管理员可查看非发布状态题目', data: null });
    }
    const conds = [];
    const args = [];
    if (type) { conds.push('question_type = ?'); args.push(type); }
    if (status !== 'all') { conds.push('status = ?'); args.push(status); }
    const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';
    const rows = await db.prepare('SELECT * FROM questions' + where + ' ORDER BY id DESC').all(...args);
    return sendJson(res, 200, { code: 0, message: 'ok', data: rows.map(mapQuestion) });
  }

  if (req.method === 'GET' && id != null) {
    const row = await db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    if (!row) return sendJson(res, 404, { code: 404, message: '题目不存在', data: null });
    return sendJson(res, 200, { code: 0, message: 'ok', data: mapQuestion(row) });
  }

  if (req.method === 'POST' && id == null) {
    const b = await readJsonBody(req);
    if (!b.title || !b.questionType) {
      return sendJson(res, 400, { code: 400, message: '缺少 title 或 questionType', data: null });
    }
    const info = await db.prepare(
      'INSERT INTO questions (question_type, title, category, tag, status, content_json) VALUES (?,?,?,?,?,?)'
    ).run(b.questionType, b.title, b.category || null, b.tag || null, b.status || 'draft', b.contentJson || null);
    await db.prepare('INSERT INTO publish_logs (question_id, action, operator) VALUES (?,?,?)')
      .run(Number(info.lastInsertRowid), 'create', null);
    const row = await db.prepare('SELECT * FROM questions WHERE id = ?').get(Number(info.lastInsertRowid));
    return sendJson(res, 201, { code: 0, message: 'created', data: mapQuestion(row) });
  }

  if (req.method === 'PUT' && id != null) {
    const b = await readJsonBody(req);
    const row = await db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    if (!row) return sendJson(res, 404, { code: 404, message: '题目不存在', data: null });
    await db.prepare(
      "UPDATE questions SET question_type=?, title=?, category=?, tag=?, status=?, content_json=?, updated_at=datetime('now','localtime') WHERE id=?"
    ).run(
      b.questionType || row.question_type,
      b.title || row.title,
      b.category != null ? b.category : row.category,
      b.tag != null ? b.tag : row.tag,
      b.status || row.status,
      b.contentJson != null ? b.contentJson : row.content_json,
      id
    );
    await db.prepare('INSERT INTO publish_logs (question_id, action, operator) VALUES (?,?,?)').run(id, 'update', null);
    const updated = await db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    return sendJson(res, 200, { code: 0, message: 'updated', data: mapQuestion(updated) });
  }

  if (req.method === 'DELETE' && id != null) {
    const row = await db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    if (!row) return sendJson(res, 404, { code: 404, message: '题目不存在', data: null });
    await db.prepare('DELETE FROM questions WHERE id = ?').run(id);
    await db.prepare('INSERT INTO publish_logs (question_id, action, operator) VALUES (?,?,?)').run(id, 'delete', null);
    return sendJson(res, 200, { code: 0, message: 'deleted', data: { id } });
  }

  return sendJson(res, 405, { code: 405, message: '方法不允许', data: null });
}

/** 批量同步题库：后台全量推送，按 id upsert（兼容旧接口）。 */
async function handleQuestionSync(req, res, db) {
  const b = await readJsonBody(req);
  const items = Array.isArray(b) ? b : (b.items || []);
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO questions (id, question_type, title, category, tag, status, content_json, created_at, updated_at) " +
    "VALUES (?,?,?,?,?,?,?, COALESCE((SELECT created_at FROM questions WHERE id=?), datetime('now','localtime')), datetime('now','localtime'))"
  );
  let n = 0;
  for (const it of items) {
    if (!it || it.id == null) continue;
    await stmt.run(Number(it.id), it.questionType || 'noun', it.title || '', it.category || null,
      it.tag || null, it.status || 'draft', it.contentJson || null, Number(it.id));
    n++;
  }
  return sendJson(res, 200, { code: 0, message: 'synced', data: { count: n } });
}

module.exports = { handleQuestions, handleQuestionSync };
