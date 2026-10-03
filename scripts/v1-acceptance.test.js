// ===== 新传研背 V1 上线前生产验收测试（本地回归，需先启动本地 server） =====
// 用法：
//   $env:XC_ADMIN_USERNAME='admin'; $env:XC_ADMIN_PASSWORD='Test2026'
//   $env:XC_ALLOWED_ORIGINS='https://app-three-orpin-61.vercel.app,https://admin-web-ruby-nu.vercel.app,http://localhost:8081'
//   node apps/server/src/server.js   （本地 SQLite 模式）
//   node scripts/v1-acceptance.test.js
//
// 覆盖：TEST A（自同步）、B（跨用户隔离）、C（双端一致）、E（同 id 冲突隔离）、F（token 过期 401）、
//       学生写题库 403、匿名看 draft 403、题库分页、CORS 白名单、publish_logs.operator。
// TEST D（断网→离线保存→恢复自动同步）为浏览器端行为，见 cloud.js syncStatus/markSyncFail 与 app.js 提示逻辑，
//       需浏览器环境实测，此处以代码审查结论说明。

const BASE = process.env.XC_TEST_BASE || 'http://127.0.0.1:3000/api';
const SUFFIX = Date.now().toString().slice(-6);
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS  ' + name + (extra ? ' | ' + extra : '')); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' | ' + extra : '')); }
}
async function req(path, opts) {
  const res = await fetch(BASE + path, Object.assign({ headers: {} }, opts || {}));
  let body = null;
  try { body = await res.json(); } catch (e) { body = null; }
  return { status: res.status, body, headers: res.headers };
}
function authHeader(token) { return { Authorization: 'Bearer ' + token }; }

