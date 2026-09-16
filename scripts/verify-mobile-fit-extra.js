// 补充验证：noun-detail 有效词条 + Electron 900x650 窗口尺寸
const { chromium } = require('playwright');
const BASE = 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch();
  const jobs = [
    { w: 375, h: 667, pages: ['noun-detail.html?id=noun001', 'short-detail.html', 'essay-detail.html'] },
    { w: 900, h: 650, pages: ['index.html', 'exam-comment.html?id=noun001', 'knowledge.html'] }, // Electron 窗口尺寸
  ];
  for (const j of jobs) {
    const ctx = await browser.newContext({ viewport: { width: j.w, height: j.h } });
    for (const p of j.pages) {
      const page = await ctx.newPage();
      try { await page.goto(`${BASE}/${p}${p.includes('?') ? '&' : '?'}v=extra`, { waitUntil: 'networkidle', timeout: 15000 }); } catch (e) {}
      await page.waitForTimeout(500);
      const m = await page.evaluate(() => {
        const doc = document.documentElement;
        const c = document.querySelector('.container');
        const el = document.querySelector('.home-body, .app-body, .profile-body, .exam-body, .interview-body, .login-body');
        return {
          bodyOverflow: Math.max(0, doc.scrollHeight - doc.clientHeight),
          containerH: c ? Math.round(c.getBoundingClientRect().height) : null,
          contentScroll: el ? Math.max(0, el.scrollHeight - el.clientHeight) : null,
          innerH: window.innerHeight,
        };
      });
      console.log(`${j.w}x${j.h} ${p} | body溢出:${m.bodyOverflow} 容器高:${m.containerH}/${m.innerH} 内容区滚量:${m.contentScroll}`);
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
})();
