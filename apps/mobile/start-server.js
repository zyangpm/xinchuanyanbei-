const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

// ===== V5.1 AI 接口同源转发白名单 =====
// 浏览器（网页/PWA）直接请求讯飞星火、OpenAI 等端点会被 CORS 拦截，
// 由本服务仅对白名单主机做透明转发；不在白名单内的目标一律拒绝，避免变成开放代理。
const AI_PROXY_HOSTS = [
    'api.deepseek.com', 'open.bigmodel.cn', 'api.moonshot.cn',
    'spark-api-open.xf-yun.com', 'api.openai.com',
    'generativelanguage.googleapis.com', 'api.anthropic.com',
    // V5.1 视频生成：火山方舟 doubao-seedream 视频模型
    'ark.cn-beijing.volces.com'
];

function isProxyHostAllowed(hostname) {
    var host = String(hostname || '').toLowerCase();
    return AI_PROXY_HOSTS.some(function (h) {
        // 精确匹配，或严格的"子域"后缀匹配；必须先保证主机名比 h 长，
        // 否则短主机名时 indexOf/slice 会以 -1/错位造成误放行
        if (host === h) return true;
        return host.length > h.length + 1 && host.slice(-(h.length + 1)) === ('.' + h);
    });
}

function handleAiProxy(req, res) {
    var targetParam = '';
    try {
        targetParam = new URL(req.url, 'http://localhost').searchParams.get('u') || '';
    } catch (e) { targetParam = ''; }
    var targetUrl = null;
    try {
        targetUrl = new URL(targetParam);
    } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: { message: 'invalid target url' } }));
        return;
    }
    if (targetUrl.protocol !== 'https:' || !isProxyHostAllowed(targetUrl.hostname)) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: { message: 'target host is not allowed by proxy policy' } }));
        return;
    }

    const chunks = [];
    let bodySize = 0;
    req.on('data', function (c) {
        bodySize += c.length;
        if (bodySize > 2 * 1024 * 1024) { req.destroy(); return; }
        chunks.push(c);
    });
    req.on('end', function () {
        const body = Buffer.concat(chunks);
        // V5.1：跟随原请求方法——视频生成 API 提交是 POST，查询任务状态是 GET
        const method = (req.method === 'GET') ? 'GET' : 'POST';
        const headers = {
            'Authorization': req.headers['authorization'] || ''
        };
        if (method === 'POST') {
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = body.length;
        }
        const proxyReq = https.request({
            protocol: 'https:',
            hostname: targetUrl.hostname,
            port: targetUrl.port || 443,
            path: targetUrl.pathname + targetUrl.search,
            method: method,
            headers: headers,
            timeout: 60000
        }, function (proxyRes) {
            res.writeHead(proxyRes.statusCode, {
                'Content-Type': proxyRes.headers['content-type'] || 'application/json; charset=utf-8'
            });
            proxyRes.pipe(res);
        });
        proxyReq.on('timeout', function () { proxyReq.destroy(new Error('upstream timeout')); });
        proxyReq.on('error', function (err) {
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: { message: 'ai proxy upstream error' } }));
            }
        });
        proxyReq.end(method === 'POST' ? body : undefined);
    });
    req.on('error', function () {
        if (!res.headersSent) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: { message: 'bad request body' } }));
        }
    });
}

const PORT = 8081;
const mobileDir = __dirname;
const monorepoRoot = path.resolve(__dirname, '../..');
const appDir = path.join(mobileDir, 'app');
const assetsDir = path.join(mobileDir, 'assets');
const contentDir = path.join(monorepoRoot, 'packages', 'content');
const adminDir = path.join(monorepoRoot, 'apps', 'admin');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    let candidates = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const addr = iface.address;
                if (!addr.startsWith('198.18.') && !addr.startsWith('172.17.') &&
                    !addr.startsWith('10.0.2.') && !addr.startsWith('169.254.')) {
                    candidates.push(addr);
                }
            }
        }
    }
    if (candidates.length > 0) {
        return candidates.find(a => a.startsWith('192.168.')) || candidates[0];
    }
    return '127.0.0.1';
}

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8'
};

