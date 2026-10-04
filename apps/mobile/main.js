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
// V5.2：桌面端自动更新（发布源为 GitHub Releases，由 electron-builder publish 配置）
let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; } catch (e) { /* 本地开发无 electron-updater：跳过 */ }

const store = new Store({ name: '新传研背V5' });

// V5.1.1：学生端与管理后台共用同一数据目录（后端数据库、API 令牌），保证双端数据一致
app.setPath('userData', path.join(app.getPath('appData'), 'xinchuan-yanbei'));

// V5.1.1：桌面版自动拉起后端服务（系统 node 运行 apps/server/src/server.js，要求 Node>=22）
// 端口 3000 已有服务则跳过；本机无 node 或启动失败时静默降级，不影响本地背诵功能。
// 打包版：后端位于 app.asar.unpacked（asar 归档原生 node 无法读取，故解包），
// 数据目录通过 XC_DATA_DIR 指向统一 userData（%APPDATA%/xinchuan-yanbei），保证可写且双端共用。
function backendEntryPath() {
  // 打包配置 asar:false，文件落在 resources/app/ 真实文件系统，路径与源码一致（原生 node 可直接读取）
  return path.join(__dirname, '..', 'server', 'src', 'server.js');
}

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
    const serverEntry = backendEntryPath();
    const serverDir = path.dirname(serverEntry);
    const child = spawn('node', [serverEntry], {
      cwd: serverDir,
      stdio: 'ignore',
      detached: true,
      env: Object.assign({}, process.env, { XC_DATA_DIR: app.getPath('userData') })
    });
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
              message: '新传研背 V5.2.1\n新传考研考试模拟系统',
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

  // V5.2：主窗口创建后再检查更新（弹窗依赖 mainWindow），失败静默不打扰
  setTimeout(() => {
    setupAutoUpdater();
  }, 6000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// V5.2 自动更新：发现新版本 → 询问下载 → 下载完成 → 询问重启安装。
// 无更新 / 网络不可用 / 未配置发布源时静默跳过，不影响正常使用。
function setupAutoUpdater() {
  if (!autoUpdater) return;
  try {
    autoUpdater.autoDownload = false; // 先询问，用户确认后才下载
    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox(mainWindow || null, {
        type: 'info',
        title: '发现新版本',
        message: '发现新版本 ' + (info && info.version ? info.version : '') + '，是否立即下载更新？',
        detail: '下载完成后会提示重启安装，不影响您的本地数据。',
        buttons: ['下载', '稍后'],
        defaultId: 0,
        cancelId: 1
      }).then((r) => {
        if (r.response === 0) autoUpdater.downloadUpdate();
      }).catch(() => {});
    });
    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox(mainWindow || null, {
        type: 'info',
        title: '更新已就绪',
        message: '新版本已下载完成，重启应用即可完成更新。',
        detail: '建议先保存当前学习进度（数据已云同步）。',
        buttons: ['立即重启', '稍后'],
        defaultId: 0,
        cancelId: 1
      }).then((r) => {
        if (r.response === 0) autoUpdater.quitAndInstall();
      }).catch(() => {});
    });
    autoUpdater.on('error', (err) => {
      // 静默记录：首启无网络 / 未发布新版本等情况不打扰用户
      console.warn('[updater] ' + ((err && err.message) || err));
    });
    autoUpdater.checkForUpdates().catch(() => {});
  } catch (e) {
    console.warn('[updater] disabled: ' + ((e && e.message) || e));
  }
}

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