const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Keybinds
  getKeybinds: () => ipcRenderer.invoke('get-keybinds'),
  saveKeybinds: (keybinds) => ipcRenderer.invoke('save-keybinds', keybinds),
  
  // AHK
  checkAHK: () => ipcRenderer.invoke('check-ahk'),
  installAHK: () => ipcRenderer.invoke('install-ahk'),
  startAHK: () => ipcRenderer.invoke('start-ahk'),
  stopAHK: () => ipcRenderer.invoke('stop-ahk'),
  restartAHK: () => ipcRenderer.invoke('restart-ahk'),
  
  // Utilities
  openConfigFolder: () => ipcRenderer.invoke('open-config-folder'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Event listeners
  onAHKStatus: (callback) => {
    ipcRenderer.on('ahk-status', (event, status) => callback(status));
  },
  onKeybindsLoaded: (callback) => {
    ipcRenderer.on('keybinds-loaded', (event, keybinds) => callback(keybinds));
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  }
});