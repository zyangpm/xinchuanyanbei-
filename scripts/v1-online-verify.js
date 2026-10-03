// ===== 新传研背 V1 线上验收（真实 Turso 生产库） =====
// 用法：node scripts/v1-online-verify.js
// 覆盖：健康/CORS/分页/匿名限制/跨用户隔离(hr_demo2 vs va_web)/学生越权/admin 闭环/ai-proxy 路由
const BASE = 'https://server-lilac-nu.vercel.app/api';
const APP = 'https://app-three-orpin-61.vercel.app';
const ADMIN_PASS = process.env.XC_ONLINE_ADMIN_PASS || '__REDACTED__';
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
const H = (token) => ({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // 1) 健康
  const h = await req('/health');
  ok('线上 health 200 + turso', h.status === 200 && h.body.data.mode === 'turso', 'mode=' + (h.body.data && h.body.data.mode));

  // 2) CORS 白名单内
  const c1 = await fetch(BASE + '/health', { headers: { Origin: 'https://app-three-orpin-61.vercel.app' } });
  ok('CORS 白名单内返回 ACAO', c1.headers.get('access-control-allow-origin') === 'https://app-three-orpin-61.vercel.app', 'aca=' + c1.headers.get('access-control-allow-origin'));
  // 3) CORS 白名单外
  const c2 = await fetch(BASE + '/health', { headers: { Origin: 'https://evil.example.com' } });
  ok('CORS 白名单外无 ACAO', c2.headers.get('access-control-allow-origin') === null, 'aca=' + (c2.headers.get('access-control-allow-origin') || 'null'));
  // 4) OPTIONS 预检
  const c3 = await fetch(BASE + '/questions', { method: 'OPTIONS', headers: { Origin: 'https://app-three-orpin-61.vercel.app', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'content-type,authorization' } });
  ok('CORS OPTIONS 预检 204', c3.status === 204, 'status=' + c3.status);

  // 5) 分页 + published 基线
  const q1 = await req('/questions?page=1&pageSize=5');
  ok('题库分页 pageSize=5 + total', q1.status === 200 && q1.body.data.length <= 5 && typeof q1.body.total === 'number', 'len=' + q1.body.data.length + ' total=' + q1.body.total);
  const allPub = (q1.body.data || []).every((x) => x.status === 'published');
  ok('题库列表全为已发布', allPub, '');
  const q2 = await req('/questions?status=all');
  ok('匿名看 draft/all → 403', q2.status === 403, 'status=' + q2.status);

  // 6) 测试学生：先登录，不存在则注册一次（固定测试账号 va_web_acceptance，避免每次新增残留）
  let lv = await req('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'va_web_acceptance', password: 'Test12345' }), headers: { 'Content-Type': 'application/json' } });
  if (lv.status !== 200) {
    await req('/auth/register', { method: 'POST', body: JSON.stringify({ username: 'va_web_acceptance', password: 'Test12345', nickname: '线上验收' }), headers: { 'Content-Type': 'application/json' } });
    lv = await req('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'va_web_acceptance', password: 'Test12345' }), headers: { 'Content-Type': 'application/json' } });
  }
  const vTok = lv.body && lv.body.data && lv.body.data.token;
  ok('测试学生登录', lv.status === 200 && !!vTok, 'status=' + lv.status);
  const lh = await req('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'hr_demo2', password: 'Test12345' }), headers: { 'Content-Type': 'application/json' } });
  const hTok = lh.body && lh.body.data && lh.body.data.token;
  ok('hr_demo2 登录', lh.status === 200 && !!hTok, 'status=' + lh.status);

  // 7) 学生越权
  const qPost = await req('/questions', { method: 'POST', body: JSON.stringify({ questionType: 'noun', title: '越权测试', status: 'published' }), headers: H(vTok) });
  ok('学生写题库 → 403', qPost.status === 403, 'status=' + qPost.status);
  const aUsers = await req('/admin/users', { headers: H(vTok) });
  ok('学生访问 /admin/users → 403', aUsers.status === 403, 'status=' + aUsers.status);

  // 8) 跨用户隔离（B=va_web 推收藏，A=hr_demo2 推收藏 → 互不可见）
  const keyV = 'noun:隔离验收B' + Date.now().toString().slice(-4);
  const keyH = 'noun:隔离验收A' + Date.now().toString().slice(-4);
  const pv = await req('/sync/favorites', { method: 'POST', body: JSON.stringify({ items: [{ questionId: keyV, updatedAt: new Date().toISOString(), deleted: false }] }), headers: H(vTok) });
  ok('B 推收藏', pv.status === 200, 'status=' + pv.status);
  const ph = await req('/sync/favorites', { method: 'POST', body: JSON.stringify({ items: [{ questionId: keyH, updatedAt: new Date().toISOString(), deleted: false }] }), headers: H(hTok) });
  ok('A 推收藏', ph.status === 200, 'status=' + ph.status);
  const gv = await req('/sync/favorites', { headers: H(vTok) });
  const vKeys = (gv.body.data || []).map((x) => x.questionId);
  const gh = await req('/sync/favorites', { headers: H(hTok) });
  const hKeys = (gh.body.data || []).map((x) => x.questionId);
  ok('B 看不到 A 的收藏（A→B 隔离）', vKeys.indexOf(keyH) < 0, '');
  ok('A 看不到 B 的收藏（B→A 隔离）', hKeys.indexOf(keyV) < 0, '');
  // 清理测试收藏（同 token 置 deleted）
  await req('/sync/favorites', { method: 'POST', body: JSON.stringify({ items: [{ questionId: keyV, updatedAt: new Date().toISOString(), deleted: true }] }), headers: H(vTok) });
  await req('/sync/favorites', { method: 'POST', body: JSON.stringify({ items: [{ questionId: keyH, updatedAt: new Date().toISOString(), deleted: true }] }), headers: H(hTok) });
  console.log('INFO  测试收藏已清理');

  // 9) 管理员闭环：登录 → 写题 → 查看 → 删除
  const la = await req('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: ADMIN_PASS }), headers: { 'Content-Type': 'application/json' } });
  const aTok = la.body && la.body.data && la.body.data.token;
  ok('管理员登录（新密码）', la.status === 200 && !!aTok, 'status=' + la.status);
  if (aTok) {
    const aPost = await req('/questions', { method: 'POST', body: JSON.stringify({ questionType: 'noun', title: 'V1线上验收临时题' + Date.now().toString().slice(-5), category: '验收', status: 'published' }), headers: H(aTok) });
    const nq = aPost.body && aPost.body.data;
    ok('管理员写题库 → 201', aPost.status === 201 && nq && nq.id != null, 'id=' + (nq && nq.id));
    const aMe = await req('/auth/me', { headers: H(aTok) });
    ok('管理员 JWT role=admin', aMe.status === 200 && aMe.body.data.user.role === 'admin', 'role=' + (aMe.body.data && aMe.body.data.user && aMe.body.data.user.role));
    const aUsers2 = await req('/admin/users', { headers: H(aTok) });
    ok('管理员 /admin/users → 200', aUsers2.status === 200 && Array.isArray(aUsers2.body.data), 'users=' + (aUsers2.body.data || []).length);
    const aStats = await req('/admin/stats', { headers: H(aTok) });
    ok('管理员 /admin/stats → 200', aStats.status === 200 && typeof aStats.body.data.questions === 'number', 'questions=' + (aStats.body.data && aStats.body.data.questions));
    if (nq && nq.id != null) {
      const aDel = await req('/questions/' + nq.id, { method: 'DELETE', headers: H(aTok) });
      ok('管理员删题 → 200', aDel.status === 200, 'status=' + aDel.status);
      console.log('INFO  临时题已清理 id=' + nq.id);
    }
    // 学生删除他人题 → 403
    const sDel = await req('/questions/1', { method: 'DELETE', headers: H(vTok) });
    ok('学生删他人题 → 403', sDel.status === 403, 'status=' + sDel.status);
  }

  // 10) 线上 ai-proxy 路由（学生端 Vercel Function）
  try {
    const p = await fetch(APP + '/api/ai-proxy?u=' + encodeURIComponent('https://api.deepseek.com/chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sk-invalid-key-for-route-test', Origin: APP },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }] })
    });
    const txt = await p.text();
    // 路由存在：无论 401（key 无效）还是 200，都说明函数已上线；404 才是失败
    ok('线上 /api/ai-proxy 路由存在', p.status === 401 || p.status === 200, 'status=' + p.status + ' body=' + txt.slice(0, 120));
  } catch (e) {
    ok('线上 /api/ai-proxy 路由存在', false, e.message);
  }

  // 11) 学生端页面 200
  try {
    const s = await fetch(APP + '/login', { redirect: 'manual' });
    ok('学生端页面可访问', s.status === 200, 'status=' + s.status);
  } catch (e) { ok('学生端页面可访问', false, e.message); }

  console.log('--------------------------------');
  console.log('RESULT  PASS=' + pass + '  FAIL=' + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('测试异常:', e); process.exit(2); });
