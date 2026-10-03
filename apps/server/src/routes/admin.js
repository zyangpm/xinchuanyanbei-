// ===== 新传研背 后端 · 管理接口（仅 admin 角色 JWT 可访问）=====
const { sendJson } = require('../util');

/**
 * GET /api/admin/users  用户列表（含各用户数据统计）
 * 仅管理员（JWT role=admin）可访问，由路由层校验。
 * V1：LEFT JOIN + GROUP BY 一次查询替代 N+1。
 */
async function handleAdminUsers(req, res, db) {
  const rows = await db.prepare(`
    SELECT u.id, u.username, u.nickname, u.role, u.created_at,
      COUNT(DISTINCT CASE WHEN f.deleted = 0 THEN f.id END) AS fav,
      COUNT(DISTINCT CASE WHEN n.deleted = 0 THEN n.id END) AS note,
      COUNT(DISTINCT CASE WHEN p.deleted = 0 THEN p.id END) AS prog,
      COUNT(DISTINCT CASE WHEN h.deleted = 0 THEN h.id END) AS hist
    FROM users u
    LEFT JOIN favorites f   ON f.user_id = u.id
    LEFT JOIN notes n       ON n.user_id = u.id
    LEFT JOIN study_progress p ON p.user_id = u.id
    LEFT JOIN exam_history h   ON h.user_id = u.id
    GROUP BY u.id ORDER BY u.id DESC
  `).all();
  const users = rows.map((u) => ({
    id: Number(u.id),
    username: u.username,
    nickname: u.nickname || u.username,
    role: u.role,
    createdAt: u.created_at,
    stats: {
      favorites: Number(u.fav || 0),
      notes: Number(u.note || 0),
      progress: Number(u.prog || 0),
      history: Number(u.hist || 0)
    }
  }));
  return sendJson(res, 200, { code: 0, message: 'ok', data: users });
}

/**
 * GET /api/admin/stats  平台整体统计（管理后台数据概览用）
 */
async function handleAdminStats(req, res, db) {
  const row = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM questions) AS questions,
      (SELECT COUNT(*) FROM favorites WHERE deleted = 0) AS favorites,
      (SELECT COUNT(*) FROM notes WHERE deleted = 0) AS notes,
      (SELECT COUNT(*) FROM study_progress WHERE deleted = 0) AS progress,
      (SELECT COUNT(*) FROM exam_history WHERE deleted = 0) AS history
  `).get();
  return sendJson(res, 200, {
    code: 0, message: 'ok',
    data: {
      users: Number(row.users || 0),
      questions: Number(row.questions || 0),
      favorites: Number(row.favorites || 0),
      notes: Number(row.notes || 0),
      progress: Number(row.progress || 0),
      history: Number(row.history || 0)
    }
  });
}

module.exports = { handleAdminUsers, handleAdminStats };
