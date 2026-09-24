// ===== 新传研背 后端 · HTTP 服务 =====
// 使用 Node.js 内置 http + node:sqlite，零第三方依赖。
// 启动：node src/server.js   （默认端口 3000，可用环境变量 PORT 覆盖）
const http = require('http');
const { db, initSchema } = require('./db');

initSchema();

const PORT = Number(process.env.PORT) || 3000;

/**
 * 统一 JSON 响应。
 * @param {http.ServerResponse} res 响应对象
 * @param {number} httpCode HTTP 状态码
 * @param {object} payload 响应体 { code, message, data }
 * @returns {void}
 */
function sendJson(res, httpCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(httpCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

/**
 * 读取并解析请求体 JSON（限制 5MB）。
 * @param {http.IncomingMessage} req 请求对象
 * @returns {Promise<object>} 解析后的对象（失败返回空对象）
 */
function readJsonBody(req) {
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

/**
 * 数据库 questions 行 -> 对外 JSON（字段名驼峰化 + BigInt 转 Number）。
 * @param {object} row 数据库行
 * @returns {object} 对外题目对象
 */
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

/**
 * 处理 /api/questions 系列请求（题库 CRUD）。
 * @param {http.IncomingMessage} req 请求
 * @param {http.ServerResponse} res 响应
 * @param {URL} url 解析后的 URL
 * @param {number|null} id 路径中的题目 id（列表/新增时为 null）
 * @returns {Promise<void>}
 */
async function handleQuestions(req, res, url, id) {
  // 列表
  if (req.method === 'GET' && id == null) {
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const conds = [];
    const args = [];
    if (type) { conds.push('question_type = ?'); args.push(type); }
    if (status) { conds.push('status = ?'); args.push(status); }
    const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';
    const rows = db.prepare('SELECT * FROM questions' + where + ' ORDER BY id DESC').all(...args);
    return sendJson(res, 200, { code: 0, message: 'ok', data: rows.map(mapQuestion) });
  }

  // 详情
  if (req.method === 'GET' && id != null) {
    const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    if (!row) return sendJson(res, 404, { code: 404, message: '题目不存在', data: null });
    return sendJson(res, 200, { code: 0, message: 'ok', data: mapQuestion(row) });
  }

  // 新增
  if (req.method === 'POST' && id == null) {
    const b = await readJsonBody(req);
    if (!b.title || !b.questionType) {
      return sendJson(res, 400, { code: 400, message: '缺少 title 或 questionType', data: null });
    }
    const info = db.prepare(
      'INSERT INTO questions (question_type, title, category, tag, status, content_json) VALUES (?,?,?,?,?,?)'
    ).run(b.questionType, b.title, b.category || null, b.tag || null, b.status || 'draft', b.contentJson || null);
    db.prepare('INSERT INTO publish_logs (question_id, action, operator) VALUES (?,?,?)')
      .run(Number(info.lastInsertRowid), 'create', null);
    const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(Number(info.lastInsertRowid));
    return sendJson(res, 201, { code: 0, message: 'created', data: mapQuestion(row) });
  }

  // 编辑
  if (req.method === 'PUT' && id != null) {
    const b = await readJsonBody(req);
    const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    if (!row) return sendJson(res, 404, { code: 404, message: '题目不存在', data: null });
    db.prepare(
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
    db.prepare('INSERT INTO publish_logs (question_id, action, operator) VALUES (?,?,?)').run(id, 'update', null);
    const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    return sendJson(res, 200, { code: 0, message: 'updated', data: mapQuestion(updated) });
  }

  // 删除
  if (req.method === 'DELETE' && id != null) {
    const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    if (!row) return sendJson(res, 404, { code: 404, message: '题目不存在', data: null });
    db.prepare('DELETE FROM questions WHERE id = ?').run(id);
    db.prepare('INSERT INTO publish_logs (question_id, action, operator) VALUES (?,?,?)').run(id, 'delete', null);
    return sendJson(res, 200, { code: 0, message: 'deleted', data: { id } });
  }

  return sendJson(res, 405, { code: 405, message: '方法不允许', data: null });
}

const server = http.createServer(async (req, res) => {
  // CORS（开发阶段放开；上线可收紧为指定域名）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  try {
    if (p === '/api/health') {
      return sendJson(res, 200, {
        code: 0, message: 'ok',
        data: { status: 'healthy', service: 'xinchuan-server', time: new Date().toISOString() }
      });
    }
    if (p === '/api/questions') return await handleQuestions(req, res, url, null);
    const m = p.match(/^\/api\/questions\/(\d+)$/);
    if (m) return await handleQuestions(req, res, url, Number(m[1]));

    return sendJson(res, 404, { code: 404, message: '接口不存在: ' + p, data: null });
  } catch (e) {
    return sendJson(res, 500, { code: 500, message: '服务器错误: ' + e.message, data: null });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('==================================================');
  console.log('   新传研背 后端服务已启动');
  console.log('   API:      http://localhost:' + PORT + '/api');
  console.log('   健康检查: http://localhost:' + PORT + '/api/health');
  console.log('==================================================');
});

module.exports = { server };
