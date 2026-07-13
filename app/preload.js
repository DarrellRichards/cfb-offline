const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cfbDesktop', {
  isDesktop: true,
  getDefaultDir: () => ipcRenderer.invoke('saves:getDefaultDir'),
  listDynastySaves: (dirPath) => ipcRenderer.invoke('saves:listDynasty', dirPath),
  pickDir: () => ipcRenderer.invoke('saves:pickDir'),
  pickSaveFile: () => ipcRenderer.invoke('saves:pickFile'),
  promptStartupSave: () => ipcRenderer.invoke('saves:promptStartup'),
});
