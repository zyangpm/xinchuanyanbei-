// ===== 新传研背 后端 · 管理接口（仅 admin 角色 JWT 可访问）=====
const { sendJson } = require('../util');

/**
 * GET /api/admin/users  用户列表（含各用户数据统计）
 * 仅管理员（JWT role=admin）可访问，由 server.js 路由层校验。
 */
async function handleAdminUsers(req, res, db) {
  const rows = await db.prepare('SELECT id, username, nickname, role, created_at FROM users ORDER BY id DESC').all();
  const users = [];
  for (const u of rows) {
    const fav = await db.prepare('SELECT COUNT(*) c FROM favorites WHERE user_id = ? AND deleted = 0').get(Number(u.id));
    const note = await db.prepare('SELECT COUNT(*) c FROM notes WHERE user_id = ? AND deleted = 0').get(Number(u.id));
    const prog = await db.prepare('SELECT COUNT(*) c FROM study_progress WHERE user_id = ? AND deleted = 0').get(Number(u.id));
    const hist = await db.prepare('SELECT COUNT(*) c FROM exam_history WHERE user_id = ? AND deleted = 0').get(Number(u.id));
    users.push({
      id: Number(u.id),
      username: u.username,
      nickname: u.nickname || u.username,
      role: u.role,
      createdAt: u.created_at,
      stats: { favorites: Number(fav.c || 0), notes: Number(note.c || 0), progress: Number(prog.c || 0), history: Number(hist.c || 0) }
    });
  }
  return sendJson(res, 200, { code: 0, message: 'ok', data: users });
}

/**
 * GET /api/admin/stats  平台整体统计（管理后台数据概览用）
 */
async function handleAdminStats(req, res, db) {
  const u = await db.prepare('SELECT COUNT(*) c FROM users').get();
  const q = await db.prepare('SELECT COUNT(*) c FROM questions').get();
  const fav = await db.prepare('SELECT COUNT(*) c FROM favorites WHERE deleted = 0').get();
  const note = await db.prepare('SELECT COUNT(*) c FROM notes WHERE deleted = 0').get();
  const prog = await db.prepare('SELECT COUNT(*) c FROM study_progress WHERE deleted = 0').get();
  const hist = await db.prepare('SELECT COUNT(*) c FROM exam_history WHERE deleted = 0').get();
  return sendJson(res, 200, {
    code: 0, message: 'ok',
    data: {
      users: Number(u.c || 0),
      questions: Number(q.c || 0),
      favorites: Number(fav.c || 0),
      notes: Number(note.c || 0),
      progress: Number(prog.c || 0),
      history: Number(hist.c || 0)
    }
  });
}

module.exports = { handleAdminUsers, handleAdminStats };
