const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({ name: '新传研背V4' });

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
              message: '新传研背 V4.0.0\n新传考研考试模拟系统',
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
    icon: path.join(__dirname, 'assets/icon.svg'),
    title: '新传研背',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupChineseMenu();
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