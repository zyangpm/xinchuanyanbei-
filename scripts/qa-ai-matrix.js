// V5.0 AI 异常矩阵测试（stub fetch 注入故障，不依赖真实 Key 与网络）
const { chromium } = require('playwright');
const BASE = 'http://localhost:8081';
let pass = 0, fail = 0;
const out = [];
function check(name, cond, ev) {
  if (cond) { pass++; out.push('PASS ' + name); }
  else { fail++; out.push('FAIL ' + name + ' :: ' + String(ev).slice(0, 250)); }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  await page.goto(`${BASE}/noun-detail.html?term=${encodeURIComponent('新闻价值')}&qa=ai`);
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    localStorage.setItem('apiKey', 'sk-test-valid-format');
    localStorage.setItem('aiModel', 'deepseek');
    localStorage.setItem('aiModelName', 'DeepSeek');
  });

  async function runCase(label, fetchStub) {
    return page.evaluate(({ label, fetchStub }) => new Promise((resolve) => {
      window.__stubMode = fetchStub;
      window.fetch = function (url, opts) {
        const mode = window.__stubMode;
        if (mode === 'network') return Promise.reject(new TypeError('Failed to fetch'));
        if (mode === 'empty') return Promise.resolve(new Response(JSON.stringify({ choices: [] }), { status: 200 }));
        if (mode === 'malformed') return Promise.resolve(new Response('这不是JSON<<<', { status: 200, headers: { 'Content-Type': 'text/plain' } }));
        if (mode === 'emptyStr') return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: '   ' } }] }), { status: 200 }));
        if (mode === 'e500') return Promise.resolve(new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 500 }));
        if (mode === 'e429') return Promise.resolve(new Response('{}', { status: 429 }));
        return Promise.reject(new TypeError('unknown'));
      };
      // 打开 AI 助记并提交
      openAiAssistModal();
      setTimeout(() => {
        const input = document.getElementById('ai-assist-input');
        input.value = '测试问题-' + label;
        submitAiAssist();
        setTimeout(() => resolve({
          loading: !!document.getElementById('ai-loading-overlay'),
          title: (document.querySelector('#confirm-modal-overlay .confirm-title') || {}).textContent || null,
          msg: (document.querySelector('#confirm-modal-overlay .confirm-message') || {}).textContent || null
        }), 1200);
      }, 300);
    }), { label, fetchStub });
  }

  function closeAll() {
    return page.evaluate(() => {
      ['ai-assist-modal', 'confirm-modal-overlay'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
      // 清空隐藏弹窗的残留文本，避免后续用例读到上一次的提示造成误判
      const t = document.querySelector('#confirm-modal-overlay .confirm-title'); if (t) t.textContent = '';
      const m = document.querySelector('#confirm-modal-overlay .confirm-message'); if (m) m.textContent = '';
    });
  }

  // 1 网络错误
  let r = await runCase('network', 'network');
  check('AI 网络错误→明确提示', /网络连接失败/.test(r.msg || ''), JSON.stringify(r));
  await closeAll();
  // 2 500
  r = await runCase('e500', 'e500');
  check('AI HTTP500→异常提示不伪装成功', /AI 调用失败|异常/.test(r.title || '') && /500/.test(r.msg || ''), JSON.stringify(r));
  await closeAll();
  // 3 429
  r = await runCase('e429', 'e429');
  check('AI 429→限流/余额提示', /余额|频率|拒绝/.test(r.msg || ''), JSON.stringify(r));
  await closeAll();
  // 4 空 choices
  r = await runCase('empty', 'empty');
  check('AI 空choices→返回为空提示', /为空/.test(r.msg || ''), JSON.stringify(r));
  await closeAll();
  // 5 空白字符串
  r = await runCase('emptyStr', 'emptyStr');
  check('AI 空白content→返回为空提示', /为空/.test(r.msg || ''), JSON.stringify(r));
  await closeAll();
  // 6 非 JSON
  r = await runCase('malformed', 'malformed');
  check('AI 非JSON响应→异常提示不崩溃', /失败|异常|为空/.test((r.title || '') + (r.msg || '')), JSON.stringify(r));
  await closeAll();

  // 7 防重复点击：stub 挂起，连续触发两次 submit，loading 应只有一个且第二次被吞
  const dup = await page.evaluate(() => new Promise((resolve) => {
    window.fetch = () => new Promise(() => {});
    openAiAssistModal();
    setTimeout(() => {
      const input = document.getElementById('ai-assist-input');
      input.value = '连点测试';
      submitAiAssist();
      const state1 = !!window.__aiAssistState;
      try { submitAiAssist(); } catch (e) {}
      const overlays = document.querySelectorAll('#ai-loading-overlay').length;
      // 恢复 fetch 前取消
      const c = document.getElementById('ai-loading-cancel'); if (c) c.click();
      // 测试用的永久挂起 stub 不响应 AbortSignal（真实 fetch 会），手动复位调用锁，
      // 否则 calling 一直为 true 会让后续用例的 submitAiAssist 被防重点击逻辑直接吞掉
      if (typeof aiAssistState !== 'undefined') aiAssistState.calling = false;
      resolve({ overlays });
    }, 300);
  }));
  check('AI 连点不产生多个loading浮层', dup.overlays === 1, JSON.stringify(dup));

  // 8 V5.1：GPT 是「用户自配置」厂商（不再是"待接入"）。
  //    未填 URL/Key 时必须明确拦截、零网络请求，并引导去配置
  const unsup = await page.evaluate(() => new Promise((resolve) => {
    localStorage.setItem('aiModel', 'gpt');
    localStorage.removeItem('aiProviderConfig');
    window.__reqCount = 0;
    window.fetch = function () { window.__reqCount++; return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: '不该发出的请求' } }] }), { status: 200 })); };
    openAiAssistModal();
    setTimeout(() => {
      document.getElementById('ai-assist-input').value = 'gpt测试';
      submitAiAssist();
      setTimeout(() => resolve({
        req: window.__reqCount,
        title: (document.querySelector('#confirm-modal-overlay .confirm-title') || {}).textContent,
        msg: (document.querySelector('#confirm-modal-overlay .confirm-message') || {}).textContent
      }), 500);
    }, 300);
  }));
  check('GPT 未配置URL/Key→明确拦截且零请求', /模型尚未配置/.test(unsup.title || '') && /接口地址|URL/.test(unsup.msg || '') && /API Key/.test(unsup.msg || '') && unsup.req === 0, JSON.stringify(unsup));
  await closeAll();
  await page.evaluate(() => localStorage.setItem('aiModel', 'deepseek'));

  // 9 DeepSeek 开箱即用但无 Key：拦截提示配置，且零网络请求
  const nokey = await page.evaluate(() => new Promise((resolve) => {
    localStorage.removeItem('apiKey');
    window.__reqCount = 0;
    openAiAssistModal();
    setTimeout(() => {
      document.getElementById('ai-assist-input').value = '无key';
      submitAiAssist();
      setTimeout(() => resolve({
        req: window.__reqCount,
        title: (document.querySelector('#confirm-modal-overlay .confirm-title') || {}).textContent,
        msg: (document.querySelector('#confirm-modal-overlay .confirm-message') || {}).textContent
      }), 500);
    }, 300);
  }));
  check('DeepSeek 无Key→拦截引导配置且零请求', /未配置 API Key/.test(nokey.title || '') && nokey.req === 0, JSON.stringify(nokey));

  // 10 视频不伪造
  await closeAll();
  const video = await page.evaluate(() => {
    document.getElementById('video-prompt').value = '测试';
    generateVideo();
    return {
      title: (document.querySelector('#confirm-modal-overlay .confirm-title') || {}).textContent,
      msg: (document.querySelector('#confirm-modal-overlay .confirm-message') || {}).textContent,
      btn: (document.getElementById('video-gen-btn') || {}).textContent || null
    };
  });
  check('AI视频→待接入不伪造成功', /待接入/.test(video.title || '') && !/成功 ✓/.test(video.btn || ''), JSON.stringify(video));

  console.log(out.join('\n'));
  console.log(`\nAI矩阵：PASS ${pass} / FAIL ${fail}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
