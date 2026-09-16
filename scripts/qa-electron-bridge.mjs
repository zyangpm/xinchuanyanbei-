// ===== V5.1 Electron 双应用共享桥 E2E 验证 =====
// 真实启动两个独立 Electron 应用（管理后台 + 学生端），验证：
//  T0 两端 preload 均注入 window.xcShared(mode=electron)
//  T1 后台新增已发布名词 → shared.json → 学生端知识库/名词数据出现
//  T2 后台删除该题 → overlay deleted → 学生端刷新后消失（下架联动）
//  T3 后台新增真实资料 → 学生端出现；后台 4 条 _seed 示例资料绝不泄漏
//  T4 学生端提交反馈 → shared.json → 后台重启后合并可见
//
// 运行：node scripts/qa-electron-bridge.mjs
// 不依赖 Playwright，直接用 CDP（WebSocket）驱动两个 Electron 窗口。

import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ELECTRON = path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe');
const ADMIN_APP = path.join(ROOT, 'apps', 'admin');
const MOBILE_APP = path.join(ROOT, 'apps', 'mobile');
const ADMIN_PORT = 9226;
const MOBILE_PORT = 9225;
const SHARED_FILE = path.join(os.homedir(), '.xinchuan-yanbei', 'shared.json');

const TITLE_NOUN = '电桥自测名词Q1';
const TITLE_MAT = '电桥自测讲义M1';
const CONTENT_FB = '电桥反馈F1';

let pass = 0, fail = 0;
const logs = [];
function check(name, cond, ev) {
  if (cond) { pass++; logs.push('PASS ' + name); }
  else { fail++; logs.push('ERROR ' + name + ' :: ' + String(typeof ev === 'string' ? ev : JSON.stringify(ev)).slice(0, 300)); }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function readShared() {
  try { return JSON.parse(fs.readFileSync(SHARED_FILE, 'utf8')); } catch (e) { return null; }
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.mid = 0;
    this.pending = new Map();
  }
  open() {
    return new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => {
        this.ws.addEventListener('message', (e) => {
          const m = JSON.parse(e.data);
          if (m.id && this.pending.has(m.id)) {
            const { resolve, reject } = this.pending.get(m.id);
            this.pending.delete(m.id);
            m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
          }
        });
        resolve();
      });
      this.ws.addEventListener('error', reject);
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.mid;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async ev(expr) {
    await this.send('Runtime.enable');
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'evaluate error');
    }
    return r.result.value;
  }
  // 触发导航/reload：不能等回包（JS 上下文会被销毁，CDP 响应可能永远丢失），发出即走
  post(expr) {
    this.ws.send(JSON.stringify({ id: ++this.mid, method: 'Runtime.evaluate', params: { expression: expr } }));
  }
}

// reload/导航后轮询，直到渲染侧脚本恢复可响应
async function waitAlive(cdp, wantPath, timeoutMs = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const p = await cdp.ev('location.pathname');
      if (!wantPath || String(p).indexOf(wantPath) !== -1) return true;
    } catch (e) { /* 上下文重建中 */ }
    await sleep(300);
  }
  throw new Error('等待页面就绪超时: ' + wantPath);
}

async function waitTarget(port, urlRe, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const t = list.find(x => x.type === 'page' && urlRe.test(x.url || ''));
      if (t) return t;
    } catch (e) { /* 端口未就绪 */ }
    await sleep(500);
  }
  throw new Error('等待 CDP target 超时: ' + port);
}

async function connect(port, urlRe) {
  const t = await waitTarget(port, urlRe);
  const cdp = new CDP(t.webSocketDebuggerUrl);
  await cdp.open();
  // 等待渲染进程脚本就绪
  for (let i = 0; i < 20; i++) {
    try { await cdp.ev('document.readyState'); break; } catch (e) { await sleep(300); }
  }
  return cdp;
}

let procs = [];
function killTree(proc) {
  try { execSync(`taskkill /pid ${proc.pid} /t /f`, { stdio: 'ignore' }); } catch (e) { /* 已退出 */ }
}

