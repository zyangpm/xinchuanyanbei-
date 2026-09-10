const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getStore: (key) => ipcRenderer.invoke('get-store', key),
  setStore: (key, value) => ipcRenderer.invoke('set-store', key, value),
  deleteStore: (key) => ipcRenderer.invoke('delete-store', key),
  openDialog: (options) => ipcRenderer.invoke('open-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options)
});