// 新传研背 本地静态服务器（用于手机适配检查/预览）
// 用法: node scripts/static-server.js [port]  → 默认 8080
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'apps', 'mobile');
const PORT = Number(process.argv[2] || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.md': 'text/plain; charset=utf-8'
};

// 根路径从 apps/mobile 映射到其父级，便于访问 ../../../packages/content
// 简单方案：ROOT 设为仓库根，URL 直接拼路径
const REPO_ROOT = path.resolve(__dirname, '..');
const REPO_MIME = Object.assign({}, MIME, { '.txt': 'text/plain; charset=utf-8' });

http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let filePath = path.join(REPO_ROOT, urlPath);
    if (!filePath.startsWith(REPO_ROOT)) { res.writeHead(403); return res.end('forbidden'); }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      // 目录默认找 index.html
      const idx = path.join(filePath, 'index.html');
      if (fs.existsSync(idx)) filePath = idx;
      else { res.writeHead(404); return res.end('not found: ' + urlPath); }
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': REPO_MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.writeHead(500); res.end(String(e && e.message || 'err'));
  }
}).listen(PORT, () => console.log('静态服务器: http://localhost:' + PORT + '/apps/mobile/app/index.html'));