(async () => {
  if (!fs.existsSync(ELECTRON)) throw new Error('找不到 electron.exe: ' + ELECTRON);

  // 0. 清掉历史共享文件，保证从零开始
  try { fs.rmSync(SHARED_FILE, { force: true }); } catch (e) {}

  console.log('[boot] 启动管理后台 Electron :' + ADMIN_PORT);
  const adminProc = spawn(ELECTRON, [ADMIN_APP, `--remote-debugging-port=${ADMIN_PORT}`], { stdio: 'ignore' });
  procs.push(adminProc);
  console.log('[boot] 启动学生端 Electron :' + MOBILE_PORT);
  const mobileProc = spawn(ELECTRON, [MOBILE_APP, `--remote-debugging-port=${MOBILE_PORT}`], { stdio: 'ignore' });
  procs.push(mobileProc);

  let admin, mobile;
  try {
    admin = await connect(ADMIN_PORT, /\/apps\/admin\/index\.html/);
    mobile = await connect(MOBILE_PORT, /\/apps\/mobile\/app\/index\.html/);
    console.log('[boot] 两端 CDP 已连接');

    // 两端各自清空本地存储并重启页面逻辑，排除历史数据干扰
    // reload 会销毁 JS 上下文，CDP 调用必须 fire-and-forget，再轮询等待新上下文
    await admin.ev(`localStorage.clear()`);
    await mobile.ev(`localStorage.clear()`);
    admin.post(`location.reload()`);
    mobile.post(`location.reload()`);
    await waitAlive(admin, '/apps/admin/index.html');
    await waitAlive(mobile, '/apps/mobile/app/index.html');
    await sleep(2000); // 等 DB.init（后台）/ XCSync.init（学生端）完成

    // ---------- T0 共享桥注入 ----------
    const adminBridge = await admin.ev(`(window.xcShared && window.xcShared.mode) || null`);
    const mobileBridge = await mobile.ev(`(window.xcShared && window.xcShared.mode) || null`);
    check('T0 管理端 xcShared 注入(electron)', adminBridge === 'electron', adminBridge);
    check('T0 学生端 xcShared 注入(electron)', mobileBridge === 'electron', mobileBridge);

    // ---------- T1 后台新增已发布名词 → 学生端可见 ----------
    const qid = await admin.ev(`DB.addQuestion({
      contentId: null, questionType: 'noun', title: '${TITLE_NOUN}',
      category: '传播学原理', tag: '电桥自测', status: 'published',
      publishedAt: new Date().toISOString(),
      contentJson: '电桥名词释义第一行\\n电桥名词要点第二行'
    }).id`);
    await sleep(400);

    const shared1 = readShared();
    check('T1 shared.json 写入 overlay', !!(shared1 && shared1.xc_question_sync && shared1.xc_question_sync[String(qid)]),
      shared1 && Object.keys(shared1));
    check('T1 overlay 题目标题/状态正确',
      shared1.xc_question_sync[String(qid)] &&
      shared1.xc_question_sync[String(qid)].title === TITLE_NOUN &&
      shared1.xc_question_sync[String(qid)].status === 'published',
      shared1.xc_question_sync[String(qid)]);

    // 学生端进知识库（xc-sync.js 随页面加载重新 init，应用 overlay）
    mobile.post(`location.href = 'knowledge.html'`);
    await waitAlive(mobile, 'knowledge.html');
    await sleep(2000);
    const seen1 = await mobile.ev(`JSON.stringify({
      hasNoun: !!(typeof nounData !== 'undefined' && nounData['${TITLE_NOUN}']),
      rows: Array.prototype.slice.call(document.querySelectorAll('.lib-row'))
        .filter(function(r){ return r.textContent.indexOf('${TITLE_NOUN}') !== -1; }).length
    })`).then(JSON.parse);
    check('T1 学生端 nounData 出现后台新题', seen1.hasNoun === true, seen1);
    check('T1 学生端知识库列表渲染该题', seen1.rows >= 1, seen1);

    // ---------- T2 后台删除 → 学生端刷新后消失 ----------
    await admin.ev(`DB.deleteQuestion(${qid}); 'ok'`);
    await sleep(400);
    const shared2 = readShared();
    check('T2 shared.json overlay 标记 deleted',
      !!(shared2.xc_question_sync && shared2.xc_question_sync[String(qid)] && shared2.xc_question_sync[String(qid)].deleted === true),
      shared2.xc_question_sync && shared2.xc_question_sync[String(qid)]);

    mobile.post(`location.reload()`);
    await waitAlive(mobile, 'knowledge.html');
    await sleep(2000);
    const seen2 = await mobile.ev(`JSON.stringify({
      url: location.pathname.split('/').pop(),
      hasNoun: !!(typeof nounData !== 'undefined' && nounData['${TITLE_NOUN}']),
      rows: Array.prototype.slice.call(document.querySelectorAll('.lib-row'))
        .filter(function(r){ return r.textContent.indexOf('${TITLE_NOUN}') !== -1; }).length
    })`).then(JSON.parse);
    check('T2 学生端刷新后 nounData 已移除', seen2.hasNoun === false, seen2);
    check('T2 学生端知识库列表已无该题', seen2.rows === 0, seen2);

    // ---------- T3 后台新增真实资料 → 学生端出现；种子资料不泄漏 ----------
    const mid = await admin.ev(`DB.addMaterial({
      title: '${TITLE_MAT}', sourceType: '教材', fileType: 'PDF',
      wordCount: 100, chapterInfo: '共1章', parseStatus: 'done', uploadedBy: 'admin'
    }).id`);
    await sleep(400);
    const shared3 = readShared();
    const matInShared = shared3.xc_materials && shared3.xc_materials.some(m => m.id === mid && m.title === TITLE_MAT && !m._seed);
    check('T3 shared.json 含真实资料(无_seed)', matInShared === true,
      (shared3.xc_materials || []).map(m => m.id + ':' + (m._seed ? 'seed' : 'real')));

    mobile.post(`location.reload()`);
    await waitAlive(mobile, 'knowledge.html');
    await sleep(2000);
    const matSeen = await mobile.ev(`JSON.stringify({
      inLocal: JSON.parse(localStorage.getItem('xc_materials') || '[]').some(function(m){ return m.id === ${mid}; }),
      uploadedRows: Array.prototype.slice.call(document.querySelectorAll('.lib-row[data-material-id]'))
        .map(function(r){ return r.getAttribute('data-material-id') + '|' + r.textContent.trim(); }),
      seedLeak: Array.prototype.slice.call(document.querySelectorAll('.lib-row[data-material-id]'))
        .some(function(r){ return r.textContent.indexOf('郭庆光') !== -1 || r.textContent.indexOf('李良荣') !== -1 || r.textContent.indexOf('彭兰') !== -1; })
    })`).then(JSON.parse);
    check('T3 学生端本地合并到该资料', matSeen.inLocal === true, matSeen);
    check('T3 学生端知识库渲染该资料行', matSeen.uploadedRows.some(r => r.indexOf(String(mid)) === 0 && r.indexOf(TITLE_MAT) !== -1), matSeen.uploadedRows);
    check('T3 后台种子资料不泄漏到学生端', matSeen.seedLeak === false, matSeen.uploadedRows);

    // ---------- T4 学生端反馈 → 后台可见 ----------
    await mobile.ev(`(function(){
      localStorage.setItem('feedbacks', JSON.stringify([
        { content: '${CONTENT_FB}', contact: '', timestamp: Date.now(), type: 'other' }
      ]));
      XCSync.publishLocalCollection('feedbacks');
      return 'ok';
    })()`);
    await sleep(400);
    const shared4 = readShared();
    const fbInShared = shared4.feedbacks && shared4.feedbacks.some(f => f.content === CONTENT_FB);
    check('T4 shared.json 含学生端反馈', fbInShared === true, (shared4.feedbacks || []).map(f => f.content));

    await admin.ev(`localStorage.removeItem('feedbacks')`);
    admin.post(`location.reload()`);
    await waitAlive(admin, '/apps/admin/index.html');
    await sleep(2000);
    const fbInAdmin = await admin.ev(`(JSON.parse(localStorage.getItem('feedbacks') || '[]')).some(function(f){ return f.content === '${CONTENT_FB}'; })`);
    check('T4 后台重载后 DB.init 合并到该反馈', fbInAdmin === true,
      await admin.ev(`localStorage.getItem('feedbacks')`));

  } finally {
    console.log('[shutdown] 关闭两个 Electron 应用');
    procs.forEach(killTree);
    // 清理本轮写入的共享文件，避免污染用户真实环境
    try { fs.rmSync(SHARED_FILE, { force: true }); } catch (e) {}
  }

  console.log('\n' + logs.join('\n'));
  console.log(`\nElectron 共享桥：PASS ${pass} / FAIL ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => {
  procs.forEach(killTree);
  try { fs.rmSync(SHARED_FILE, { force: true }); } catch (_) {}
  console.error('脚本异常:', e);
  process.exit(2);
});
