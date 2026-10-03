// ===== 新传研背 后端 · 公共工具（JSON 响应 / 请求体解析）=====
/** 统一 JSON 响应。 */
function sendJson(res, httpCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(httpCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

/** 读取并解析请求体 JSON（限制 5MB）。 */
function readJsonBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 5 * 1024 * 1024) { req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

/** ISO 8601 当前时间（同步协议统一格式）。 */
function nowIso() {
  return new Date().toISOString();
}

// ---------- 同 IP 限流（防登录/注册爆破；Vercel 多实例各自计数，属演示级防护） ----------
const rateBuckets = new Map(); // ip -> { count, expire }
/**
 * 对当前请求做窗口限流；超限时直接写 429 响应并返回 false。
 * @param {number} limit 窗口内最大次数
 * @param {number} windowMs 窗口毫秒
 */
function rateLimit(req, res, limit, windowMs) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'local';
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || b.expire < now) {
    rateBuckets.set(ip, { count: 1, expire: now + windowMs });
    return true;
  }
  b.count += 1;
  if (b.count > limit) {
    sendJson(res, 429, { code: 429, message: '操作过于频繁，请稍后再试', data: null });
    return false;
  }
  return true;
}

module.exports = { sendJson, readJsonBody, nowIso, rateLimit };
