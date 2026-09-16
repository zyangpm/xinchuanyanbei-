// ===== 预加载脚本 =====
// 这是 Electron 的安全桥接层，作用是：
// 1. 在渲染进程中暴露最小化 API
// 2. 避免直接让页面访问 Node.js 的强大能力，增强安全性
// 3. 让页面通过 window.electronAPI 调用主进程功能，如存储、打开文件对话框
// 4. V5.1：window.xcShared 提供学生端与管理后台「桌面版双应用」之间的共享数据文件桥接
//    两个独立 Electron 应用（学生端 / 管理后台）各自的 userData/localStorage 不互通，
//    因此通过用户目录下的同一个 JSON 文件同步题库操作、资料与反馈。

const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 两端 preload 使用完全相同的固定路径，保证读到同一个文件
var SHARED_FILE = path.join(os.homedir(), '.xinchuan-yanbei', 'shared.json');

function readShared() {
  try {
    return JSON.parse(fs.readFileSync(SHARED_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeShared(data) {
  try {
    fs.mkdirSync(path.dirname(SHARED_FILE), { recursive: true });
    fs.writeFileSync(SHARED_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  getStore: (key) => ipcRenderer.invoke('get-store', key),
  setStore: (key, value) => ipcRenderer.invoke('set-store', key, value),
  deleteStore: (key) => ipcRenderer.invoke('delete-store', key),
  openDialog: (options) => ipcRenderer.invoke('open-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options)
});

// 学生端 / 管理后台共用的数据同步桥
contextBridge.exposeInMainWorld('xcShared', {
  mode: 'electron',
  getAll: () => readShared(),
  setCollection: (name, value) => {
    var data = readShared();
    data[name] = value;
    return writeShared(data);
  }
});
