// Electron CDP 原生协议验证（绕过 Playwright 兼容问题）
const list = await (await fetch('http://127.0.0.1:9223/json')).json();
const target = list.find(t => t.type === 'page') || list[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
};
await new Promise(r => ws.onopen = r);
await send('Runtime.enable');
await send('Log.enable');
const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  }
});
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

// E1 首页
console.log('E1 首页:', JSON.stringify(await ev(`(() => ({
  url: location.href.split('/').pop(), title: document.title,
  textLen: document.body.innerText.length,
  containerH: Math.round(document.querySelector('.container').getBoundingClientRect().height),
  innerH: window.innerHeight,
  bodyOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight
}))()`)));

// E2 localStorage
console.log('E2 localStorage:', await ev(`localStorage.setItem('qa_probe','ok'), localStorage.getItem('qa_probe')`));

// E3 导航知识库
await ev(`location.href='knowledge.html'`);
await new Promise(r => setTimeout(r, 1500));
console.log('E3 知识库:', JSON.stringify(await ev(`(() => ({
  url: location.href.split('/').pop(), rows: document.querySelectorAll('.lib-row').length,
  textLen: document.body.innerText.length,
  containerH: Math.round(document.querySelector('.container').getBoundingClientRect().height),
  innerH: window.innerHeight,
  bodyOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight
}))()`)));

// E4 名词详情 file:// 数据加载
await ev(`location.href='noun-detail.html?term='+encodeURIComponent('议程设置')`);
await new Promise(r => setTimeout(r, 1500));
console.log('E4 名词详情:', JSON.stringify(await ev(`({
  title:(document.getElementById('noun-title')||{}).textContent,
  textLen:document.body.innerText.length,
  bodyOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight
})`)));

// E5 刷新持久化
await ev(`location.reload()`);
await new Promise(r => setTimeout(r, 1500));
console.log('E5 刷新后probe:', await ev(`localStorage.getItem('qa_probe')`));

await new Promise(r => setTimeout(r, 500));
console.log('E6 JS异常:', errors.length ? JSON.stringify(errors) : 'clean');
ws.close();
process.exit(0);
