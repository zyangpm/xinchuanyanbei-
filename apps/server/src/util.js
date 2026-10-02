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

module.exports = { sendJson, readJsonBody, nowIso };
