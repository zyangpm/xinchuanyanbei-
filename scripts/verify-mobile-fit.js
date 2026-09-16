// V5.0 移动端适配自动化验证脚本
// 对多个页面 × 多个手机尺寸检测：
//  1. body 级滚动是否消除（页面不再无限向下延伸）
//  2. .container 高度是否等于视口高度（适配当前屏幕）
//  3. 容器自身是否还有第二层滚动（双重滚动消除）
//  4. 底部导航是否稳定贴住屏幕底部
//  5. 内容区是否为独立滚动区域（长内容可在局部滚动）
//  6. 控制台错误
const { chromium } = require('playwright');

const BASE = 'http://localhost:8081';
const SIZES = [
  [390, 844],
  [393, 852],
  [375, 667],
  [375, 812],
];
const PAGES = [
  'index.html',
  'knowledge.html',
  'collections.html',
  'exam-home.html',
  'exam-history.html',
  'settings.html',
  'profile.html',
  'noun-detail.html?term=%E6%96%B0%E9%97%BB%E4%BB%B7%E5%80%BC',
  'practice-list.html',
  'practice-detail.html',
  'exam-comment.html',
  'login.html',
];

const CONTENT_SEL = '.home-body, .app-body, .profile-body, .exam-body, .interview-body, .login-body';

(async () => {
  const browser = await chromium.launch();
  const results = [];
  let pass = 0, fail = 0;

  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    for (const p of PAGES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
      try {
        await page.goto(`${BASE}/${p}${p.includes('?') ? '&' : '?'}v=fit${w}`, { waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) { /* networkidle 超时不影响测量 */ }
      await page.waitForTimeout(400);

      const m = await page.evaluate(({ CONTENT_SEL }) => {
        const doc = document.documentElement;
        const c = document.querySelector('.container');
        const nav = document.querySelector('.bottomnav');
        const contentEl = document.querySelector(CONTENT_SEL);
        const actionBar = document.querySelector('.bottom-action-bar');
        const r = (el) => el ? el.getBoundingClientRect() : null;
        const cr = r(c), nr = r(nav), ar = r(actionBar);
        return {
          innerH: window.innerHeight,
          bodyOverflow: Math.max(0, doc.scrollHeight - doc.clientHeight),      // body 级滚动量
          containerH: cr ? Math.round(cr.height) : null,                        // 容器实际高
          containerScroll: c ? Math.max(0, c.scrollHeight - c.clientHeight) : null, // 容器第二层滚动
          navBottomGap: nr ? Math.round(window.innerHeight - nr.bottom) : null, // 导航底边与屏幕底距离
          navVisible: nr ? (nr.bottom <= window.innerHeight + 1 && nr.height > 0) : null,
          contentScrollable: contentEl ? Math.max(0, contentEl.scrollHeight - contentEl.clientHeight) : null, // 内容区可滚量
          actionBottomGap: ar ? Math.round(window.innerHeight - ar.bottom) : null, // 考试固定操作栏贴底检查
        };
      }, { CONTENT_SEL });

      const checks = {
        noBodyScroll: m.bodyOverflow <= 1,
        containerFits: m.containerH !== null && Math.abs(m.containerH - m.innerH) <= 2,
        noDoubleScroll: m.containerScroll <= 1,
        navStable: m.navBottomGap === null ? true : Math.abs(m.navBottomGap) <= 1,
        actionStable: m.actionBottomGap === null ? true : Math.abs(m.actionBottomGap) <= 1,
      };
      const ok = checks.noBodyScroll && checks.containerFits && checks.noDoubleScroll && checks.navStable && checks.actionStable && errors.length === 0;
      if (ok) pass++; else fail++;
      results.push({ size: `${w}x${h}`, page: p, ok, checks, m, errors });
      // 视觉抽查截图：最小屏 375x667
      if (w === 375 && h === 667) {
        const shotDir = 'C:/Users/PC/AppData/Local/Temp/trae/mobile-fit-shots';
        require('fs').mkdirSync(shotDir, { recursive: true });
        const name = p.split('.')[0].split('?')[0];
        try { await page.screenshot({ path: `${shotDir}/${name}-375x667.png` }); } catch (e) {}
      }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();

  // 输出
  for (const r of results) {
    const tag = r.ok ? 'PASS' : 'FAIL';
    console.log(`[${tag}] ${r.size} ${r.page} | body溢出:${r.m.bodyOverflow} 容器高:${r.m.containerH}/${r.m.innerH} 双滚:${r.m.containerScroll} 导航底距:${r.m.navBottomGap} 操作栏底距:${r.m.actionBottomGap} 内容区滚量:${r.m.contentScrollable}${r.errors.length ? ' | JS错误:' + r.errors.join(' ; ') : ''}`);
  }
  console.log(`\n总计 ${pass + fail} 项：PASS ${pass} / FAIL ${fail}`);
  const fails = results.filter(r => !r.ok);
  if (fails.length) {
    console.log('\n失败明细：');
    for (const r of fails) console.log(`- ${r.size} ${r.page}: ${JSON.stringify(r.checks)} errors=${JSON.stringify(r.errors)}`);
  }
  console.log('\n截图目录: C:/Users/PC/AppData/Local/Temp/trae/mobile-fit-shots');
  process.exit(fail ? 1 : 0);
})();
