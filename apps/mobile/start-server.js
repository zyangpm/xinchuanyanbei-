const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

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
<h1>新传研背 V4.0</h1>
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

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
}

server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    const url = 'http://' + ip + ':' + PORT + '/';
    const qrUrl = 'http://' + ip + ':' + PORT + '/qr';

    console.log('==================================================');
    console.log('    Xinchuan Yanbei V4.0 - Mobile Service Started');
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
