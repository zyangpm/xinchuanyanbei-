// ===== 管理后台 Electron 主进程 =====
// 该文件负责启动管理后台窗口、设置菜单栏和应用生命周期。
// 这是管理员端的入口脚本，独立于学生端 APP，通常会单独打包成桌面程序。
// 作用概览：
// 1. 创建主窗口并加载 dashboard.html / index.html
// 2. 设置中文菜单栏和快捷功能
// 3. 处理窗口关闭、激活和退出事件

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

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
              message: '新传研背管理后台 v5.1.0\n管理员内容管理工具',
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
