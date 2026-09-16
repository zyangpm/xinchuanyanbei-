/**
 * qa-android-pwa.js — 安卓真机视角 PWA 走查
 * 用 Playwright 模拟 Pixel 5 真机（手机 UA + 触屏 + 设备像素比），
 * 逐页检查：白屏/JS报错、横向溢出、undefined/NaN、卡在"加载中"、
 * 底部导航跳转、分层串记、AI 七厂商、设置分区、资料库弹窗。
 *
 * 运行：node scripts/qa-android-pwa.js
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8081';
const SHOT_DIR = path.join(__dirname, '_qa_shots', 'android');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const phone = devices['Pixel 5'];

const PAGES = [
  ['闪屏', '/splash.html'],
  ['登录', '/login.html?qa=1'],
  ['首页', '/index.html?qa=1'],
  ['知识库', '/knowledge.html?qa=1'],
  ['名词详情', '/noun-detail.html?term=' + encodeURIComponent('新闻价值') + '&qa=1'],
  ['简答详情', '/short-detail.html?short=short001&qa=1'],
  ['论述详情', '/essay-detail.html?essay=essay001&qa=1'],
  ['实务列表', '/practice-list.html?qa=1'],
  ['考试首页', '/exam-home.html?qa=1'],
  ['考试-新闻', '/exam-news.html?qa=1'],
  ['考试-评论', '/exam-comment.html?qa=1'],
  ['考试-文案', '/exam-copywriting.html?qa=1'],
  ['考试-健康', '/exam-health.html?qa=1'],
  ['考试-访谈', '/exam-interview.html?qa=1'],
  ['考试-营销', '/exam-marketing.html?qa=1'],
  ['历史训练', '/exam-history.html?qa=1'],
  ['收藏', '/collections.html?qa=1'],
  ['我的', '/profile.html?qa=1'],
  ['设置', '/settings.html'],
];

let pass = 0;
const bugs = [];
function ok(name, extra) { pass++; console.log('  PASS ' + name + (extra ? '  ' + extra : '')); }
function bug(sev, page, name, detail) { bugs.push({ sev, page, name, detail }); console.log(`  [${sev}] ${page} :: ${name}${detail ? ' -> ' + detail : ''}`); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...phone });
  const page = await ctx.newPage();

  // 收集整轮 JS 错误
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 160)));

  for (const [name, urlPath] of PAGES) {
    console.log('\n=== ' + name + ' ===');
    const pageErrsBefore = pageErrors.length;
    try {
      await page.goto(BASE + urlPath, { waitUntil: 'load', timeout: 15000 });
    } catch (e) {
      bug('P0', name, '页面加载失败', String(e).slice(0, 120));
      continue;
    }
    await page.waitForTimeout(700);

    // 1) 白屏/内容量
    const metrics = await page.evaluate(() => {
      const txt = document.body.innerText.trim();
      // 横向溢出
      const de = document.documentElement;
      const overflowX = de.scrollWidth - de.clientWidth;
      const offenders = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.right > window.innerWidth + 3 || r.left < -3) {
          const cls = (el.className && el.className.toString) ? el.className.toString().slice(0, 40) : '';
          offenders.push(`${el.tagName}.${cls} right=${Math.round(r.right)} left=${Math.round(r.left)} w=${Math.round(r.width)}`);
        }
      });
      return {
        textLen: txt.length,
        overflowX,
        offenders: offenders.slice(0, 5),
        hasUndefined: /undefined|NaN|\[object Object\]/.test(txt),
        stuckLoading: txt.includes('加载中') || txt.includes('loading...'),
      };
    });

    if (metrics.textLen < 15) {
      // 闪屏页只有 logo+应用名+版本号，属设计内的极简，不计白屏
      if (name === '闪屏') {
        const ver = await page.evaluate(() => document.querySelector('.version')?.textContent?.trim() || '');
        ok('闪屏极简页（设计内）', '版本号 ' + ver);
        if (ver && !/v?5\.1/.test(ver)) bug('P2', '闪屏', '版本号不是 v5.1.x：' + ver, 'package.json/关于页/闪屏三处版本不一致');
      }
      else bug('P0', name, '疑似白屏', '正文仅 ' + metrics.textLen + ' 字');
    }
    else ok('内容渲染', metrics.textLen + ' 字');

    if (metrics.overflowX > 4) {
      bug('P1', name, '横向溢出 ' + metrics.overflowX + 'px', (metrics.offenders[0] || '').slice(0, 90));
    } else ok('无横向溢出');

    if (metrics.hasUndefined) bug('P1', name, '出现 undefined/NaN/[object] 文案');
    if (metrics.stuckLoading) bug('P2', name, '仍显示"加载中"占位');

    if (pageErrors.length > pageErrsBefore) {
      bug('P0', name, 'JS 运行错误', pageErrors.slice(pageErrsBefore).join(' | ').slice(0, 140));
    } else ok('无 JS 报错');

    await page.screenshot({ path: path.join(SHOT_DIR, name + '.png'), fullPage: false }).catch(() => {});
  }

  // ===== 交互走查（在首页） =====
  console.log('\n=== 交互：底部导航 ===');
  await page.goto(BASE + '/index.html?qa=1', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const navTargets = [['知识库', 'knowledge.html'], ['我的', 'profile.html'], ['考试', 'exam-home.html'], ['首页', 'index.html']];
  for (const [label, expectUrl] of navTargets) {
    const tapped = await page.evaluate((lbl) => {
      // 只点真正的 .nav-item，避免误点外层 .bottomnav 容器
      const items = Array.from(document.querySelectorAll('.bottomnav .nav-item'));
      const t = items.find(el => el.textContent.trim().includes(lbl));
      if (t) { t.click(); return true; }
      return false;
    }, label);
    await page.waitForTimeout(600);
    if (tapped && page.url().includes(expectUrl)) ok('导航→' + label);
    else if (tapped) bug('P1', '底部导航', '点「' + label + '」未跳到 ' + expectUrl, page.url().split('/').pop());
    else bug('P1', '底部导航', '找不到「' + label + '」入口');
  }

  // ===== 分层串记 =====
  console.log('\n=== 交互：分层串记 SVG ===');
  await page.goto(BASE + '/noun-detail.html?term=' + encodeURIComponent('新闻价值') + '&qa=1', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const t = tabs.find(x => x.textContent.includes('分层'));
    if (t) t.click();
  });
  await page.waitForTimeout(400);
  const mind = await page.evaluate(() => {
    const c = document.getElementById('mindmapContent');
    if (!c) return { exists: false };
    if (typeof toggleMindmap === 'function' && c.style.display === 'none') toggleMindmap();
    const lines = Array.from(c.querySelectorAll('svg line'));
    const rects = c.querySelectorAll('svg rect, svg ellipse').length;
    const bad = lines.filter(l => ['x1','y1','x2','y2'].some(a => isNaN(parseFloat(l.getAttribute(a))))).length;
    return { exists: true, display: c.style.display, lines: lines.length, rects, bad };
  });
  if (!mind.exists) bug('P0', '名词详情', '缺少分层串记容器');
  else if (mind.lines < 5) bug('P1', '分层串记', '连线数量异常', mind.lines + ' 条');
  else if (mind.bad > 0) bug('P1', '分层串记', '存在 NaN 断线', mind.bad + ' 条');
  else ok('分层串记渲染', mind.lines + ' 线 / ' + mind.rects + ' 节点');
  await page.screenshot({ path: path.join(SHOT_DIR, '分层串记.png') }).catch(() => {});

  // ===== AI 七厂商弹窗 =====
  console.log('\n=== 交互：AI 模型设置 ===');
  await page.goto(BASE + '/settings.html#ai', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.evaluate(() => { if (typeof openAiModelSetting === 'function') { try { openAiModelSetting(); } catch (e) {} } });
  await page.waitForTimeout(500);
  const ai = await page.evaluate(() => {
    // 设置页 AI 弹窗真实结构：#ai-set-modal .fontsize-option[data-model-key]
    const opts = Array.from(document.querySelectorAll('#ai-set-modal .fontsize-option[data-model-key]'));
    const keys = opts.map(o => o.getAttribute('data-model-key'));
    const txt = document.body.innerText;
    // ai-service.js 的厂商目录（全局对象名是 AiService；providerKeys 为数组）
    const expectedKeys = (window.AiService && window.AiService.providerKeys)
      ? window.AiService.providerKeys
      : ['deepseek','zhipu','kimi','xunfei','gpt','claude','gemini'];
    return {
      count: opts.length,
      keys,
      expectedCount: expectedKeys.length,
      expectedKeys,
      hasFake: txt.includes('待接入') || txt.includes('敬请期待'),
      hasEndpointInput: !!document.querySelector('#ai-set-endpoint'),
      hasModelInput: !!document.querySelector('#ai-set-model'),
      hasKeyInput: !!document.querySelector('#ai-set-key'),
    };
  });
  if (ai.hasFake) bug('P1', 'AI设置', '出现"待接入/敬请期待"假状态');
  if (ai.count < ai.expectedCount) {
    bug('P1', 'AI设置', '设置页仅 ' + ai.count + ' 家(' + ai.keys.join(',') + ')，与名词详情页 ' + ai.expectedCount + ' 家(' + ai.expectedKeys.join(',') + ')不一致，且无接口地址配置');
  } else if (!ai.hasEndpointInput || !ai.hasModelInput || !ai.hasKeyInput) {
    bug('P1', 'AI设置', '已列出厂商，但缺少接口地址/模型名/API Key 配置输入');
  } else ok('AI 厂商', ai.count + ' 家，接口地址+模型+Key 可配，无假接入');

  // ===== 资料库弹窗（种子过滤） =====
  console.log('\n=== 交互：我的资料库 ===');
  await page.goto(BASE + '/profile.html?qa=1', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const lib = await page.evaluate(() => {
    if (typeof openUploadLibrary === 'function') { try { openUploadLibrary(); } catch (e) {} }
    const txt = document.body.innerText;
    return { seedLeak: txt.includes('郭庆光') || txt.includes('彭兰') || txt.includes('真题汇总') };
  });
  if (lib.seedLeak) bug('P1', '资料库', '后台种子示例资料泄漏到学生端');
  else ok('种子资料不泄漏');

  // ===== 设置各分区 =====
  console.log('\n=== 交互：设置分区 hash ===');
  for (const [sec, frag] of [['账号', '#account'], ['AI', '#ai'], ['通用', '#general'], ['反馈', '#feedback'], ['关于', '#about']]) {
    await page.goto(BASE + '/settings.html' + frag, { waitUntil: 'load' });
    await page.waitForTimeout(450);
    const detailVisible = await page.evaluate(() => {
      const d = document.getElementById('settings-detail');
      const m = document.getElementById('settings-main');
      const ds = d ? getComputedStyle(d).display : 'none';
      const ms = m ? getComputedStyle(m).display : '';
      return ds === 'block' && ms === 'none';
    });
    if (detailVisible) ok('设置分区 ' + sec);
    else bug('P2', '设置', '分区「' + sec + '」未正确展开', '');
  }

  await browser.close();

  console.log('\n\n================ 安卓视角 PWA 测试汇总 ================');
  console.log('PASS ' + pass + ' / BUG ' + bugs.length);
  const order = { P0: 0, P1: 1, P2: 2 };
  bugs.sort((a, b) => order[a.sev] - order[b.sev]);
  for (const b of bugs) console.log(`[${b.sev}] ${b.page} | ${b.name}${b.detail ? ' | ' + b.detail : ''}`);
  console.log('截图目录：' + SHOT_DIR);
  process.exit(bugs.some(b => b.sev === 'P0') ? 1 : 0);
})().catch(e => { console.error('QA 脚本异常：', e); process.exit(2); });
