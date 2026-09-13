const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const root = 'C:/Users/PC/Desktop/xinchuanyanbei-';
  const outDir = path.join(root, 'versions/v4.0/screenshots/admin');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });

  const loginUrl = 'file:///C:/Users/PC/Desktop/xinchuanyanbei-/apps/admin/index.html';
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.fill('#admin-username', 'admin');
  await page.fill('#admin-password', 'admin123');
  await page.screenshot({ path: path.join(outDir, '01-login-filled.png'), fullPage: true });
  await page.click('.login-btn');
  await page.waitForURL('**/dashboard.html', { timeout: 30000 });
  await page.waitForTimeout(1200);

  const navMap = [
    ['01-dashboard', '数据概览'],
    ['02-material', '资料管理'],
    ['03-ai', 'AI生成'],
    ['04-review', '内容审核'],
    ['05-bank', '题库管理'],
    ['06-publish', '发布管理'],
    ['07-stats', '数据统计'],
    ['08-feedback', '用户反馈']
  ];

  for (const [fileName, label] of navMap) {
    await page.locator('.nav-item').filter({ hasText: label }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, `${fileName}.png`), fullPage: true });
    console.log('saved', `${fileName}.png`);
  }

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
