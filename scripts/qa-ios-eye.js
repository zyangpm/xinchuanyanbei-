// 苹果用户视角全方位验收截图
// 覆盖所有核心页面：首页、知识库、名词/短答/论述详情、我的、设置各分区、考试、实训
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:8081';
const OUT = path.join(__dirname, '_qa_shots');

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const pg = await ctx.newPage();
  pg.on('console', m => { if (m.type() === 'error') console.log('CONSOLE_ERR:', m.text()); });
  pg.on('pageerror', e => console.log('PAGE_ERR:', e.message));

  const shots = [
    { url: '/index.html?qa=1', name: '01-home' },
    { url: '/knowledge.html?qa=1', name: '02-knowledge' },
    { url: '/knowledge.html?type=short&qa=1', name: '03-knowledge-short' },
    { url: '/knowledge.html?type=essay&qa=1', name: '04-knowledge-essay' },
    { url: '/noun-detail.html?term=%E6%96%B0%E9%97%BB%E4%BB%B7%E5%80%BC&qa=1', name: '05-noun-detail' },
    { url: '/noun-detail.html?term=%E6%96%B0%E9%97%BB%E4%BB%B7%E5%80%BC&qa=1&panel=mindmap', name: '06-noun-mindmap', click: 'mindmap' },
    { url: '/short-detail.html?short=short001&qa=1', name: '07-short-detail' },
    { url: '/essay-detail.html?essay=essay001&qa=1', name: '08-essay-detail' },
    { url: '/practice-list.html?qa=1', name: '09-practice-list' },
    { url: '/exam-home.html?qa=1', name: '10-exam-home' },
    { url: '/profile.html?qa=1', name: '11-profile' },
    { url: '/settings.html?qa=1', name: '12-settings-main' },
    { url: '/settings.html#account&qa=1', name: '13-settings-account', wait: 1200 },
    { url: '/settings.html#ai&qa=1', name: '14-settings-ai', wait: 1200 },
    { url: '/settings.html#feedback&qa=1', name: '15-settings-feedback', wait: 1200 },
    { url: '/settings.html#about&qa=1', name: '16-settings-about', wait: 1200 },
    { url: '/collections.html?qa=1', name: '17-collections' },
    { url: '/exam-history.html?qa=1', name: '18-exam-history' },
  ];

  for (const s of shots) {
    try {
      const full = `${BASE}${s.url}`;
      await pg.goto(full, { waitUntil: 'networkidle', timeout: 10000 });
      await pg.waitForTimeout(s.wait || 500);
      // 如果需要切分层级串记面板
      if (s.click === 'mindmap') {
        await pg.evaluate(() => {
          const t = Array.from(document.querySelectorAll('.tab')).find(x => x.textContent.indexOf('分层') !== -1);
          if (t) t.click();
          if (typeof toggleMindmap === 'function') toggleMindmap();
        });
        await pg.waitForTimeout(600);
      }
      const fp = path.join(OUT, `${s.name}.png`);
      await pg.screenshot({ path: fp, fullPage: true });
      // 同时导出一份页面关键指标 JSON
      const metrics = await pg.evaluate(() => {
        const title = document.title;
        const h1 = document.querySelector('.app-title, .page-title, h1, h2')?.textContent?.trim().slice(0, 40) || '';
        const libRows = document.querySelectorAll('.lib-row').length;
        const navItems = document.querySelectorAll('.nav-item').length;
        const errors = [];
        return { title, h1, libRows, navItems, bodyLen: document.body.innerText.length };
      });
      console.log(`${s.name}: ${JSON.stringify(metrics)}  shot=${path.basename(fp)}`);
    } catch (e) {
      console.log(`${s.name}: ERROR ${e.message}`);
    }
  }
  await b.close();
  console.log(`\n✅ 全部截图输出到 ${OUT}`);
})();
