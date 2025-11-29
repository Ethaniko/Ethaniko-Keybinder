const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec, execSync } = require('child_process');
const https = require('https');
const { autoUpdater } = require('electron-updater');

// Disable hardware acceleration for better compatibility
app.disableHardwareAcceleration();

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

let mainWindow;
let tray;
let ahkProcess = null;
let isQuitting = false;

// Paths
const userDataPath = app.isPackaged 
  ? path.dirname(app.getPath('exe'))
  : __dirname;

const keybindsFile = path.join(userDataPath, 'keybinds.ahk');
const configFile = path.join(userDataPath, 'keybinds.txt');
const ahkInstallerPath = path.join(userDataPath, 'AutoHotkey_v2_Setup.exe');

// AHK v2 download URL
const AHK_V2_URL = 'https://www.autohotkey.com/download/ahk-v2.exe';
const AHK_V2_PORTABLE_URL = 'https://www.autohotkey.com/download/ahk-v2.zip';

// Check if running as portable
const isPortable = !app.isPackaged || process.env.PORTABLE_EXECUTABLE_DIR;

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Find AutoHotkey v2 executable
function findAHKv2() {
  const possiblePaths = [
    path.join(userDataPath, 'AutoHotkey', 'v2', 'AutoHotkey64.exe'),
    path.join(userDataPath, 'AutoHotkey', 'v2', 'AutoHotkey32.exe'),
    path.join(userDataPath, 'AutoHotkey', 'AutoHotkey64.exe'),
    path.join(userDataPath, 'AutoHotkey', 'AutoHotkey32.exe'),
    path.join(userDataPath, 'AutoHotkey64.exe'),
    path.join(userDataPath, 'AutoHotkey32.exe'),
    'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe',
    'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey32.exe',
    'C:\\Program Files\\AutoHotkey\\AutoHotkey64.exe',
    'C:\\Program Files\\AutoHotkey\\AutoHotkey32.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'AutoHotkey', 'v2', 'AutoHotkey64.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'AutoHotkey', 'v2', 'AutoHotkey32.exe'),
  ];

  for (const ahkPath of possiblePaths) {
    if (fs.existsSync(ahkPath)) {
      return ahkPath;
    }
  }

  // Try to find via registry or where command
  try {
    const result = execSync('where AutoHotkey64.exe 2>nul || where AutoHotkey32.exe 2>nul || where AutoHotkey.exe 2>nul', { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && fs.existsSync(trimmed) && trimmed.toLowerCase().includes('v2')) {
        return trimmed;
      }
    }
  } catch (e) {
    // Command failed, continue
  }

  return null;
}