const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);

    if (reqPath === '/') {
        reqPath = '/index.html';
    }

    if (reqPath === '/qr') {
        const ip = getLocalIP();
        const url = 'http://' + ip + ':' + PORT + '/';
        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>新传研背 - 手机扫码</title>
<style>
body{font-family:-apple-system,sans-serif;background:#FDFBF7;margin:0;padding:40px 20px;text-align:center;color:#243A5E}
.box{max-width:500px;margin:0 auto;background:#fff;padding:40px 30px;border-radius:20px;box-shadow:0 8px 32px rgba(36,58,94,0.1)}
.logo{width:80px;height:80px;border-radius:20px;margin:0 auto 20px;background-image:url('/assets/icon.png');background-size:220%;background-position:center center;background-repeat:no-repeat}
h1{font-size:24px;margin:0 0 10px}
.url{background:#f5f5f5;padding:12px 20px;border-radius:10px;font-family:monospace;font-size:14px;margin:20px 0;word-break:break-all}
.qr-area{margin:30px 0}
.qr-area img{width:240px;height:240px;border:10px solid #fff;box-shadow:0 4px 16px rgba(0,0,0,0.1);border-radius:12px}
.tip{background:#FFF8E1;padding:16px;border-radius:10px;text-align:left;font-size:14px;line-height:1.8;margin:20px 0}
.tip strong{color:#F57C00}
</style></head>
<body><div class="box">
<div class="logo"></div>
<h1>新传研背 V5.1</h1>
<p>手机扫码即可使用</p>
<div class="url">${url}</div>
<div class="qr-area">
<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}" alt="二维码"/>
</div>
<div class="tip">
<strong>📱 iPhone 用户：</strong>
<ol>
<li>用相机或微信扫上面的二维码</li>
<li>用 Safari 打开链接</li>
<li>点底部"分享"按钮（向上箭头）</li>
<li>选"添加到主屏幕"→ 点"添加"</li>
<li>桌面出现"新传研背"图标，像APP一样用</li>
</ol>
</div>
<div class="tip">
<strong>🤖 Android 用户：</strong>
<ol>
<li>用浏览器扫上面的二维码打开链接</li>
<li>点浏览器菜单（三个点）</li>
<li>选"添加到主屏幕"或"安装应用"</li>
</ol>
</div>
</div></body></html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
    }

    // V5.1：AI 接口同源转发（POST 提交 + GET 查询都支持，主机白名单见文件头）
    if (reqPath === '/api/ai-proxy' && (req.method === 'POST' || req.method === 'GET')) {
        handleAiProxy(req, res);
        return;
    }

    // 后台管理平台：/admin/* → apps/admin/*
    if (reqPath.startsWith('/admin/')) {
        if (reqPath === '/admin/' || reqPath === '/admin') {
            serveFile(path.join(adminDir, 'index.html'), res);
            return;
        }
        const adminPath = path.join(adminDir, reqPath.replace('/admin/', ''));
        serveFile(adminPath, res);
        return;
    }

    // 题库数据：/packages/content/* → packages/content/*
    if (reqPath.startsWith('/packages/content/')) {
        const contentPath = path.join(contentDir, reqPath.replace('/packages/content/', ''));
        serveFile(contentPath, res);
        return;
    }

    // 移动端静态资源：/assets/* → apps/mobile/assets/*
    if (reqPath.startsWith('/assets/')) {
        const assetPath = path.join(assetsDir, reqPath.replace('/assets/', ''));
        serveFile(assetPath, res);
        return;
    }

    // 移动端默认：尝试从 apps/mobile/app/ 提供文件
    const appPath = path.join(appDir, reqPath);
    if (fs.existsSync(appPath) && fs.statSync(appPath).isFile()) {
        serveFile(appPath, res);
    } else {
        serveFile(appPath, res);
    }
});

function serveFile(filePath, res) {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Page Not Found</h1>');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
}

server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    const url = 'http://' + ip + ':' + PORT + '/';
    const qrUrl = 'http://' + ip + ':' + PORT + '/qr';

    console.log('==================================================');
    console.log('    Xinchuan Yanbei V5.1 - Mobile Service Started');
    console.log('==================================================');
    console.log('');
    console.log('   Mobile URL: ' + url);
    console.log('   QR Code:    ' + qrUrl);
    console.log('   Admin URL:  ' + url + 'admin/');
    console.log('');
    console.log('   Browser will open automatically...');
    console.log('   Scan QR code with your phone.');
    console.log('');
    console.log('   Press Ctrl+C to stop.');
    console.log('==================================================');

    exec('start "" "' + qrUrl + '"');
});
