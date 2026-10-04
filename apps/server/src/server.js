// ===== 新传研背 后端 · HTTP 服务入口 =====
// 零第三方运行时依赖（Node 内置 http + node:sqlite；云端模式接 @libsql/client）。
// 启动：node src/server.js   （默认端口 3000，可用环境变量 PORT / XC_DB / XC_TURSO_URL 覆盖）
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createDb, initSchema, DATA_DIR } = require('./db');
const { verifyToken, hashPassword, publicUser } = require('./auth');
const { sendJson, rateLimit, corsPreflight } = require('./util');
const { handleRegister, handleLogin, handleMe } = require('./routes/auth');
const { handleQuestions, handleQuestionSync } = require('./routes/questions');
const { handlePull, handlePush, COLLECTIONS } = require('./routes/sync');
const { handleAdminUsers, handleAdminStats } = require('./routes/admin');

/** 写题库类操作仅允许 admin 角色 JWT（拒绝匿名 api-token，防越权）。未登录 401，非管理员 403。 */
function requireAdmin(res, ctx) {
  if (!ctx || !ctx.user) {
    sendJson(res, 401, { code: 401, message: '未登录或登录已过期', data: null });
    return false;
  }
  if (ctx.user.role !== 'admin') {
    sendJson(res, 403, { code: 403, message: '无权限：需要管理员账号', data: null });
    return false;
  }
  return true;
}

const PORT = Number(process.env.PORT) || 3000;

// ===== API 令牌（写操作兼容旧机制：Bearer <api_token> 或 Bearer <JWT>） =====
const TOKEN_FILE = path.join(DATA_DIR, '.api_token');
let API_TOKEN = process.env.XC_API_TOKEN || '';
if (!API_TOKEN) {
  try { API_TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim(); } catch (e) { API_TOKEN = ''; }
}
if (!API_TOKEN) {
  API_TOKEN = crypto.randomBytes(24).toString('hex');
  try {
    fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
    fs.writeFileSync(TOKEN_FILE, API_TOKEN, 'utf8');
  } catch (e) { /* 写文件失败不阻塞启动 */ }
  console.log('   [auth] API Token 已自动生成并持久化到 data/.api_token（值不打印）');
} else if (!process.env.XC_API_TOKEN) {
  console.log('   [auth] API Token 从 data/.api_token 读取（值不打印）');
} else {
  console.log('   [auth] API Token 从环境变量 XC_API_TOKEN 读取（值不打印）');
}

/**
 * 鉴权上下文：返回 { via, user? } 或 null。
 * - Bearer <api_token>：旧机制（管理后台批量写入），无用户维度
 * - Bearer <JWT>：登录签发，user = { uid, username, role }
 */
function authCtx(req) {
  const h = req.headers['authorization'] || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t) return null;
  if (t === API_TOKEN) return { via: 'api-token', user: null };
  const payload = verifyToken(t);
  if (payload && payload.uid) return { via: 'jwt', user: payload };
  return null;
}

/**
 * 确保管理员账号存在（环境变量 XC_ADMIN_USERNAME / XC_ADMIN_PASSWORD）。
 * 已存在则密码跟随环境变量（生产轮换管理员密码只需改 env 重新部署）。
 * 未设置则不创建（默认无管理员；部署时通过环境变量注入初始管理员）。
 */
async function ensureAdmin(db) {
  const name = process.env.XC_ADMIN_USERNAME || 'admin';
  const pass = process.env.XC_ADMIN_PASSWORD;
  if (!pass) return;
  const exists = await db.prepare('SELECT id FROM users WHERE username = ?').get(name);
  if (exists) {
    await db.prepare('UPDATE users SET password_hash = ?, nickname = ?, role = ? WHERE username = ?')
      .run(hashPassword(pass), '管理员', 'admin', name);
    console.log('   [auth] 管理员密码已按环境变量更新: ' + name);
  } else {
    await db.prepare('INSERT INTO users (username, password_hash, nickname, role) VALUES (?,?,?,?)')
      .run(name, hashPassword(pass), '管理员', 'admin');
    console.log('   [auth] 管理员账号已创建: ' + name);
  }
}

