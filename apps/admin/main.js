// ===== 管理后台 Electron 主进程 =====
// 该文件负责启动管理后台窗口、设置菜单栏和应用生命周期。
// 这是管理员端的入口脚本，独立于学生端 APP，通常会单独打包成桌面程序。
// 作用概览：
// 1. 创建主窗口并加载 dashboard.html / index.html
// 2. 设置中文菜单栏和快捷功能
// 3. 处理窗口关闭、激活和退出事件

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

let mainWindow;

// V5.1.1：管理后台与学生端共用同一数据目录（后端数据库、API 令牌），保证双端数据一致
app.setPath('userData', path.join(app.getPath('appData'), 'xinchuan-yanbei'));

// V5.1.1：管理后台 exe 启动时自动拉起配套服务（替代原 .bat 脚本）：
// 1. 后端 API（127.0.0.1:3000，供管理端与学生端云同步）
// 2. 网页版服务（0.0.0.0:8081，手机扫码访问手机端/PWA）
// 均用系统 node 运行（要求 Node>=22）；端口已占用则跳过；无 node 或失败时静默降级。
// 打包版：脚本位于 app.asar.unpacked（asar 归档原生 node 无法读取，故解包）。
function backendEntryPath() {
  // 打包配置 asar:false，文件落在 resources/app/ 真实文件系统，路径与源码一致（原生 node 可直接读取）
  return path.join(__dirname, '..', 'server', 'src', 'server.js');
}

function webEntryPath() {
  // 同上：网页版服务脚本与页面目录随包解出，原生 node 可直接读取
  return path.join(__dirname, '..', 'mobile', 'start-server.js');
}

function ensureService(port, entryFile, cwd) {
  const probe = http.request({ host: '127.0.0.1', port: port, path: '/', method: 'GET', timeout: 800 }, (res) => {
    res.destroy(); // 已有服务在跑，跳过
  });
  probe.on('error', () => startService(entryFile, cwd));
  probe.on('timeout', () => { probe.destroy(); startService(entryFile, cwd); });
  probe.end();
}

function startService(entryFile, cwd) {
  try {
    const child = spawn('node', [entryFile], {
      cwd: cwd,
      stdio: 'ignore',
      detached: true,
      env: Object.assign({}, process.env, { XC_DATA_DIR: app.getPath('userData') })
    });
    child.on('error', () => { /* 系统无 node / 启动失败：静默降级 */ });
    child.unref();
  } catch (e) { /* 静默降级 */ }
}

function ensureBackend() {
  ensureService(3000, backendEntryPath(), path.dirname(backendEntryPath()));
}

function ensureWeb() {
  ensureService(8081, webEntryPath(), path.dirname(webEntryPath()));
}

function createAdminMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '刷新', role: 'reload' },
        { label: '强制刷新', role: 'forceReload' },
        { type: 'separator' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { label: '重置缩放', role: 'resetZoom' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于管理后台',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              title: '关于',
              message: '新传研背管理后台 v5.2.1\n管理员内容管理工具',
              type: 'info'
            });
          }
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    center: true,
    title: '新传研背管理后台',
    icon: path.join(__dirname, 'public', 'logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // preload 需要 fs 读写双端共享 JSON（~/.xinchuan-yanbei/shared.json），
      // Electron 20+ 默认 sandbox:true 会禁止 preload require('fs')，必须显式关闭沙箱
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createAdminMenu();
  ensureBackend(); // 自动拉起后端 API（失败静默）
  ensureWeb();    // 自动拉起网页版服务（手机扫码访问）
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
