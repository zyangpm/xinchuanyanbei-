// 本地验证 Vercel 单函数入口 handleAll 的路由分发
process.env.XC_DB = 'turso';
const fs = require('fs');
const sec = fs.readFileSync(require('path').join(__dirname, '..', 'apps', 'server', 'data', '.deploy-secrets.env'), 'utf8');
for (const line of sec.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const handler = require('../apps/server/src/app.cjs');

function makeReq(method, url, body, headers) {
  return {
    method,
    url,
    headers: Object.assign({ 'content-type': 'application/json' }, headers || {}),
    on() {}, // 兼容 EventEmitter 调用
    body: body ? JSON.stringify(body) : undefined,
  };
}
function makeRes() {
  const res = { statusCode: 200, _data: null, headers: {} };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.writeHead = (c) => { res.statusCode = c; };
  res.end = (d) => { res._data = d || ''; };
  res.sendJson = (code, obj) => { res.statusCode = code; res._data = JSON.stringify(obj); };
  return res;
}

async function call(method, url, body, headers) {
  const res = makeRes();
  await handler(makeReq(method, url, body, headers), res);
  let parsed = null;
  try { parsed = JSON.parse(res._data); } catch (e) {}
  return { status: res.statusCode, data: parsed || res._data };
}

(async () => {
  const lines = [];
  lines.push(JSON.stringify(['health', await call('GET', '/api/health')]));
  lines.push(JSON.stringify(['register', await call('POST', '/api/auth/register', { username: 'test_route_01', password: 'Test12345', nickname: '路由测试' })]));
  const login = await call('POST', '/api/auth/login', { username: 'test_route_01', password: 'Test12345' });
  lines.push(JSON.stringify(['login', login]));
  const token = login.data && login.data.data && login.data.data.token;
  lines.push(JSON.stringify(['me', await call('GET', '/api/auth/me', null, { authorization: 'Bearer ' + token })]));
  lines.push(JSON.stringify(['questions', await call('GET', '/api/questions')]));
  lines.push(JSON.stringify(['404', await call('GET', '/api/nothing')]));
  lines.push(JSON.stringify(['root', await call('GET', '/')]));
  fs.writeFileSync(require('path').join(__dirname, 'test-handler-out2.txt'), lines.join('\n'), 'utf8');
  console.log('DONE');
})().catch((e) => {
  fs.writeFileSync(require('path').join(__dirname, 'test-handler-out2.txt'), 'ERROR: ' + (e && e.stack || String(e)), 'utf8');
});
