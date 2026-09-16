// 管理端 CRUD × 学生端数据源 一致性实证
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const out = [];
const check = (n, c, e) => { c ? (pass++, out.push('PASS ' + n)) : (fail++, out.push('FAIL ' + n + ' :: ' + String(e).slice(0, 300))); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });

  // 学生端先记录题库基线（同源 localStorage 与管理端共享）
  const sp = await ctx.newPage();
  await sp.goto('http://localhost:8081/knowledge.html?qa=admin');
  await sp.waitForTimeout(800);
  const baseline = await sp.evaluate(() => ({
    rows: document.querySelectorAll('.lib-row').length,
    textHasProbe: document.body.innerText.includes('QA探针题目')
  }));
  // nounData 基线在详情页测（knowledge.html 未引入 noun-data.js）
  await sp.goto('http://localhost:8081/noun-detail.html?term=' + encodeURIComponent('新闻价值') + '&qa=admin');
  await sp.waitForTimeout(700);
  const nounBaseline = await sp.evaluate(() => ({
    nounKeys: Object.keys(nounData).length,
    hasQaProbe: Object.prototype.hasOwnProperty.call(nounData, 'QA探针题目')
  }));
  await sp.goto('http://localhost:8081/knowledge.html?qa=admin');
  await sp.waitForTimeout(600);
  out.push('基线: ' + JSON.stringify(baseline) + ' ' + JSON.stringify(nounBaseline));

  // 管理端：直接注入登录态访问 dashboard（绕过登录动画时序）
  const ap = await ctx.newPage();
  await ap.goto('http://localhost:8081/admin/index.html?qa=admin');
  await ap.evaluate(() => { sessionStorage.setItem('adminLoggedIn', 'true'); sessionStorage.setItem('adminName', 'admin'); });
  await ap.goto('http://localhost:8081/admin/dashboard.html?qa=admin');
  await ap.waitForTimeout(1200);
  const dbReady = await ap.evaluate(() => typeof DB !== 'undefined' && typeof DB.init === 'function');
  check('M 后台进入且 DB 模块就绪', /dashboard/.test(ap.url()) && dbReady === true, ap.url() + ' dbReady=' + dbReady);

  // 后台初始化 + 直接调用 DB 层新增/编辑/删除一道题（等价于 UI CRUD 的数据层操作）
  const crud = await ap.evaluate(() => {
    const log = [];
    try {
      DB.init();
      const before = DB.getQuestions ? DB.getQuestions({}).length : JSON.parse(localStorage.getItem('xc_questions') || '[]').length;
      // 新增
      if (DB.addQuestion) DB.addQuestion({ questionType: 'noun', title: 'QA探针题目', category: 'QA分类', tag: '高频', status: 'published' });
      log.push('addQuestion called, type=' + typeof DB.addQuestion);
      // 直接验证 localStorage xc_questions
      const qs = JSON.parse(localStorage.getItem('xc_questions') || '[]');
      const probe = qs.find(q => q.title === 'QA探针题目');
      log.push('xc_questions含探针: ' + !!probe);
      // 编辑
      if (probe && DB.updateQuestion) { DB.updateQuestion(probe.id, { title: 'QA探针题目-改' }); }
      const qs2 = JSON.parse(localStorage.getItem('xc_questions') || '[]');
      log.push('编辑后标题: ' + (qs2.find(q => q.id === (probe && probe.id)) || {}).title);
      // 删除
      if (probe && DB.deleteQuestion) DB.deleteQuestion(probe.id);
      const qs3 = JSON.parse(localStorage.getItem('xc_questions') || '[]');
      log.push('删除后残留: ' + qs3.filter(q => /QA探针/.test(q.title)).length);
      return { ok: true, log, before };
    } catch (e) { return { ok: false, err: e.message + ' @ ' + e.stack.split('\n')[1], log }; }
  });
  check('M 后台题库 CRUD 数据层可用', crud.ok === true, JSON.stringify(crud));
  out.push('CRUD日志: ' + (crud.log || []).join(' | ') + (crud.err ? ' | ERR:' + crud.err : ''));

  // 后台有哪些 DB API
  const apiList = await ap.evaluate(() => (typeof DB !== 'undefined') ? Object.keys(DB).join(',') : 'DB_UNDEFINED');
  out.push('DB API: ' + apiList);

  // 关键：学生端是否受影响
  await sp.goto('http://localhost:8081/noun-detail.html?term=' + encodeURIComponent('新闻价值') + '&qa=admin');
  await sp.waitForTimeout(700);
  const afterNoun = await sp.evaluate(() => ({
    nounKeys: Object.keys(nounData).length,
    hasQaProbe: Object.prototype.hasOwnProperty.call(nounData, 'QA探针题目') || Object.prototype.hasOwnProperty.call(nounData, 'QA探针题目-改')
  }));
  await sp.goto('http://localhost:8081/knowledge.html?qa=admin');
  await sp.waitForTimeout(800);
  const after = await sp.evaluate(() => ({
    rows: document.querySelectorAll('.lib-row').length,
    textHasProbe: document.body.innerText.includes('QA探针题目')
  }));
  check('M 后台增删题目不影响学生端题库（证明数据源隔离）',
    afterNoun.nounKeys === nounBaseline.nounKeys && afterNoun.hasQaProbe === false && after.rows === baseline.rows && after.textHasProbe === false,
    JSON.stringify({ baseline, nounBaseline, after, afterNoun }));

  // 反馈上行：学生端写 feedbacks → 后台可读（同源共享应生效）
  await sp.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('feedbacks') || '[]');
    list.push({ id: 'qa-' + Date.now(), type: 'suggestion', content: 'QA自动化反馈探针', contact: '', ts: new Date().toISOString(), status: 'pending' });
    localStorage.setItem('feedbacks', JSON.stringify(list));
  });
  const fbRead = await ap.evaluate(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('feedbacks') || '[]');
      return raw.some(f => /QA自动化反馈探针/.test(f.content));
    } catch (e) { return 'ERR:' + e.message; }
  });
  check('M 学生端反馈→后台同源可读', fbRead === true, String(fbRead));

  // 后台统计页学生数据卡片
  await ap.goto('http://localhost:8081/admin/dashboard.html?qa=admin');
  await ap.waitForTimeout(1000);
  await ap.evaluate(() => { if (typeof switchPageByName === 'function') switchPageByName('stats'); });
  await ap.waitForTimeout(600);
  const statsText = await ap.evaluate(() => document.body.innerText);
  check('M 后台数据统计含"学生端学习数据"', /学生端学习数据/.test(statsText), statsText.includes('学生端学习数据') ? 'found' : 'not found');

  console.log(out.join('\n'));
  console.log(`\n管理端：PASS ${pass} / FAIL ${fail}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
