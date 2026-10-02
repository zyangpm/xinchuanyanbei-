// ===== 新传研背 后端 · 认证路由（注册 / 登录 / 当前用户）=====
const { signToken, hashPassword, verifyPassword, publicUser } = require('../auth');
const { sendJson, readJsonBody } = require('../util');

/**
 * POST /api/auth/register  注册（仅创建 student 角色账号）
 * body: { username, password, nickname? }
 */
async function handleRegister(req, res, db) {
  const b = await readJsonBody(req);
  const username = String(b.username || '').trim();
  const password = String(b.password || '');
  const nickname = String(b.nickname || '').trim() || null;

  if (!/^[A-Za-z0-9_\u4e00-\u9fa5]{2,32}$/.test(username)) {
    return sendJson(res, 400, { code: 400, message: '用户名需为 2-32 位字母/数字/下划线/中文', data: null });
  }
  if (password.length < 6 || password.length > 64) {
    return sendJson(res, 400, { code: 400, message: '密码长度需为 6-64 位', data: null });
  }
  const dup = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (dup) return sendJson(res, 409, { code: 409, message: '用户名已存在', data: null });

  const info = await db.prepare(
    'INSERT INTO users (username, password_hash, nickname, role) VALUES (?,?,?,?)'
  ).run(username, hashPassword(password), nickname, 'student');
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid));
  const token = signToken({ uid: Number(row.id), username: row.username, role: row.role });
  return sendJson(res, 201, { code: 0, message: 'registered', data: { token, user: publicUser(row) } });
}

/**
 * POST /api/auth/login  登录
 * body: { username, password }
 */
async function handleLogin(req, res, db) {
  const b = await readJsonBody(req);
  const username = String(b.username || '').trim();
  const password = String(b.password || '');
  const row = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return sendJson(res, 401, { code: 401, message: '用户名或密码错误', data: null });
  }
  const token = signToken({ uid: Number(row.id), username: row.username, role: row.role });
  return sendJson(res, 200, { code: 0, message: 'ok', data: { token, user: publicUser(row) } });
}

/**
 * GET /api/auth/me  当前用户（需 Bearer JWT）
 */
async function handleMe(req, res, db, authCtx) {
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(authCtx.user.uid);
  if (!row) return sendJson(res, 404, { code: 404, message: '用户不存在', data: null });
  return sendJson(res, 200, { code: 0, message: 'ok', data: { user: publicUser(row) } });
}

module.exports = { handleRegister, handleLogin, handleMe };