// Download file helper
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    const request = (url) => {
      https.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          request(response.headers.location);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve(dest);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

// Install AutoHotkey v2
async function installAHKv2() {
  return new Promise(async (resolve, reject) => {
    try {
      mainWindow?.webContents.send('ahk-status', 'downloading');
      
      // Download the installer
      await downloadFile(AHK_V2_URL, ahkInstallerPath);
      
      mainWindow?.webContents.send('ahk-status', 'installing');
      
      // Run silent install
      const installProcess = spawn(ahkInstallerPath, ['/silent'], {
        detached: true,
        stdio: 'ignore'
      });

      installProcess.on('close', (code) => {
        // Clean up installer
        try {
          fs.unlinkSync(ahkInstallerPath);
        } catch (e) {}

        if (code === 0) {
          setTimeout(() => {
            const ahkPath = findAHKv2();
            if (ahkPath) {
              resolve(ahkPath);
            } else {
              reject(new Error('AHK installed but not found'));
            }
          }, 2000);
        } else {
          reject(new Error(`Install failed with code ${code}`));
        }
      });

      installProcess.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

// Generate AHK v2 script
function generateAHKScript(keybinds) {
  let script = `#Requires AutoHotkey v2.0
#SingleInstance Force
#NoTrayIcon
Persistent

; Ethaniko Keybinder - Auto-generated script
; Do not edit manually - changes will be overwritten

; Store the script path for auto-reload
global ScriptPath := A_ScriptFullPath
global ConfigModTime := FileGetTime("${configFile.replace(/\\/g, '\\\\')}", "M")

; Check for config changes every 2 seconds
SetTimer(CheckConfigUpdate, 2000)

CheckConfigUpdate() {
    global ConfigModTime
    try {
        currentModTime := FileGetTime("${configFile.replace(/\\/g, '\\\\')}", "M")
        if (currentModTime != ConfigModTime) {
            Reload
        }
    }
}

; Send message to SA-MP
SendToSAMP(message, delay := 0) {
    if (delay > 0) {
        Sleep(delay)
    }
    
    ; Try to find SA-MP window
    sampWindow := WinExist("ahk_class Grand theft auto San Andreas")
    if (!sampWindow) {
        sampWindow := WinExist("GTA:SA:MP")
    }
    
    if (sampWindow) {
        ; Focus the window briefly
        WinActivate
        Sleep(50)
    }
    
    ; Send the message
    Send("{Enter}")
    Sleep(30)
    Send(message)
    Sleep(30)
    Send("{Enter}")
}

; Keybind definitions
`;

  keybinds.forEach((bind, index) => {
    const hotkey = bind.key;
    const message = bind.message.replace(/"/g, '""').replace(/`/g, '``');
    const delay = bind.delay || 0;

    script += `
; Keybind ${index + 1}: ${hotkey} -> ${bind.message.substring(0, 30)}...
${hotkey}:: {
    SendToSAMP("${message}", ${delay})
}
`;
  });

  script += `
; Exit hotkey (Ctrl+Shift+Alt+E)
^+!e:: {
    ExitApp
}
`;

  return script;
}

// Parse keybinds from config file
function parseKeybinds() {
  if (!fs.existsSync(configFile)) {
    return [];
  }

  try {
    const content = fs.readFileSync(configFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    return lines.map(line => {
      const parts = line.split('|');
      if (parts.length >= 2) {
        return {
          key: parts[0].trim(),
          message: parts[1].trim(),
          delay: parseInt(parts[2]) || 0
        };
      }
      return null;
    }).filter(Boolean);
  } catch (error) {
    console.error('Error parsing keybinds:', error);
    return [];
  }
}

// Save keybinds to config file
function saveKeybinds(keybinds) {
  const header = `# Ethaniko Keybinder Configuration
# Format: KEY|MESSAGE|DELAY
# Do not edit while the app is running
`;

  const content = header + keybinds.map(kb => 
    `${kb.key}|${kb.message}|${kb.delay || 0}`
  ).join('\n');

  fs.writeFileSync(configFile, content, 'utf8');
  
  // Generate and save AHK script
  const script = generateAHKScript(keybinds);
  fs.writeFileSync(keybindsFile, script, 'utf8');
}

// Start AHK script
async function startAHK() {
  // Kill existing process
  stopAHK();

  const ahkPath = findAHKv2();
  
  if (!ahkPath) {
    return { success: false, error: 'AHK not found' };
  }

  if (!fs.existsSync(keybindsFile)) {
    saveKeybinds([]);
  }

  try {
    ahkProcess = spawn(ahkPath, [keybindsFile], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });

    ahkProcess.unref();

    ahkProcess.on('error', (err) => {
      console.error('AHK process error:', err);
      mainWindow?.webContents.send('ahk-status', 'error');
    });

    ahkProcess.on('close', (code) => {
      if (!isQuitting) {
        mainWindow?.webContents.send('ahk-status', 'stopped');
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to start AHK:', error);
    return { success: false, error: error.message };
  }
}

// Stop AHK script
function stopAHK() {
  if (ahkProcess) {
    try {
      // Try to kill the process
      ahkProcess.kill();
    } catch (e) {}
    ahkProcess = null;
  }

  // Also kill any running AHK instances for our script
  try {
    exec(`taskkill /F /FI "WINDOWTITLE eq ${path.basename(keybindsFile)}" 2>nul`);
  } catch (e) {}
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a1a',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check AHK installation
    const ahkPath = findAHKv2();
    mainWindow.webContents.send('ahk-status', ahkPath ? 'ready' : 'not-installed');
    
    // Load existing keybinds
    const keybinds = parseKeybinds();
    mainWindow.webContents.send('keybinds-loaded', keybinds);
    
    // Auto-start AHK if keybinds exist
    if (ahkPath && keybinds.length > 0) {
      startAHK().then(result => {
        mainWindow.webContents.send('ahk-status', result.success ? 'running' : 'error');
      });
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Create tray
  createTray();
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon;
  
  try {
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
    } else {
      // Create a simple blue icon if no icon file exists
      trayIcon = nativeImage.createEmpty();
    }
  } catch (e) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Ethaniko Keybinder',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      }
    },
    {
      label: 'Hide',
      click: () => {
        mainWindow?.hide();
      }
    },
    { type: 'separator' },
    {
      label: 'Start Keybinds',
      click: async () => {
        const result = await startAHK();
        if (result.success) {
          mainWindow?.webContents.send('ahk-status', 'running');
        }
      }
    },
    {
      label: 'Stop Keybinds',
      click: () => {
        stopAHK();
        mainWindow?.webContents.send('ahk-status', 'stopped');
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        isQuitting = true;
        stopAHK();
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Ethaniko Keybinder');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// IPC Handlers
ipcMain.handle('get-keybinds', () => {
  return parseKeybinds();
});

ipcMain.handle('save-keybinds', (event, keybinds) => {
  saveKeybinds(keybinds);
  return { success: true };
});

ipcMain.handle('check-ahk', () => {
  const ahkPath = findAHKv2();
  return { installed: !!ahkPath, path: ahkPath };
});

ipcMain.handle('install-ahk', async () => {
  try {
    const ahkPath = await installAHKv2();
    return { success: true, path: ahkPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-ahk', async () => {
  const result = await startAHK();
  return result;
});

ipcMain.handle('stop-ahk', () => {
  stopAHK();
  return { success: true };
});

ipcMain.handle('restart-ahk', async () => {
  stopAHK();
  await new Promise(resolve => setTimeout(resolve, 500));
  return await startAHK();
});

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('close-window', () => {
  mainWindow?.hide();
});

ipcMain.handle('open-config-folder', () => {
  shell.openPath(userDataPath);
});

ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { available: result?.updateInfo?.version !== app.getVersion() };
  } catch (error) {
    return { available: false, error: error.message };
  }
});

// Auto-updater events
autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update-downloaded', info);
});

autoUpdater.on('error', (error) => {
  console.error('Auto-updater error:', error);
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  
  // Check for updates on startup (if published)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }
});

app.on('window-all-closed', () => {
  // Keep running in tray
});

app.on('before-quit', () => {
  isQuitting = true;
  stopAHK();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});