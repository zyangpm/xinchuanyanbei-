// 失败项复核（修正测试参数后的实证）
const { chromium } = require('playwright');
const BASE = 'http://localhost:8081';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 150)));

  // B 登录（正确字段：手机号+密码，协议默认勾选）
  await page.goto(`${BASE}/login.html?qa=2`);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.fill('#phone-input', '13800000000');
  await page.fill('#password-input', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(1500);
  console.log('B1 登录后URL:', page.url());
  console.log('B2 userName:', await page.evaluate(() => localStorage.getItem('userName')));
  console.log('B3 首页文字:', (await page.evaluate(() => document.body.innerText)).slice(0, 60).replace(/\n/g, ' '));

  // G 考试历史：进入即落库
  await page.goto(`${BASE}/exam-comment.html?qa=2`);
  await page.waitForTimeout(1000);
  console.log('G1 exam_history:', await page.evaluate(() => localStorage.getItem('exam_history')));
  await page.goto(`${BASE}/exam-history.html?qa=2`);
  await page.waitForTimeout(800);
  console.log('G2 历史页文本:', (await page.evaluate(() => document.getElementById('history-container').innerText)).slice(0, 200).replace(/\n/g, ' | '));

  // J about 分区（意见反馈在 about 内）
  await page.goto(`${BASE}/settings.html?qa=2`);
  await page.waitForTimeout(600);
  const aboutOk = await page.evaluate(() => { try { showSettingsSection('about'); const d = document.getElementById('detail-content'); return { len: d.innerHTML.length, text: d.innerText.slice(0, 120) }; } catch (e) { return { err: e.message }; } });
  console.log('J about分区:', JSON.stringify(aboutOk).slice(0, 250));

  // F 实训详情正确 id
  await page.goto(`${BASE}/practice-detail.html?practice=practice001&qa=2`);
  await page.waitForTimeout(900);
  console.log('F1 实训详情文字长度:', await page.evaluate(() => document.body.innerText.length));
  console.log('F2 实训详情前80字:', (await page.evaluate(() => document.body.innerText)).slice(0, 80).replace(/\n/g, ' '));

  // E 短答数据（在 short-detail 页面上下文）
  await page.goto(`${BASE}/short-detail.html?qa=2`);
  await page.waitForTimeout(800);
  const sd = await page.evaluate(() => ({
    hasVar: typeof shortData !== 'undefined',
    firstId: (typeof shortData !== 'undefined' && shortData.items[0]) ? shortData.items[0].id : null,
    title: (document.getElementById('short-title') || {}).textContent
  }));
  console.log('E1 shortData:', JSON.stringify(sd));

  // D 语义复核：全新词 "no→yes" 与 "直接yes" 两种 masteredCount 行为
  await page.goto(`${BASE}/noun-detail.html?term=${encodeURIComponent('议程设置')}&qa=2`);
  await page.waitForTimeout(700);
  await page.evaluate(() => { localStorage.removeItem('wordRatings'); localStorage.setItem('masteredCount', '386'); });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.evaluate(() => handleStatus('no'));
  await page.waitForTimeout(200);
  await page.evaluate(() => { const m = document.querySelector('#confirm-modal-overlay'); if (m) m.style.display = 'none'; });
  await page.evaluate(() => handleStatus('yes'));
  await page.waitForTimeout(300);
  console.log('D1 先no后yes masteredCount:', await page.evaluate(() => localStorage.getItem('masteredCount')), '(词:议程设置)');

  // 全新词直接 yes
  await page.goto(`${BASE}/noun-detail.html?term=${encodeURIComponent('知沟理论')}&qa=2`);
  await page.waitForTimeout(700);
  await page.evaluate(() => { localStorage.setItem('masteredCount', '386'); });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.evaluate(() => handleStatus('yes')); // 第一次 yes：改文案不跳转
  await page.waitForTimeout(300);
  console.log('D2 新词直接yes(第一次点击) masteredCount:', await page.evaluate(() => localStorage.getItem('masteredCount')), '(第二次点击会随机跳词)');

  console.log('X 控制台错误:', errs.length ? errs.join(' | ') : 'clean');
  await browser.close();
})();
