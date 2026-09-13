// ===== 预加载脚本 =====
// 这是 Electron 的安全桥接层，作用是：
// 1. 在渲染进程中暴露最小化 API
// 2. 避免直接让页面访问 Node.js 的强大能力，增强安全性
// 3. 让页面通过 window.electronAPI 调用主进程功能，如存储、打开文件对话框

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getStore: (key) => ipcRenderer.invoke('get-store', key),
  setStore: (key, value) => ipcRenderer.invoke('set-store', key, value),
  deleteStore: (key) => ipcRenderer.invoke('delete-store', key),
  openDialog: (options) => ipcRenderer.invoke('open-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options)
});