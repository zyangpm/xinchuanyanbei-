// V5.0 全量回归 —— 学生端业务链路 + 全页面稳定性
// 只观测、不修改业务代码。所有失败项输出证据。
const { chromium } = require('playwright');
const BASE = 'http://localhost:8081';

const ALL_PAGES = [
  'splash.html','login.html','index.html','knowledge.html','collections.html',
  'noun-detail.html','short-detail.html','essay-detail.html',
  'exam-home.html','exam-history.html','exam-comment.html','exam-news.html',
  'exam-interview.html','exam-marketing.html','exam-health.html','exam-copywriting.html',
  'practice-list.html','practice-detail.html','settings.html','profile.html',
];

let pass = 0, fail = 0;
const bugs = [];
function check(name, cond, evidence) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; bugs.push({ name, evidence: String(evidence) }); console.log('  FAIL ' + name + ' :: ' + String(evidence).slice(0, 300)); }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });

  // ========== 模块 A：全页面稳定性扫描 ==========
  console.log('\n=== A. 全页面稳定性（白屏/JS错误/资源404）===');
  const pageErrors = {};
  for (const p of ALL_PAGES) {
    const pg = await ctx.newPage();
    const errs = [], failed = [];
    pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    pg.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
    pg.on('requestfailed', r => failed.push(r.url().split('/').pop() + ':' + (r.failure() || {}).errorText));
    try { await pg.goto(`${BASE}/${p}?qa=1`, { waitUntil: 'load', timeout: 15000 }); } catch (e) { errs.push('GOTO: ' + e.message.slice(0, 120)); }
    await pg.waitForTimeout(600);
    const blank = await pg.evaluate(() => (document.body.innerText || '').trim().length);
    const realErrs = errs.filter(e => !/favicon|ERR_ABORTED|pdf\.min|mammoth/.test(e));
    // splash 是品牌动画页（仅 Logo/标语），不适用内容页 >30 字阈值
    const blankNeed = p === 'splash.html' ? 5 : 30;
    check(`A ${p} 非白屏(>${blankNeed}字)`, blank > blankNeed, `innerText长度=${blank}`);
    check(`A ${p} 无JS错误`, realErrs.length === 0, realErrs.join(' || '));
    const realFailed = failed.filter(f => !/favicon/.test(f));
    check(`A ${p} 无资源加载失败`, realFailed.length === 0, realFailed.join(','));
    pageErrors[p] = { blank, errs: realErrs, failed: realFailed };
    await pg.close();
  }

  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });

  // ========== 模块 B：登录 + 首页 ==========
  console.log('\n=== B. 登录→首页 ===');
  await page.goto(`${BASE}/login.html?qa=1`);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  // 登录实现要求 11 位手机号 + 密码（>=6）+ 协议勾选（默认已勾）
  await page.fill('#phone-input', '13800000000').catch(() => {});
  await page.fill('#password-input', '123456').catch(() => {});
  await page.check('#agreement').catch(() => {});
  await page.click('.login-btn').catch(() => {});
  await page.waitForTimeout(600);
  // doLogin 先弹"登录成功"确认框，点击确认后才跳转首页
  await page.evaluate(() => { var b = document.querySelector('#confirm-modal-overlay .confirm-btn.confirm'); if (b) b.click(); });
  await page.waitForTimeout(1000);
  check('B 登录后跳转 index', /index\.html/.test(page.url()), page.url());
  const homeText = await page.evaluate(() => document.body.innerText);
  check('B 首页非白屏(学习入口已渲染)', homeText.length > 50, homeText.slice(0, 100));
  const loginState = await page.evaluate(() => ({ isLoggedIn: localStorage.getItem('isLoggedIn'), phone: localStorage.getItem('userPhone') }));
  check('B 登录态持久化(isLoggedIn+手机号)', loginState.isLoggedIn === 'true' && loginState.phone === '13800000000', JSON.stringify(loginState));

  // ========== 模块 C：知识库搜索（正常/空态/特殊字符）==========
  console.log('\n=== C. 知识库搜索与边界 ===');
  await page.goto(`${BASE}/knowledge.html?qa=1`);
  await page.waitForTimeout(500);
  const rowsTotal = await page.locator('.lib-row').count();
  check('C 知识库有词条行', rowsTotal > 0, 'rows=' + rowsTotal);
  await page.fill('#search-input', '新闻');
  await page.waitForTimeout(300);
  const rowsFiltered = await page.evaluate(() => Array.from(document.querySelectorAll('.lib-row')).filter(r => r.style.display !== 'none').length);
  check('C 搜索"新闻"过滤生效(0<结果<总数)', rowsFiltered > 0 && rowsFiltered < rowsTotal, `${rowsFiltered}/${rowsTotal}`);
  await page.fill('#search-input', 'zzz不存在的词@@@#');
  await page.waitForTimeout(300);
  const emptyShown = await page.evaluate(() => { const el = document.getElementById('search-empty-state'); return el ? getComputedStyle(el).display !== 'none' : false; });
  check('C 无结果显示空态', emptyShown === true, 'empty-state display=' + emptyShown);
  await page.fill('#search-input', '😀emoji<脚本>"引号\'');
  await page.waitForTimeout(300);
  check('C 特殊字符/emoji 搜索不崩溃', errs.filter(e => /script|undefined|null is not/i.test(e)).length === 0, errs.join('|') || 'clean');
  await page.fill('#search-input', '');
  await page.waitForTimeout(200);

  // ========== 模块 D：名词详情全链路 ==========
  console.log('\n=== D. 名词详情：tab/掌握度/收藏/统计 ===');
  await page.goto(`${BASE}/noun-detail.html?term=${encodeURIComponent('新闻价值')}&qa=1`);
  await page.waitForTimeout(700);
  check('D 标题渲染为"新闻价值"', await page.evaluate(() => (document.getElementById('noun-title') || {}).textContent) === '新闻价值',
    await page.evaluate(() => (document.getElementById('noun-title') || {}).textContent));
  // 4 tab
  for (const panel of ['panel-text', 'panel-tree', 'panel-community', 'panel-video']) {
    const ok = await page.evaluate((pn) => {
      const tabs = document.querySelectorAll('.app-body .tab');
      const map = { 'panel-video': 0, 'panel-text': 1, 'panel-tree': 2, 'panel-community': 3 };
      try { tabs[map[pn]].click(); } catch (e) { return 'CLICK_ERR:' + e.message; }
      const panelEl = document.getElementById(pn);
      return panelEl && getComputedStyle(panelEl).display !== 'none';
    }, panel);
    check(`D tab ${panel} 可切换显示`, ok === true, String(ok));
  }
  // 掌握度三档（V5.0 rateWord 去重：同一词只有从"无评级→认识"才计入已背数，
  // 因此先在无评级状态验证"认识"+1，再验证 no/blur 落库）
  await page.evaluate(() => { localStorage.removeItem('wordRatings'); localStorage.removeItem('masteredCount'); });
  const masteredBefore = await page.evaluate(() => parseInt(localStorage.getItem('masteredCount') || '386', 10));
  // “认识”第一次：改按钮文案，计数 +1
  await page.evaluate(() => handleStatus('yes'));
  await page.waitForTimeout(300);
  await page.evaluate(() => { const m = document.querySelector('#confirm-modal-overlay'); if (m) m.style.display = 'none'; });
  const masteredAfter = await page.evaluate(() => parseInt(localStorage.getItem('masteredCount') || '0', 10));
  check('D 首次"认识" masteredCount +1', masteredAfter === masteredBefore + 1, `${masteredBefore}→${masteredAfter}`);
  // 刷新回来（复位点击计数）再点 yes：已评级，不重复计数
  await page.goto(`${BASE}/noun-detail.html?term=${encodeURIComponent('新闻价值')}&qa=1`);
  await page.waitForTimeout(600);
  await page.evaluate(() => handleStatus('yes'));
  await page.waitForTimeout(300);
  const masteredAfter2 = await page.evaluate(() => parseInt(localStorage.getItem('masteredCount') || '0', 10));
  check('D 重复"认识"不重复计数', masteredAfter2 === masteredAfter, `${masteredAfter}→${masteredAfter2}`);
  // no / blur 落库（不改变已背计数）
  await page.goto(`${BASE}/noun-detail.html?term=${encodeURIComponent('新闻价值')}&qa=1`);
  await page.waitForTimeout(600);
  await page.evaluate(() => handleStatus('no'));
  await page.waitForTimeout(200);
  await page.evaluate(() => { const m = document.querySelector('#confirm-modal-overlay'); if (m) m.style.display = 'none'; });
  let rating = await page.evaluate(() => (JSON.parse(localStorage.getItem('wordRatings') || '{}')['noun:新闻价值'] || {}).rating);
  check('D 标记"不会"落库 wordRatings', rating === 'no', 'rating=' + rating);
  await page.evaluate(() => handleStatus('blur'));
  await page.waitForTimeout(200);
  await page.evaluate(() => { const m = document.querySelector('#confirm-modal-overlay'); if (m) m.style.display = 'none'; });
  rating = await page.evaluate(() => (JSON.parse(localStorage.getItem('wordRatings') || '{}')['noun:新闻价值'] || {}).rating);
  check('D 标记"模糊"覆盖为 blur', rating === 'blur', 'rating=' + rating);
  // 收藏（真实点击星标）
  await page.goto(`${BASE}/noun-detail.html?term=${encodeURIComponent('新闻价值')}&qa=1`);
  await page.waitForTimeout(600);
  const favBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('favorites') || '[]').length);
  await page.locator('.app-top .icon-btn').first().click(); // ☆ 收藏按钮（第一个 icon-btn）
  await page.waitForTimeout(400);
  await page.evaluate(() => { const m = document.querySelector('#confirm-modal-overlay'); if (m) m.style.display = 'none'; });
  const favAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('favorites') || '[]'));
  check('D 收藏写入 favorites', favAfter.some(f => f.type === 'noun' && f.id === '新闻价值'), JSON.stringify(favAfter).slice(0, 200));
  const favCount = await page.evaluate(() => parseInt(localStorage.getItem('favoriteCount') || '0', 10));
  check('D favoriteCount 随收藏增加', favCount > favBefore, `favoriteCount=${favCount} before=${favBefore}`);
  // 收藏列表渲染
  await page.goto(`${BASE}/collections.html?qa=1`);
  await page.waitForTimeout(600);
  const collText = await page.evaluate(() => document.getElementById('collection-list').innerText);
  check('D 收藏列表显示"新闻价值"', /新闻价值/.test(collText), collText.slice(0, 120));
  // 取消收藏
  await page.evaluate(() => { const b = document.querySelector('#collection-list [onclick^="unfavoriteItem"]'); if (b) b.click(); });
  await page.waitForTimeout(500);
  // 可能有确认框
  await page.evaluate(() => { const yes = document.querySelector('#confirm-modal-overlay .confirm-btn.confirm'); if (yes) yes.click(); });
  await page.waitForTimeout(500);
  const favsAfterUnfav = await page.evaluate(() => JSON.parse(localStorage.getItem('favorites') || '[]').length);
  check('D 取消收藏后 favorites 移除', favsAfterUnfav === favBefore, 'favs=' + favsAfterUnfav + ' before=' + favBefore);
  // 刷新持久化
  await page.goto(`${BASE}/noun-detail.html?term=${encodeURIComponent('新闻价值')}&qa=1`);
  await page.waitForTimeout(600);
  const ratingPersist = await page.evaluate(() => (JSON.parse(localStorage.getItem('wordRatings') || '{}')['noun:新闻价值'] || {}).rating);
  check('D 刷新后掌握度仍在', !!ratingPersist, 'rating=' + ratingPersist);

  // ========== 模块 E：短答/论述 ==========
  console.log('\n=== E. 短答/论述题链路 ===');
  // short/essay 数据包只在知识库等页面引入（noun-detail 仅引名词包），故在知识库取 id
  await page.goto(`${BASE}/knowledge.html?qa=1`);
  await page.waitForTimeout(600);
  const ids = await page.evaluate(() => ({
    short: (typeof shortData !== 'undefined' && shortData.items[0]) ? shortData.items[0].id : null,
    essay: (typeof essayData !== 'undefined' && essayData.items[0]) ? essayData.items[0].id : null,
  }));
  check('E 短答数据可读', !!ids.short, JSON.stringify(ids));
  if (ids.short) {
    await page.goto(`${BASE}/short-detail.html?short=${encodeURIComponent(ids.short)}&qa=1`);
    await page.waitForTimeout(700);
    const title = await page.evaluate(() => (document.getElementById('short-title') || {}).textContent || '');
    check('E 短答标题非空', title.length > 0, 'title=' + title);
    // 5 种自测模式切换
    for (const mode of ['drag', 'fill', 'framework', 'redfilm', 'flashcard']) {
      const ok = await page.evaluate((m) => { try { switchSelfTestMode(m); return typeof switchSelfTestMode === 'function'; } catch (e) { return e.message; } }, mode);
      check(`E 自测模式 ${mode} 切换无异常`, ok === true, String(ok));
    }
    // 完成自测 → 弹窗 → 认识
    await page.evaluate(() => completeSelfTest());
    await page.waitForTimeout(300);
    const modalShown = await page.evaluate(() => { const m = document.getElementById('complete-modal'); return m && getComputedStyle(m).display !== 'none'; });
    check('E completeSelfTest 弹出完成弹窗', modalShown === true, 'modal=' + modalShown);
    await page.evaluate(() => { const b = document.querySelector('#complete-modal .status-btn.yes'); if (b) b.click(); });
    await page.waitForTimeout(400);
    const wr = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('wordRatings') || '{}')));
    check('E 短答掌握度落库(key 前缀)', wr.some(k => /^short-detail:/.test(k)), JSON.stringify(wr));
    // 收藏（点"认识"后可能残留掌握度确认遮罩，先收起再真实点击星标）
    const favB = await page.evaluate(() => { const f = JSON.parse(localStorage.getItem('favorites') || '[]'); return f.length; });
    await page.evaluate(() => { const m = document.querySelector('#confirm-modal-overlay'); if (m) m.style.display = 'none'; });
    await page.locator('.app-top .icon-btn').first().click({ force: true });
    await page.waitForTimeout(400);
    await page.evaluate(() => { const m = document.querySelector('#confirm-modal-overlay'); if (m) m.style.display = 'none'; });
    const favHasShort = await page.evaluate(() => JSON.parse(localStorage.getItem('favorites') || '[]').some(f => f.type === 'short'));
    check('E 短答可收藏', favHasShort === true, 'favB=' + favB);
    // 刷新后再进入
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(700);
    const title2 = await page.evaluate(() => (document.getElementById('short-title') || {}).textContent || '');
    check('E 刷新重进标题仍在', title2.length > 0, 'title=' + title2);
    const starFilled = await page.evaluate(() => document.querySelector('.app-top .icon-btn').textContent.trim());
    check('E 刷新后收藏星标回显(★)', starFilled === '★', 'star=' + starFilled);
  }
  if (ids.essay) {
    await page.goto(`${BASE}/essay-detail.html?essay=${encodeURIComponent(ids.essay)}&qa=1`);
    await page.waitForTimeout(700);
    const title = await page.evaluate(() => (document.getElementById('essay-title') || {}).textContent || '');
    check('E 论述标题非空', title.length > 0, 'title=' + title);
    await page.evaluate(() => { const m = document.getElementById('complete-modal'); if (m) { m.style.display = 'flex'; } else if (typeof completeSelfTest === 'function') completeSelfTest(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { const b = document.querySelector('#complete-modal .status-btn.blur'); if (b) b.click(); });
    await page.waitForTimeout(400);
    const wr = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('wordRatings') || '{}')));
    check('E 论述掌握度落库', wr.some(k => /^essay-detail:/.test(k)), JSON.stringify(wr));
  }

  // ========== 模块 F：练习/实训 ==========
  console.log('\n=== F. 实训链路 ===');
  await page.goto(`${BASE}/practice-list.html?qa=1`);
  await page.waitForTimeout(600);
  const pracId = await page.evaluate(() => {
    if (typeof practiceV2Data !== 'undefined' && Array.isArray(practiceV2Data.items) && practiceV2Data.items[0]) {
      return practiceV2Data.items[0].id;
    }
    if (typeof getAllPracticeV2Ids === 'function') { const a = getAllPracticeV2Ids(); return a[0]; }
    return null;
  });
  check('F 实训数据可取到 id', !!pracId, 'id=' + pracId);
  if (pracId) {
    await page.goto(`${BASE}/practice-detail.html?practice=${encodeURIComponent(pracId)}&qa=1`);
    await page.waitForTimeout(800);
    const detailLen = await page.evaluate(() => document.body.innerText.length);
    check('F 实训详情有内容', detailLen > 100, 'len=' + detailLen);
    // 上一题/下一题
    const before = page.url();
    const hasNav = await page.evaluate(() => ({ next: typeof nextPracticeV2 === 'function', prev: typeof prevPracticeV2 === 'function', save: typeof savePracticeAnswer === 'function' }));
    check('F 导航/作答函数齐全', hasNav.next && hasNav.prev && hasNav.save, JSON.stringify(hasNav));
    // 作答保存
    const savedOk = await page.evaluate(() => { try { savePracticeAnswer(practiceId0()); return true; } catch (e) { return e.message; }
      function practiceId0(){return new URLSearchParams(location.search).get('practice');} });
    check('F savePracticeAnswer 不抛错', savedOk === true, String(savedOk));
    // 状态标记
    const stOk = await page.evaluate(() => { try { handlePracticeStatus('mastered'); return true; } catch (e) { return e.message; } });
    check('F handlePracticeStatus 不抛错', stOk === true, String(stOk));
  }

  // ========== 模块 G：考试训练 + 历史记录 ==========
  console.log('\n=== G. 考试训练 ===');
  await page.goto(`${BASE}/exam-comment.html?qa=1`);
  await page.waitForTimeout(800);
  const qText = await page.evaluate(() => (document.querySelector('.question-title') || {}).textContent || '');
  check('G 考题题干非空', qText.length > 10, qText.slice(0, 60));
  const tabOk = await page.evaluate(() => { try { switchCommentTab('answer'); const p = document.getElementById('tab-answer'); return p && getComputedStyle(p).display !== 'none'; } catch (e) { return e.message; } });
  check('G 切换"考生作答"tab', tabOk === true, String(tabOk));
  // 找作答区填写并提交
  const submitInfo = await page.evaluate(() => {
    const ta = document.querySelector('#tab-answer textarea');
    if (!ta) return { hasTextarea: false };
    ta.value = 'QA自动化测试作答内容，不少于若干字。观点明确，论据充分，总结到位。';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    const btns = Array.from(document.querySelectorAll('#bottom-bar button, .bottom-action-bar button')).map(b => b.textContent.trim());
    return { hasTextarea: true, btns };
  });
  check('G 作答 textarea 存在', submitInfo.hasTextarea === true, JSON.stringify(submitInfo));
  // 点下一题/提交（以实际按钮为准）
  const navOk = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('#bottom-bar button, .bottom-action-bar button'));
    const target = btns.find(b => /下一题|提交|完成/.test(b.textContent)) || btns[btns.length - 1];
    try { target && target.click(); return target ? target.textContent.trim() : 'NO_BTN'; } catch (e) { return 'ERR:' + e.message; }
  });
  await page.waitForTimeout(600);
  check('G 提交/下一题可点击无崩溃', !/^ERR/.test(navOk), navOk);
  // exam_history：空态应渲染"暂无训练记录"引导（无历史时文字不多但结构存在）
  await page.goto(`${BASE}/exam-history.html?qa=1`);
  await page.waitForTimeout(900);
  const histTxt = await page.evaluate(() => (document.getElementById('history-container') || {}).innerText || '');
  check('G 历史训练页渲染(记录或空态)', /训练记录|继续上次|评论|实务|消息/.test(histTxt) || histTxt.length > 30, 'len=' + histTxt.length + ' :: ' + histTxt.slice(0, 40));

  // ========== 模块 H：导航返回 ==========
  console.log('\n=== H. 导航与返回 ===');
  await page.goto(`${BASE}/index.html?qa=1`);
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/knowledge.html?qa=1`);
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/noun-detail.html?term=${encodeURIComponent('议程设置')}&qa=1`);
  await page.waitForTimeout(500);
  await page.goBack();
  await page.waitForTimeout(500);
  check('H 返回后到 knowledge', /knowledge/.test(page.url()), page.url());
  const kbStill = await page.evaluate(() => document.querySelectorAll('.lib-row').length);
  check('H 返回后知识库内容仍在', kbStill > 0, 'rows=' + kbStill);
  await page.goBack();
  await page.waitForTimeout(500);
  check('H 二次返回后到 index', /index\.html/.test(page.url()), page.url());
  // goBack 按钮（noun-detail）
  await page.goto(`${BASE}/noun-detail.html?term=${encodeURIComponent('知沟理论')}&qa=1`);
  await page.waitForTimeout(500);
  await page.evaluate(() => { if (typeof goBack === 'function') goBack(); });
  await page.waitForTimeout(600);
  check('H goBack() 不产生白屏', (await page.evaluate(() => document.body.innerText.length)) > 50, 'len=' + await page.evaluate(() => document.body.innerText.length));

  // ========== 模块 I：控制台错误汇总 ==========
  console.log('\n=== I. 链路执行期控制台错误 ===');
  const bizErrs = errs.filter(e => !/pdf\.min|mammoth|ERR_ABORTED|favicon/.test(e));
  check('I 业务链路全程无 JS 错误', bizErrs.length === 0, bizErrs.join(' || ') || 'clean');

  // ========== 模块 J：设置中心分区 ==========
  console.log('\n=== J. 设置中心各分区 ===');
  await page.goto(`${BASE}/settings.html?qa=1`);
  await page.waitForTimeout(600);
  // 反馈入口实际位于 about 分区（openFeedbackModal），无独立 feedback 分区
  for (const sec of ['account', 'preference', 'general', 'ai', 'about']) {
    const ok = await page.evaluate((s) => { try { showSettingsSection(s); const d = document.getElementById('detail-content'); return d && d.innerHTML.length > 20; } catch (e) { return e.message; } }, sec);
    check(`J 设置分区 ${sec} 可渲染`, ok !== false && typeof ok !== 'string', String(ok).slice(0, 150));
  }

  await browser.close();

  console.log(`\n========== 学生端结果：PASS ${pass} / FAIL ${fail} ==========`);
  if (bugs.length) {
    console.log('\n失败清单：');
    bugs.forEach((b, i) => console.log(`${i + 1}. [${b.name}] ${b.evidence}`));
  }
  process.exit(fail ? 1 : 0);
})();