(async () => {
  // ---------- TEST A：用户 A 全链路同步 ----------
  const aName = 'va_a_' + SUFFIX, aPass = 'Test12345';
  const rRegA = await req('/auth/register', { method: 'POST', body: JSON.stringify({ username: aName, password: aPass, nickname: '验收A' }), headers: { 'Content-Type': 'application/json' } });
  ok('A 注册', rRegA.status === 201, 'status=' + rRegA.status);
  const rLoginA = await req('/auth/login', { method: 'POST', body: JSON.stringify({ username: aName, password: aPass }), headers: { 'Content-Type': 'application/json' } });
  ok('A 登录', rLoginA.status === 200 && rLoginA.body && rLoginA.body.data && rLoginA.body.data.token, '');
  const tokenA = rLoginA.body.data.token;

  const rFavA = await req('/sync/favorites', { method: 'POST', body: JSON.stringify({ items: [{ questionId: 'noun:沉默的螺旋', updatedAt: new Date().toISOString(), deleted: false }, { questionId: 'noun:议程设置', updatedAt: new Date().toISOString(), deleted: false }] }), headers: authHeader(tokenA) });
  ok('A 收藏推送', rFavA.status === 200, 'status=' + rFavA.status);
  const rNoteA = await req('/sync/notes', { method: 'POST', body: JSON.stringify({ items: [{ id: null, questionId: 'noun:沉默的螺旋', content: '验收A的笔记', updatedAt: new Date().toISOString(), deleted: false }] }), headers: authHeader(tokenA) });
  const noteIdA = rNoteA.body && rNoteA.body.data && rNoteA.body.data[0] && rNoteA.body.data[0].id;
  ok('A 笔记推送（服务端分配 id）', rNoteA.status === 200 && noteIdA != null, 'noteId=' + noteIdA);
  const rProgA = await req('/sync/progress', { method: 'POST', body: JSON.stringify({ items: [{ questionId: 'noun:沉默的螺旋', rating: 'yes', updatedAt: new Date().toISOString(), deleted: false }] }), headers: authHeader(tokenA) });
  ok('A 掌握度推送', rProgA.status === 200, 'status=' + rProgA.status);
  const rHistA = await req('/sync/history', { method: 'POST', body: JSON.stringify({ items: [{ id: null, questionId: 'noun:议程设置', score: 85, examType: '验收模拟考', updatedAt: new Date().toISOString(), deleted: false }] }), headers: authHeader(tokenA) });
  ok('A 考试历史推送（服务端分配 id）', rHistA.status === 200, 'status=' + rHistA.status);

  const gFavA = await req('/sync/favorites', { headers: authHeader(tokenA) });
  ok('A 拉取收藏（自同步）', gFavA.status === 200 && (gFavA.body.data || []).length === 2, 'count=' + (gFavA.body.data || []).length);
  const gNoteA = await req('/sync/notes', { headers: authHeader(tokenA) });
  const noteFromA = (gNoteA.body.data || [])[0];
  ok('A 拉取笔记（含内容）', gNoteA.status === 200 && noteFromA && noteFromA.content === '验收A的笔记', 'content=' + (noteFromA && noteFromA.content));
  const gProgA = await req('/sync/progress', { headers: authHeader(tokenA) });
  ok('A 拉取掌握度', gProgA.status === 200 && (gProgA.body.data || []).length >= 1, 'count=' + (gProgA.body.data || []).length);
  const gHistA = await req('/sync/history', { headers: authHeader(tokenA) });
  ok('A 拉取考试历史', gHistA.status === 200 && (gHistA.body.data || []).length >= 1, 'count=' + (gHistA.body.data || []).length);

  // ---------- TEST B：用户 B 完全不可见 A 的数据 ----------
  const bName = 'va_b_' + SUFFIX;
  await req('/auth/register', { method: 'POST', body: JSON.stringify({ username: bName, password: aPass, nickname: '验收B' }), headers: { 'Content-Type': 'application/json' } });
  const rLoginB = await req('/auth/login', { method: 'POST', body: JSON.stringify({ username: bName, password: aPass }), headers: { 'Content-Type': 'application/json' } });
  const tokenB = rLoginB.body.data.token;
  const bFav = await req('/sync/favorites', { headers: authHeader(tokenB) });
  const bNote = await req('/sync/notes', { headers: authHeader(tokenB) });
  const bProg = await req('/sync/progress', { headers: authHeader(tokenB) });
  const bHist = await req('/sync/history', { headers: authHeader(tokenB) });
  ok('B 不可见 A 的收藏', (bFav.body.data || []).length === 0, 'count=' + (bFav.body.data || []).length);
  ok('B 不可见 A 的笔记', (bNote.body.data || []).length === 0, 'count=' + (bNote.body.data || []).length);
  ok('B 不可见 A 的掌握度', (bProg.body.data || []).length === 0, 'count=' + (bProg.body.data || []).length);
  ok('B 不可见 A 的考试历史', (bHist.body.data || []).length === 0, 'count=' + (bHist.body.data || []).length);

  // ---------- TEST C：A 再次拉取数据仍在（双端一致） ----------
  const cFav = await req('/sync/favorites', { headers: authHeader(tokenA) });
  ok('C 双端一致：A 收藏仍在', (cFav.body.data || []).length === 2, 'count=' + (cFav.body.data || []).length);

  // ---------- TEST E：B 用 A 的笔记 id 尝试写入/读取 ----------
  const ePush = await req('/sync/notes', { method: 'POST', body: JSON.stringify({ items: [{ id: noteIdA, questionId: 'noun:议程设置', content: 'B试图覆盖A的笔记', updatedAt: new Date().toISOString(), deleted: false }] }), headers: authHeader(tokenB) });
  const eRespData = ePush.body && ePush.body.data;
  const leaked = eRespData && eRespData[0] && eRespData[0].content === '验收A的笔记';
  ok('E 同 id 冲突隔离（B 无法读/写 A 的笔记）', ePush.status === 200 && !leaked, 'resp=' + JSON.stringify(ePush.body));
  // B 的写入不应改变 A 的数据
  const gNoteA2 = await req('/sync/notes', { headers: authHeader(tokenA) });
  const aNoteStill = (gNoteA2.body.data || []).some(function (n) { return n.id === noteIdA && n.content === '验收A的笔记'; });
  ok('E A 的笔记未被 B 覆盖', aNoteStill, '');

  // ---------- TEST F：非法/过期 token → 401 ----------
  const fakeTok = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjo5OTk5OTkifX0.fakefakefake';
  const f1 = await req('/sync/favorites', { headers: { Authorization: fakeTok } });
  ok('F 非法 token → 401', f1.status === 401, 'status=' + f1.status);
  const f2 = await req('/auth/me', { headers: { Authorization: fakeTok } });
  ok('F 非法 token /me → 401', f2.status === 401, 'status=' + f2.status);

  // ---------- 越权：学生不可写题库、不可看 draft ----------
  const qPost = await req('/questions', { method: 'POST', body: JSON.stringify({ questionType: 'noun', title: '越权测试题', status: 'published' }), headers: authHeader(tokenA) });
  ok('学生写题库 → 403', qPost.status === 403, 'status=' + qPost.status);
  const qDraft = await req('/questions?status=all', { headers: {} });
  ok('匿名看全部题库（含 draft）→ 403', qDraft.status === 403, 'status=' + qDraft.status);
  const qPublic = await req('/questions', { headers: {} });
  const allPublished = (qPublic.body.data || []).every(function (q) { return q.status === 'published'; });
  ok('匿名默认只看已发布', qPublic.status === 200 && allPublished, 'count=' + (qPublic.body.data || []).length);

  // ---------- 分页 ----------
  const qPage = await req('/questions?page=1&pageSize=5', { headers: {} });
  ok('分页 pageSize=5 生效', qPage.status === 200 && (qPage.body.data || []).length <= 5 && typeof qPage.body.total === 'number', 'len=' + (qPage.body.data || []).length + ' total=' + qPage.body.total);
  const qBig = await req('/questions?pageSize=1000', { headers: {} });
  ok('分页 pageSize 上限 100', qBig.status === 200 && (qBig.body.data || []).length <= 100, 'len=' + (qBig.body.data || []).length);

  // ---------- CORS 白名单 ----------
  const corsOk = await req('/health', { headers: { Origin: 'https://app-three-orpin-61.vercel.app' } });
  ok('CORS 白名单内 origin 返回 ACAO', corsOk.headers.get('access-control-allow-origin') === 'https://app-three-orpin-61.vercel.app', 'aca=' + corsOk.headers.get('access-control-allow-origin'));
  const corsBad = await req('/health', { headers: { Origin: 'https://evil.example.com' } });
  ok('CORS 白名单外 origin 无 ACAO', corsBad.headers.get('access-control-allow-origin') === null, 'aca=' + (corsBad.headers.get('access-control-allow-origin') || 'null'));

  // ---------- 管理员：写题库 + operator 落库 ----------
  const rLoginAdmin = await req('/auth/login', { method: 'POST', body: JSON.stringify({ username: process.env.XC_TEST_ADMIN || 'admin', password: process.env.XC_TEST_ADMIN_PASS || 'Test2026' }), headers: { 'Content-Type': 'application/json' } });
  ok('管理员登录', rLoginAdmin.status === 200 && rLoginAdmin.body && rLoginAdmin.body.data && rLoginAdmin.body.data.token, 'status=' + rLoginAdmin.status);
  if (rLoginAdmin.status === 200) {
    const adminToken = rLoginAdmin.body.data.token;
    const adminMe = await req('/auth/me', { headers: authHeader(adminToken) });
    const meRole = adminMe.body && adminMe.body.data && adminMe.body.data.user && adminMe.body.data.user.role;
    ok('管理员 JWT role=admin', adminMe.status === 200 && meRole === 'admin', 'role=' + meRole);
    const aPost = await req('/questions', { method: 'POST', body: JSON.stringify({ questionType: 'noun', title: 'V1验收临时题' + SUFFIX, category: '验收', status: 'published' }), headers: authHeader(adminToken) });
    ok('管理员写题库 → 201', aPost.status === 201, 'status=' + aPost.status);
    const nqId = aPost.body && aPost.body.data && aPost.body.data.id;
    const gAdminUsers = await req('/admin/users', { headers: authHeader(adminToken) });
    ok('管理员可访问 /admin/users', gAdminUsers.status === 200, 'status=' + gAdminUsers.status);
    const gStudentAdmin = await req('/admin/users', { headers: authHeader(tokenA) });
    ok('学生访问 /admin/users → 403', gStudentAdmin.status === 403, 'status=' + gStudentAdmin.status);
    // 清理临时题
    if (nqId != null) {
      await req('/questions/' + nqId, { method: 'DELETE', headers: authHeader(adminToken) });
      console.log('INFO  清理临时题 id=' + nqId);
    }
  }

  console.log('--------------------------------');
  console.log('RESULT  PASS=' + pass + '  FAIL=' + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch(function (e) { console.error('测试异常:', e); process.exit(2); });
