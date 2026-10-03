// ===== Vercel 适配层本地回归 =====
// 用法：先设 XC_DB=turso + XC_TURSO_URL/XC_TURSO_TOKEN/XC_ADMIN_*，然后
//   node scripts/vercel-local.test.js
// 模拟 Vercel 路径分发：pathname -> api/<path>.js，动态路由注入 req.query。
const http = require('http');

// ---- 读取部署密钥 ----
const fs = require('fs');
const path = require('path');
const envFile = path.join(__dirname, '..', 'apps', 'server', 'data', '.deploy-secrets.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
process.env.XC_DB = 'turso';
process.env.XC_ADMIN_USERNAME = process.env.XC_ADMIN_USERNAME || 'admin';
// 密码必须由环境变量/密钥文件提供（.deploy-secrets.env 已 gitignore），不落代码
process.env.XC_ADMIN_PASSWORD = process.env.XC_ADMIN_PASSWORD || 'change-me';

// ---- 模拟 Vercel 路由表 ----
function loadApi(rel) { return require(path.join(__dirname, '..', 'apps', 'server', 'api', rel)); }
const ROUTES = [
  { re: /^\/api\/health$/,                    h: loadApi('health.js'),                q: {} },
  { re: /^\/api\/auth\/register$/,            h: loadApi('auth/register.js'),         q: {} },
  { re: /^\/api\/auth\/login$/,               h: loadApi('auth/login.js'),            q: {} },
  { re: /^\/api\/auth\/me$/,                  h: loadApi('auth/me.js'),               q: {} },
  { re: /^\/api\/questions\/sync$/,           h: loadApi('questions/sync.js'),        q: {} },
  { re: /^\/api\/questions\/(\d+)$/,          h: loadApi('questions/[id].js'),         q: (m) => ({ id: m[1] }) },
  { re: /^\/api\/questions$/,                 h: loadApi('questions.js'),             q: {} },
  { re: /^\/api\/admin\/users$/,              h: loadApi('admin/users.js'),           q: {} },
  { re: /^\/api\/admin\/stats$/,              h: loadApi('admin/stats.js'),           q: {} },
  { re: /^\/api\/sync\/(\w+)$/,               h: loadApi('sync/[collection].js'),     q: (m) => ({ collection: m[1] }) },
];

function findRoute(p) {
  for (const r of ROUTES) {
    const m = p.match(r.re);
    if (m) return { h: r.h, query: typeof r.q === 'function' ? r.q(m) : r.q };
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const route = findRoute(u.pathname);
  if (!route) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ code: 404, message: 'no route: ' + u.pathname })); }
  req.query = route.query;
  try {
    await route.h(req, res);
  } catch (e) {
    if (res.headersSent) return; // 已响应过则不重复写
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 500, message: 'handler error: ' + e.message }));
  }
});

function post(port, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const r = http.request({ port, path: p, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...(token ? { Authorization: 'Bearer ' + token } : {}) } }, (res) => {
      let s = ''; res.on('data', (c) => s += c); res.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { resolve({ raw: s }); } });
    });
    r.on('error', reject); r.write(data); r.end();
  });
}
function get(port, p, token) {
  return new Promise((resolve, reject) => {
    const r = http.request({ port, path: p, method: 'GET', headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}) } }, (res) => {
      let s = ''; res.on('data', (c) => s += c); res.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { resolve({ raw: s }); } });
    });
    r.on('error', reject); r.end();
  });
}

const PASS = [];
const FAIL = [];
function check(name, ok, extra) {
  (ok ? PASS : FAIL).push(name);
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (extra ? ' | ' + extra : ''));
}

(async () => {
  const port = 3999;
  await new Promise((ok) => server.listen(port, ok));
  console.log('=== Vercel 适配层回归（Turso 云端模式）===');

  // 1 健康检查
  const h = await get(port, '/api/health');
  check('health', h.code === 0 && h.data.mode === 'turso', JSON.stringify(h.data));

  // 2 注册
  const uname = 'vercel_test_' + Date.now().toString().slice(-6);
  const reg = await post(port, '/api/auth/register', { username: uname, password: 'Pass12345', nickname: '回归' });
  check('register', reg.code === 0, reg.message || '');

  // 3 登录（学生）
  const login = await post(port, '/api/auth/login', { username: uname, password: 'Pass12345' });
  check('login', login.code === 0 && !!login.data.token, login.message || '');
  const stoken = login.data && login.data.token;

  // 4 me
  const me = await get(port, '/api/auth/me', stoken);
  check('me', me.code === 0 && me.data.user.username === uname, me.message || '');

  // 5 题库公开读
  const q = await get(port, '/api/questions?limit=2');
  check('questions GET', q.code === 0 && Array.isArray(q.data), (q.data || []).length + ' 条');

  // 6 同步：推收藏（协议字段：items + questionId）
  const push = await post(port, '/api/sync/favorites', { items: [{ questionId: 'vc:测试', updatedAt: new Date().toISOString() }] }, stoken);
  check('sync push favorites', push.code === 0, push.message || '');

  // 7 同步：拉收藏
  const pull = await get(port, '/api/sync/favorites?since=2000-01-01T00:00:00Z', stoken);
  check('sync pull favorites', pull.code === 0 && Array.isArray(pull.data) && pull.data.some(r => r.questionId === 'vc:测试'), 'records=' + (pull.data || []).length);

  // 8 管理：admin 登录
  const alogin = await post(port, '/api/auth/login', { username: process.env.XC_ADMIN_USERNAME, password: process.env.XC_ADMIN_PASSWORD });
  check('admin login', alogin.code === 0 && alogin.data.user.role === 'admin', alogin.message || '');
  const atoken = alogin.data && alogin.data.token;

  // 9 管理：stats
  const stats = await get(port, '/api/admin/stats', atoken);
  check('admin stats', stats.code === 0, JSON.stringify(stats.data || {}));

  // 10 管理：users（应包含刚注册的用户 + 管理员）
  const users = await get(port, '/api/admin/users', atoken);
  check('admin users', users.code === 0 && Array.isArray(users.data) && users.data.some(u => u.username === uname), 'total=' + (users.data || []).length);

  // 11 无 token 访问管理 = 401
  const anon = await get(port, '/api/admin/stats');
  check('admin unauth 401', anon.code === 401, anon.message || '');

  // 12 学生 token 访问管理 = 403
  const stu = await get(port, '/api/admin/stats', stoken);
  check('admin student 403', stu.code === 403, stu.message || '');

  // 13 题目详情
  const first = q.data && q.data[0];
  if (first) {
    const d = await get(port, '/api/questions/' + first.id);
    check('question by id', d.code === 0 && !!d.data, (d.message || '') + ' | id=' + first.id);
  }

  // 清理测试用户（经管理接口不提供删除，直接 SQL 清理）
  const { getDb } = require(path.join(__dirname, '..', 'apps', 'server', 'src', 'vercel-handler.js'));
  const db = await getDb();
  await db.prepare('DELETE FROM users WHERE username = ?').run(uname);
  await db.prepare('DELETE FROM favorites WHERE user_id = (SELECT id FROM users WHERE username = ?)').run(uname);

  server.close();
  console.log('====================================');
  console.log('结果: ' + PASS.length + ' PASS / ' + FAIL.length + ' FAIL');
  if (FAIL.length) { console.log('失败项: ' + FAIL.join(', ')); process.exit(1); }
  console.log('VERCEL 适配层回归 ALL PASS');
})().catch((e) => { console.error('回归异常:', e); process.exit(1); });