async function main() {
  const db = await createDb();
  await initSchema(db);
  await ensureAdmin(db);
  console.log('   [db] 模式: ' + db.mode + (db.mode === 'turso' ? '' : ' (' + require('./db').DB_PATH + ')'));

  const server = http.createServer(async (req, res) => {
    // CORS：未配置 XC_ALLOWED_ORIGINS 时本地/Electron 放开；配置后仅放行白名单域名
    if (corsPreflight(req, res)) return;

    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    const ctx = authCtx(req);

    try {
      // 健康检查
      if (p === '/api/health') {
        return sendJson(res, 200, {
          code: 0, message: 'ok',
          data: { status: 'healthy', service: 'xinchuan-server', mode: db.mode, time: new Date().toISOString() }
        });
      }

      // 认证（注册登录无需鉴权，但做同 IP 限流防爆破）
      if (p === '/api/auth/register' && req.method === 'POST') {
        if (!rateLimit(req, res, 10, 60000)) return;
        return await handleRegister(req, res, db);
      }
      if (p === '/api/auth/login' && req.method === 'POST') {
        if (!rateLimit(req, res, 10, 60000)) return;
        return await handleLogin(req, res, db);
      }
      if (p === '/api/auth/me' && req.method === 'GET') {
        if (!ctx || !ctx.user) return sendJson(res, 401, { code: 401, message: '未登录或登录已过期', data: null });
        return await handleMe(req, res, db, ctx);
      }

      // 题库（GET 公开仅已发布；写操作需管理员 JWT）
      if (p === '/api/questions') {
        if (req.method === 'POST' && !requireAdmin(res, ctx)) return;
        return await handleQuestions(req, res, db, url, null, ctx);
      }
      if (p === '/api/questions/sync' && req.method === 'POST') {
        if (!requireAdmin(res, ctx)) return;
        return await handleQuestionSync(req, res, db, ctx);
      }
      const qm = p.match(/^\/api\/questions\/(\d+)$/);
      if (qm) {
        if (req.method !== 'GET' && !requireAdmin(res, ctx)) return;
        return await handleQuestions(req, res, db, url, Number(qm[1]), ctx);
      }

      // 管理接口（仅 admin 角色 JWT）
      if (p === '/api/admin/users' && req.method === 'GET') {
        if (!ctx || !ctx.user) return sendJson(res, 401, { code: 401, message: '未登录或登录已过期', data: null });
        if (ctx.user.role !== 'admin') return sendJson(res, 403, { code: 403, message: '无权限：需要管理员账号', data: null });
        return await handleAdminUsers(req, res, db);
      }
      if (p === '/api/admin/stats' && req.method === 'GET') {
        if (!ctx || !ctx.user) return sendJson(res, 401, { code: 401, message: '未登录或登录已过期', data: null });
        if (ctx.user.role !== 'admin') return sendJson(res, 403, { code: 403, message: '无权限：需要管理员账号', data: null });
        return await handleAdminStats(req, res, db);
      }

      // 用户数据云同步（需 JWT 登录态）
      const sm = p.match(/^\/api\/sync\/(\w+)$/);
      if (sm) {
        const collection = sm[1];
        if (!COLLECTIONS[collection]) return sendJson(res, 404, { code: 404, message: '未知同步集合: ' + collection, data: null });
        if (!ctx || !ctx.user) return sendJson(res, 401, { code: 401, message: '未登录或登录已过期', data: null });
        if (req.method === 'GET') return await handlePull(req, res, db, url, ctx, collection);
        if (req.method === 'POST') return await handlePush(req, res, db, ctx, collection);
        return sendJson(res, 405, { code: 405, message: '方法不允许', data: null });
      }

      return sendJson(res, 404, { code: 404, message: '接口不存在: ' + p, data: null });
    } catch (e) {
      const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
      return sendJson(res, 500, { code: 500, message: isProd ? '服务器错误，请稍后重试' : ('服务器错误: ' + e.message), data: null });
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log('==================================================');
    console.log('   新传研背 后端服务已启动');
    console.log('   API:      http://localhost:' + PORT + '/api');
    console.log('   健康检查: http://localhost:' + PORT + '/api/health');
    console.log('==================================================');
  });
}

main().catch((e) => {
  console.error('[fatal] 启动失败:', e);
  process.exit(1);
});

module.exports = { server: null };
