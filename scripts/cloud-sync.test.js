// ===== 新传研背 · 云端同步引擎回归测试（V6.0）=====
// 运行前提：本地后端已启动（node apps/server/src/server.js，端口 3000）
// 运行方式：node scripts/cloud-sync.test.js
// 覆盖：自动注册登录 → 本地数据上传 → 云端拉取合并 → 收藏删除标记同步
const path = require('path');
const assert = require('assert');

// ---- mock 浏览器环境（cloud.js 依赖：localStorage / location / fetch）----
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
global.location = { protocol: 'file:' }; // 触发 file: -> localhost:3000/api

const Cloud = require(path.join(__dirname, '..', 'apps', 'mobile', 'app', 'cloud.js'));

function log(title, obj) {
  console.log('[' + title + ']', JSON.stringify(obj));
}

(async () => {
  const USER = '13800001111';
  const PASS = 'test123456';
  const results = [];

  // 1. 登录（未注册 -> 自动注册）
  const auth = await Cloud.login(USER, PASS);
  assert.ok(Cloud.isLoggedIn(), '登录后应处于登录态');
  results.push({ step: '1-登录/自动注册', ok: true, user: auth.user.username });

  // 2. 写入本地数据后全量同步上传
  localStorage.setItem('favorites', JSON.stringify([{ type: 'noun', id: '沉默的螺旋', title: '沉默的螺旋', tag: '高频', ts: Date.now() }]));
  localStorage.setItem('notes', JSON.stringify([{ content: '云同步测试笔记', timestamp: new Date().toISOString() }]));
  localStorage.setItem('wordRatings', JSON.stringify({ 'noun:议程设置': { rating: 'yes', ts: new Date().toISOString() } }));
  const sync1 = await Cloud.syncAll();
  assert.ok(sync1.ok, 'syncAll 应成功');
  results.push({ step: '2-本地数据上传', ok: true, favorites: JSON.parse(localStorage.getItem('favorites')).length, notes: JSON.parse(localStorage.getItem('notes')).length });

  // 3. 模拟"另一台设备"的账号数据：先清空本地，再从云端拉取合并（增量同步）
  const favsBefore = JSON.parse(localStorage.getItem('favorites'));
  localStorage.removeItem('favorites');
  localStorage.removeItem('notes');
  localStorage.removeItem('wordRatings');
  localStorage.removeItem('xc_sync_since');
  const sync2 = await Cloud.syncAll();
  const favsAfter = JSON.parse(localStorage.getItem('favorites') || '[]');
  const notesAfter = JSON.parse(localStorage.getItem('notes') || '[]');
  const ratingsAfter = JSON.parse(localStorage.getItem('wordRatings') || '{}');
  assert.ok(favsAfter.length >= 1, '收藏应从云端恢复');
  assert.ok(notesAfter.length >= 1, '笔记应从云端恢复');
  assert.ok(ratingsAfter['noun:议程设置'], '掌握度应从云端恢复');
  results.push({ step: '3-云端拉取恢复', ok: true, favorites: favsAfter.length, notes: notesAfter.length });

  // 4. 收藏删除标记：取消收藏后云端应软删除，重新拉取不复活
  const fav = favsAfter[0];
  await Cloud.pushFav(fav, true);
  localStorage.removeItem('favorites');
  localStorage.removeItem('xc_sync_since');
  const sync3 = await Cloud.syncAll();
  const favsFinal = JSON.parse(localStorage.getItem('favorites') || '[]');
  const revived = favsFinal.some((f) => f.type === fav.type && f.id === fav.id);
  assert.ok(!revived, '已取消的收藏不应从云端复活');
  results.push({ step: '4-删除标记不同步复活', ok: true, revived: false });

  // 5. 登出清理
  Cloud.logout();
  assert.ok(!Cloud.isLoggedIn(), '登出后应清除登录态');
  results.push({ step: '5-登出清理', ok: true });

  log('全部通过', results);
  console.log('\n云端同步回归测试 PASS ✓');
  process.exit(0);
})().catch((e) => {
  console.error('测试失败:', e.message);
  console.error(e.stack);
  process.exit(1);
});
