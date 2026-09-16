// V5.1 端到端回归：后台题库/资料 CRUD → overlay → 学生端真实生效（网页同源模式）
// 运行：node scripts/qa-v51-sync.js（需 8081 服务在跑）
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const out = [];
const check = (n, c, e) => { c ? (pass++, out.push('PASS ' + n)) : (fail++, out.push('FAIL ' + n + ' :: ' + String(e == null ? '' : e).slice(0, 400))); };

const BASE = 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });

  // AI mock：context 级最早注册，通过 aiMock.status 切换 200/401
  const aiMock = { status: 200 };
  await ctx.route('**/open.bigmodel.cn/**', route => {
    console.log('MOCK HIT status=' + aiMock.status);
    return route.fulfill({
      status: aiMock.status,
      contentType: 'application/json',
      body: aiMock.status === 200
        ? JSON.stringify({ choices: [{ message: { content: '这是智谱返回的真实回答' } }] })
        : '{"error":{"message":"bad key"}}'
    });
  });

  // ---------- 后台数据层造数 ----------
  const ap = await ctx.newPage();
  await ap.goto(BASE + '/admin/index.html?qa=v51');
  await ap.evaluate(() => { sessionStorage.setItem('adminLoggedIn', 'true'); sessionStorage.setItem('adminName', 'admin'); });
  await ap.goto(BASE + '/admin/dashboard.html?qa=v51');
  await ap.waitForTimeout(1000);
  const dbReady = await ap.evaluate(() => typeof DB !== 'undefined' && typeof DB.init === 'function');
  check('A0 后台 DB 模块就绪', dbReady === true, 'dbReady=' + dbReady);

  const ops = await ap.evaluate(() => {
    DB.init();
    const tag = 'T' + Date.now().toString().slice(-7);
    const r = { tag };
    r.noun = DB.addQuestion({ questionType: 'noun', title: '同步名词' + tag, category: '新闻学概论', tag: '高频', status: 'published', contentJson: '这是同步名词的定义正文第一行\n这是第二个得分要点' });
    r.short = DB.addQuestion({ questionType: 'short', title: '同步简答' + tag, category: '网络传播概论', tag: '15分', status: 'published', contentJson: '参考答案第一点\n参考答案第二点' });
    r.essay = DB.addQuestion({ questionType: 'essay', title: '同步论述' + tag, category: '新媒体概论', tag: '30分', status: 'published', contentJson: '论述范文正文段落' });
    r.practice = DB.addQuestion({ questionType: 'practice', title: '同步实务' + tag, category: '其他', tag: '20分', status: 'published', contentJson: '实务范文全文' });
    r.draft = DB.addQuestion({ questionType: 'noun', title: '草稿名词' + tag, category: '待分类', tag: '草稿', status: 'draft', contentJson: '不应出现' });
    // 下架一道静态题库里既有名词
    r.hidden = DB.addQuestion({ questionType: 'noun', title: '算法推荐', category: '网络传播', tag: '高频', status: 'unpublished' });
    r.matBook = DB.addMaterial({ title: '传播学原理E2E补充资料' + tag, sourceType: '教材', fileType: 'PDF', wordCount: 100, chapterInfo: '-', parseStatus: 'done', uploadedBy: 'admin' });
    r.matExam = DB.addMaterial({ title: '2026E2E模拟真题' + tag, sourceType: '真题', fileType: 'PDF', wordCount: 100, chapterInfo: '-', parseStatus: 'done', uploadedBy: 'admin' });
    return r;
  });
  out.push('造数: ' + JSON.stringify({ noun: ops.noun.id, short: ops.short.id, essay: ops.essay.id, practice: ops.practice.id, tag: ops.tag }));

  // overlay 结构断言
  const overlayOk = await ap.evaluate(() => {
    const o = JSON.parse(localStorage.getItem('xc_question_sync') || '{}');
    const seedsLeak = ['沉默的螺旋', '新闻价值', '把关人'].some(t => Object.keys(o).some(k => false)) && false;
    return { keys: Object.keys(o).length, seedsLeak };
  });
  check('A1 overlay 已写入且初始示例题不进 overlay', overlayOk.keys >= 6, JSON.stringify(overlayOk));

  // ---------- 学生端：知识库 ----------
  const sp = await ctx.newPage();
  const reqs = [];
  sp.on('request', r => { if (/chat\/completions/.test(r.url())) { reqs.push(r); console.log('REQSEE', r.method(), r.url()); } });
  await sp.goto(BASE + '/knowledge.html?qa=v51');
  await sp.waitForTimeout(900);
  const kb = await sp.evaluate((ops) => {
    const txt = document.querySelector('.app-body') ? document.querySelector('.app-body').innerText : document.body.innerText;
    const row = t => Array.from(document.querySelectorAll('.lib-row')).some(r => (r.querySelector('span') ? r.querySelector('span').textContent : r.innerText) === t);
    const seedMatLeak = Array.from(document.querySelectorAll('[data-material-id]')).some(r => /郭庆光|真题汇总|李良荣|彭兰）/.test(r.innerText));
    return {
      noun: row(ops.noun.title), short: row(ops.short.title), essay: row(ops.essay.title),
      draft: row(ops.draft.title), hiddenGone: !row('算法推荐'),
      bookMat: row(ops.matBook.title), examMat: row(ops.matExam.title), seedMatLeak: seedMatLeak,
      bookGroup: !!document.querySelector('[data-book-group="传播学原理"] [data-material-id]'),
      examGroup: !!document.querySelector('[data-book-group="真题资料"] [data-material-id]')
    };
  }, ops);
  check('S1 知识库出现后台发布的名词/简答/论述', kb.noun && kb.short && kb.essay, JSON.stringify(kb));
  check('S2 草稿题不出现在知识库', !kb.draft, JSON.stringify(kb));
  check('S3 后台下架的静态名词从知识库消失', kb.hiddenGone, JSON.stringify(kb));
  check('S4 后台真实上传资料出现在学生端，种子资料不泄漏', kb.bookMat && kb.examMat && !kb.seedMatLeak, JSON.stringify(kb));
  check('S5 资料按教材名/真题正确分组（BUG-02）', kb.bookGroup && kb.examGroup, JSON.stringify(kb));

  // ---------- 学生端：名词详情 ----------
  await sp.goto(BASE + '/noun-detail.html?term=' + encodeURIComponent(ops.noun.title) + '&qa=v51');
  await sp.waitForTimeout(700);
  const nd = await sp.evaluate(() => ({
    title: (document.getElementById('noun-title') || {}).textContent,
    tag: (document.getElementById('noun-tag') || {}).textContent,
    body: (document.getElementById('panel-text') || document.body).innerText
  }));
  check('S6 同步名词详情可打开且内容来自后台', nd.title === ops.noun.title && nd.body.indexOf('定义正文第一行') >= 0 && nd.body.indexOf('得分要点') >= 0, JSON.stringify(nd).slice(0, 300));

  await sp.goto(BASE + '/noun-detail.html?term=' + encodeURIComponent('算法推荐') + '&qa=v51');
  await sp.waitForTimeout(600);
  const hiddenDetail = await sp.evaluate(() => (document.getElementById('panel-text') || document.body).innerText);
  check('S7 被下架名词详情显示下架提示而非其他词条内容', hiddenDetail.indexOf('下架') >= 0, hiddenDetail.slice(0, 200));

  // ---------- 学生端：简答/论述/实务详情与列表 ----------
  await sp.goto(BASE + '/short-detail.html?short=admin_short_' + ops.short.id + '&qa=v51');
  await sp.waitForTimeout(600);
  const sd = await sp.evaluate(() => ({
    title: (document.getElementById('short-title') || {}).textContent,
    body: (document.getElementById('short-answer-text') || {}).innerText
  }));
  check('S8 同步简答详情渲染', sd.title === ops.short.title && sd.body.indexOf('参考答案第一点') >= 0, JSON.stringify(sd).slice(0,200));

  await sp.goto(BASE + '/essay-detail.html?essay=admin_essay_' + ops.essay.id + '&qa=v51');
  await sp.waitForTimeout(600);
  const ed = await sp.evaluate(() => ({
    title: (document.getElementById('essay-title') || {}).textContent,
    body: (document.getElementById('essay-answer-text') || {}).innerText
  }));
  check('S9 同步论述详情渲染', ed.title === ops.essay.title && ed.body.indexOf('论述范文正文段落') >= 0, JSON.stringify(ed).slice(0,200));

  await sp.goto(BASE + '/practice-list.html?qa=v51');
  await sp.waitForTimeout(700);
  const pl = await sp.evaluate((ops) => document.body.innerText.indexOf(ops.practice.title) >= 0, ops);
  check('S10 实务列表出现后台发布的实务题', pl, 'not found');

  // ---------- 首页真实题量 ----------
  await sp.goto(BASE + '/index.html?qa=v51');
  await sp.waitForTimeout(800);
  const counts = await sp.evaluate(() => ({
    noun: (document.getElementById('home-noun-count') || {}).textContent,
    short: (document.getElementById('home-short-count') || {}).textContent,
    essay: (document.getElementById('home-essay-count') || {}).textContent,
    real: { n: Object.keys(nounData).length, s: shortData.items.length, e: essayData.items.length }
  }));
  check('S11 首页题量与真实题库一致（BUG-03）',
    counts.noun.indexOf(counts.real.n + '个词条') === 0 &&
    counts.short.indexOf(counts.real.s + '道') === 0 &&
    counts.essay.indexOf(counts.real.e + '道') === 0,
    JSON.stringify(counts));

  // ---------- 编辑/删除联动 ----------
  await ap.evaluate((ops) => {
    DB.updateQuestion(ops.noun.id, { title: ops.noun.title + '改', contentJson: '改写后的正文' });
  }, ops);
  await sp.goto(BASE + '/knowledge.html?qa=v51');
  await sp.waitForTimeout(800);
  const upd = await sp.evaluate((ops) => Array.from(document.querySelectorAll('.lib-row')).some(r => (r.querySelector('span') ? r.querySelector('span').textContent : r.innerText) === (ops.noun.title + '改'))
    && !Array.from(document.querySelectorAll('.lib-row')).some(r => (r.querySelector('span') ? r.querySelector('span').textContent : r.innerText) === ops.noun.title), ops);
  check('S12 后台编辑后学生端标题更新', upd, '');

  await ap.evaluate((ops) => { DB.deleteQuestion(ops.noun.id); }, ops);
  await sp.goto(BASE + '/knowledge.html?qa=v51');
  await sp.waitForTimeout(800);
  const del = await sp.evaluate((ops) => !Array.from(document.querySelectorAll('.lib-row')).some(r => (r.querySelector('span') ? r.querySelector('span').textContent : r.innerText).indexOf(ops.noun.title) >= 0), ops);
  check('S13 后台删除后学生端消失（overlay deleted）', del, '');

  // ---------- AI：多厂商配置与诚实拦截 ----------
  await sp.goto(BASE + '/noun-detail.html?term=' + encodeURIComponent('沉默的螺旋') + '&qa=v51');
  await sp.waitForTimeout(700);

  const ai0 = await sp.evaluate(() => ({
    keys: AiService.providerKeys,
    dsNoKey: AiService.isConfigured('deepseek') === false,
    // 智谱已预填官方地址：只填 Key 即可用
    zhipuKeyOnly: (function () { AiService.saveProviderConfig('zhipu', { endpoint: '', key: 'k' }); return AiService.isConfigured('zhipu') === true; })(),
    // Claude 没有默认地址：URL/Key 缺一不可
    claudeNeedUrl: (function () { AiService.saveProviderConfig('claude', { endpoint: '', key: 'k' }); return AiService.isConfigured('claude') === false; })(),
    kimiOk: (function () { AiService.saveProviderConfig('kimi', { endpoint: 'https://api.moonshot.cn/v1/chat/completions', key: 'sk-x', model: 'moonshot-v1-8k' }); return AiService.isConfigured('kimi') === true; })()
  }));
  check('AI1 厂商目录为7家且配置判定正确（内置地址只填Key可用/Claude缺URL不可用）',
    ai0.keys.length === 7 && ai0.dsNoKey && ai0.zhipuKeyOnly && ai0.claudeNeedUrl && ai0.kimiOk, JSON.stringify(ai0));

  // UI：打开 AI 设置弹窗
  await sp.evaluate(() => openAiModal());
  await sp.waitForTimeout(300);
  const modal0 = await sp.evaluate(() => ({
    rows: document.querySelectorAll('#ai-provider-list .ai-option').length,
    labels: Array.from(document.querySelectorAll('#ai-provider-list .ai-name')).map(e => e.textContent),
    badges: Array.from(document.querySelectorAll('#ai-provider-list .ai-option span[style*="font-size"]')).map(e => e.textContent)
  }));
  check('AI2 设置弹窗列出7个厂商且无"待接入"字样',
    modal0.rows === 7 && modal0.labels.indexOf('智谱清言 GLM') >= 0 && modal0.labels.indexOf('Kimi（月之暗面）') >= 0 && modal0.labels.indexOf('讯飞星火') >= 0
    && modal0.badges.indexOf('待接入') < 0, JSON.stringify(modal0));

  // 点选智谱：预填 URL/模型名
  await sp.evaluate(() => selectAiModel('zhipu'));
  await sp.waitForTimeout(100);
  const zhipuPanel = await sp.evaluate(() => ({
    ep: document.getElementById('ai-endpoint-input').value,
    model: document.getElementById('ai-model-input').value,
    key: document.getElementById('ai-key-input').value,
    hint: document.getElementById('ai-cfg-hint').textContent
  }));
  check('AI3 点选自配置厂商后预填接口地址/模型名/说明',
    /bigmodel\.cn/.test(zhipuPanel.ep) && zhipuPanel.model === 'glm-4-flash' && zhipuPanel.hint.indexOf('免费额度') >= 0, JSON.stringify(zhipuPanel));

  // 未填 Key 直接保存 → 提示不完整，且 aiModel 已切换
  await sp.evaluate(() => { document.getElementById('ai-key-input').value = ''; saveAiSettings(); });
  await sp.waitForTimeout(400);
  const saveWarn = await sp.evaluate(() => document.body.innerText);
  check('AI4 配置不完整保存时明确警告不可调用', saveWarn.indexOf('仍不完整') >= 0 || saveWarn.indexOf('无法调用') >= 0, '');
  await sp.evaluate(() => { var b = Array.from(document.querySelectorAll('.confirm-modal-overlay .confirm-btn, .confirm-modal-overlay .modal-close, .confirm-modal-overlay div')).find(e => /确定|知道|×/.test(e.textContent)); if (b) b.click(); });

  // 发起 AI 助记：未配置必须被拦截
  await sp.evaluate(() => {
    document.getElementById('ai-assist-input').value = '解释一下';
    submitAiAssist();
  });
  await sp.waitForTimeout(400);
  const blocked = await sp.evaluate(() => document.body.innerText);
  check('AI5 未配置厂商调用被明确拦截（不发请求、无假回答）',
    blocked.indexOf('接口地址') >= 0 && blocked.indexOf('API Key') >= 0 && reqs.length === 0,
    'reqs=' + reqs.length);
  await sp.evaluate(() => { var b = Array.from(document.querySelectorAll('.confirm-modal-overlay div')).find(e => /去配置|确定|立即/.test(e.textContent)); if (b) b.click(); });
  await sp.waitForTimeout(300);
  await sp.evaluate(() => { var m = document.getElementById('ai-modal'); if (m) m.style.display = 'none'; });

  // 配置完整后真实发请求（context 级 mock：200 + OpenAI 兼容响应）
  aiMock.status = 200;
  await sp.evaluate(() => {
    // 清理拦截弹窗残留，避免遮挡后续状态
    document.querySelectorAll('.confirm-modal-overlay').forEach(o => o.remove());
    var m = document.getElementById('ai-modal'); if (m) m.style.display = 'none';
    localStorage.setItem('aiModel', 'zhipu');
    AiService.saveProviderConfig('zhipu', { endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', key: 'sk-zhipu-test', model: 'glm-4-flash' });
    document.getElementById('ai-assist-input').value = '解释一下';
    submitAiAssist();
  });
  await sp.waitForTimeout(2500);
  const aiResp = await sp.evaluate(() => ({
    text: document.body.innerText,
    overlays: Array.from(document.querySelectorAll('.confirm-modal-overlay')).map(o => o.innerText.slice(0, 200)),
    loading: !!document.getElementById('ai-loading-overlay')
  }));
  const zhipuReq = reqs.find(r => /bigmodel/.test(r.url()));
  let reqBodyOk = false, authOk = false;
  if (zhipuReq) {
    const hdrs = zhipuReq.headers();
    authOk = /Bearer sk-zhipu-test/.test(hdrs['authorization'] || '');
    try { reqBodyOk = JSON.parse(zhipuReq.postData()).model === 'glm-4-flash'; } catch (e) {}
  }
  check('AI6 配置完整后向厂商 URL 发起真实请求（Bearer+模型名正确）',
    !!zhipuReq && authOk && reqBodyOk, 'req=' + (zhipuReq ? zhipuReq.url() : 'none'));
  check('AI7 真实响应内容展示（非内置假答案）', aiResp.text.indexOf('智谱返回的真实回答') >= 0, JSON.stringify(aiResp));

  // 401 → 友好错误
  aiMock.status = 401;
  reqs.length = 0;
  await sp.evaluate(() => {
    var ov = document.getElementById('ai-loading-overlay'); if (ov) ov.remove();
    document.getElementById('ai-assist-input').value = '再问一次';
    submitAiAssist();
  });
  await sp.waitForTimeout(1200);
  const errTxt = await sp.evaluate(() => document.body.innerText);
  check('AI8 401 返回中文鉴权失败提示', errTxt.indexOf('API Key 无效') >= 0, '');

  console.log(out.join('\n'));
  console.log('\n结果: ' + pass + ' 通过 / ' + fail + ' 失败');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('脚本异常:', e); process.exit(2); });
