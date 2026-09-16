// Electron 真实窗口内验证（直连 page target WebSocket）
const { chromium } = require('playwright');
(async () => {
  const list = await (await fetch('http://127.0.0.1:9223/json')).json();
  const target = list.find(t => t.type === 'page' && /index\.html/.test(t.url)) || list[0];
  const browser = await chromium.connectOverCDP(target.webSocketDebuggerUrl);
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0];
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push('[c] ' + m.text().slice(0, 200)); });

  const r1 = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    textLen: document.body.innerText.length,
    hasContainer: !!document.querySelector('.container'),
    containerH: Math.round(document.querySelector('.container').getBoundingClientRect().height),
    innerH: window.innerHeight,
    bodyOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    protocol: location.protocol,
  }));
  console.log('E1 首页:', JSON.stringify(r1));

  // localStorage 持久化读写
  await page.evaluate(() => localStorage.setItem('qa_persist_probe', 'ok-' + Date.now()));
  const v = await page.evaluate(() => localStorage.getItem('qa_persist_probe'));
  console.log('E2 localStorage可写读:', v);

  // 导航知识库（Electron 内跳转，file://）
  await page.evaluate(() => location.href = 'knowledge.html');
  await page.waitForTimeout(1200);
  const r2 = await page.evaluate(() => ({
    url: location.href.split('/').pop(),
    rows: document.querySelectorAll('.lib-row').length,
    textLen: document.body.innerText.length,
    containerH: Math.round(document.querySelector('.container').getBoundingClientRect().height),
    innerH: window.innerHeight,
    bodyOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  console.log('E3 知识库:', JSON.stringify(r2));

  // 名词详情（file:// 下数据加载）
  await page.evaluate(() => location.href = 'noun-detail.html?term=' + encodeURIComponent('议程设置'));
  await page.waitForTimeout(1200);
  const r3 = await page.evaluate(() => ({
    nounTitle: (document.getElementById('noun-title') || {}).textContent,
    textLen: document.body.innerText.length,
  }));
  console.log('E4 名词详情(file://):', JSON.stringify(r3));
  console.log('E5 错误:', errs.filter(e => !/pdf|mammoth|ERR_ABORTED/.test(e)).join(' | ') || 'clean');
  await browser.close(); // 仅断开 CDP，不关闭 Electron
})();
