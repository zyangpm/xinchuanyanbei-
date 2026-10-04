// ===== 新传研背 · P0-3 线上脏数据清理脚本 =====
// 用途：删除验收期间混入线上题库的 5 条脏数据（越权测试×3、乱码????×2，id=30/31/32/34/36）。
// 用法（三选一）：
//   node scripts/clean-dirty-data.js --password <管理员密码>
//   或 设置环境变量 XC_ADMIN_PASSWORD=<密码> 后执行 node scripts/clean-dirty-data.js
//   或 设置 XC_ADMIN_USERNAME（默认 admin）与 XC_ADMIN_PASSWORD 后执行
// 安全说明：凭据仅从环境变量/参数读取，不写入仓库；只删除指定 id，不触碰其他数据。
const BASE = 'https://server-lilac-nu.vercel.app/api';
const DIRTY_IDS = [30, 31, 32, 34, 36];

const args = process.argv.slice(2);
const pwIdx = args.indexOf('--password');
const password = pwIdx >= 0 ? args[pwIdx + 1] || '' : (process.env.XC_ADMIN_PASSWORD || '');
const username = process.env.XC_ADMIN_USERNAME || 'admin';

function pick(r) { return r.json().catch(() => null); }
function H(t) { return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }; }

(async () => {
  if (!password) {
    console.error('缺少管理员密码：请用 --password <密码> 传入，或设置环境变量 XC_ADMIN_PASSWORD');
    process.exit(1);
  }
  console.log('1) 管理员登录', username);
  let r = await fetch(BASE + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  const login = await pick(r);
  if (r.status !== 200 || !login.data || !login.data.token) {
    console.error('登录失败：', r.status, login.message || '');
    process.exit(2);
  }
  const token = login.data.token;
  console.log('   登录成功（user:', login.data.user && login.data.user.username, 'role:', login.data.user && login.data.user.role, '）');

  if (login.data.user && login.data.user.role !== 'admin') {
    console.error('当前账号不是管理员，无法清理题库');
    process.exit(3);
  }

  console.log('2) 清理目标 id：', DIRTY_IDS.join(', '));
  let ok = 0, fail = 0;
  for (const id of DIRTY_IDS) {
    r = await fetch(BASE + '/questions/' + id, { method: 'DELETE', headers: H(token) });
    const body = await pick(r);
    if (r.status === 200 && body.code === 0) { console.log('   id=' + id, '已删除 ✓'); ok++; }
    else { console.log('   id=' + id, '删除失败', r.status, (body && body.message) || ''); fail++; }
  }

  console.log('3) 复核剩余题目');
  r = await fetch(BASE + '/questions?page=1&pageSize=100', { headers: H(token) });
  const list = await pick(r);
  const items = (list.data && (Array.isArray(list.data) ? list.data : list.data.items)) || [];
  const dirty = items.filter((q) => DIRTY_IDS.indexOf(q.id) >= 0 || /越权测试|\?\?\?\?/.test(q.title || ''));
  console.log('   剩余题目数：', items.length);
  console.log('   剩余脏数据：', dirty.length ? dirty.map((q) => q.id + ':' + q.title).join(', ') : '无 ✓');

  console.log('清理完成：成功', ok, '失败', fail, dirty.length ? '（仍有残留，请人工检查）' : '（已全部清除）');
})().catch((e) => { console.error('脚本异常：', e.message); process.exit(4); });
