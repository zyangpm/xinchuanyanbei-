// ===== 学生端 Electron 主进程 =====
// 这是学生端 APP 的桌面版入口脚本，负责：
// 1. 启动启动页 splash 和主窗口
// 2. 通过 electron-store 管理本地配置与缓存
// 3. 暴露 IPC 通道给前端页面，允许读取/写入本地存储
// 4. 统一设置菜单和应用级对话框

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const Store = require('electron-store');

const store = new Store({ name: '新传研背V5' });

// V5.1.1：桌面版自动拉起后端服务（系统 node 运行 apps/server/src/server.js，要求 Node>=22）
// 端口 3000 已有服务则跳过；本机无 node 或启动失败时静默降级，不影响本地背诵功能。
function ensureBackend() {
  const probe = http.request({ host: '127.0.0.1', port: 3000, path: '/api/questions', method: 'GET', timeout: 800 }, (res) => {
    res.destroy(); // 已有后端在跑，跳过
  });
  probe.on('error', () => startBackend());
  probe.on('timeout', () => { probe.destroy(); startBackend(); });
  probe.end();
}

function startBackend() {
  try {
    const serverEntry = path.join(__dirname, '..', 'server', 'src', 'server.js');
    const serverDir = path.dirname(serverEntry);
    const child = spawn('node', [serverEntry], { cwd: serverDir, stdio: 'ignore', detached: true });
    child.on('error', () => { /* 系统无 node / 启动失败：静默降级 */ });
    child.unref();
  } catch (e) { /* 静默降级 */ }
}

let mainWindow;
let splashWindow;

function setupChineseMenu() {
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
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '关闭', role: 'close' },
        { type: 'separator' },
        { label: '置顶', role: 'toggleAlwaysOnTop' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { 
          label: '关于新传研背', 
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: '关于新传研背',
              message: '新传研背 V5.1.1\n新传考研考试模拟系统',
              type: 'info'
            });
          }
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    center: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // 与管理后台一致：preload 用 fs 读写双端共享文件，需关闭沙箱（contextIsolation 仍保留）
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'app/splash.html'));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 600,
    minHeight: 500,
    center: true,
    show: false,
    backgroundColor: '#FBF7EE',
    icon: path.join(__dirname, 'assets/icon.png'),
    title: '新传研背',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'app/index.html'));

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
    }
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.setTitle('新传研背');
  });

  // V5.1.1：导航防护——仅允许应用内页面（file:// 本机或本机 8081 网页版），外部导航一律拦截
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith('file://')
      || url.indexOf('localhost:8081') > -1
      || url.indexOf('127.0.0.1:8081') > -1;
    if (!allowed) {
      event.preventDefault();
      console.warn('[nav] blocked navigation to: ' + url);
    }
  });

  // V5.1.1：禁止应用内弹出新窗口；外部链接一律拒绝
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.warn('[nav] blocked window.open: ' + url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupChineseMenu();
  ensureBackend(); // 自动拉起后端（云同步用），失败静默
  createSplashWindow();

  setTimeout(() => {
    createMainWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-store', (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-store', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('delete-store', (event, key) => {
  store.delete(key);
  return true;
});

ipcMain.handle('open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});