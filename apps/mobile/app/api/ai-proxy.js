// ===== 新传研背 线上 AI 同源代理（Vercel Serverless Function） =====
// 作用：网页/PWA 端部分 AI 厂商（智谱/Kimi/讯飞/OpenAI/Claude/Gemini/火山方舟视频）不返回 CORS 头，
//       浏览器直连必然失败。本函数把 /api/ai-proxy?u=<厂商URL> 的请求转发到目标厂商，
//       并把响应（含 JSON body 与 content-type）透传回浏览器，绕过浏览器 CORS 限制。
// 安全边界：
//   - 只允许白名单来源（环境变量 XC_AI_ALLOWED_ORIGINS，默认学生端域名 + 本地开发）。
//   - 目标 u 必须为 https URL（禁止内网/本地地址 SSRF）。
//   - 不透传 Cookie；只转发 Authorization 与 Content-Type。
// 部署：apps/mobile/app 为 Vercel 静态项目根目录，api/ 子目录会被自动识别为 Serverless Functions。

// eslint-disable-next-line no-undef
module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = (process.env.XC_AI_ALLOWED_ORIGINS ||
    'https://app-three-orpin-61.vercel.app,http://localhost:8081,http://localhost:3000,http://127.0.0.1:8081')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (origin && allowed.indexOf(origin) < 0) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { message: 'forbidden origin' } }));
    return;
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.end();
    return;
  }

  const target = typeof req.query.u === 'string' ? req.query.u : '';
  if (!/^https:\/\//.test(target)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { message: 'target must be https url' } }));
    return;
  }

  const method = req.method || 'POST';
  const headers = {};
  const auth = req.headers.authorization;
  if (auth) headers.Authorization = auth;
  const ct = req.headers['content-type'];
  if (ct) headers['Content-Type'] = ct;

  let body;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      body = raw;
    } catch (e) {
      body = '';
    }
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      signal: ctrl.signal,
      redirect: 'follow'
    });
    clearTimeout(timer);
    const text = await upstream.text();
    res.statusCode = upstream.status;
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    const upstreamCt = upstream.headers.get('content-type');
    if (upstreamCt) res.setHeader('Content-Type', upstreamCt);
    res.end(text);
  } catch (e) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { message: '代理转发失败: ' + (e && e.name === 'AbortError' ? '超时' : '网络错误') } }));
  }
};
