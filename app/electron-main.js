const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
const electron = require('electron');

if (!electron || typeof electron !== 'object' || !electron.app || !electron.ipcMain) {
  console.error('This entrypoint must be started with Electron, not Node.');
  console.error('Run `npm run desktop` or `npx electron .`');
  process.exit(1);
}

const { app, BrowserWindow, ipcMain, dialog } = electron;

const DEBUG_BOOT = process.env.CFB_DEBUG_ELECTRON === '1';
const WEB_PORT = Number(process.env.CFB_WEB_PORT || 4310);
const WEB_ORIGIN = `http://127.0.0.1:${WEB_PORT}`;
const IS_DEV = process.env.CFB_ELECTRON_DEV === '1';

let nextProcess = null;
let mainWindow = null;
let startupPromptShown = false;

function getRuntimeRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'runtime');
  }
  // Dev: app/ sits next to extractors at repo root
  return path.resolve(__dirname, '..');
}

function getDataDir() {
  const dir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getDebugLogPath() {
  try {
    return path.join(app.getPath('userData'), 'electron-startup.log');
  } catch {
    return path.join(__dirname, 'electron-startup.log');
  }
}

function logBoot(msg) {
  if (!DEBUG_BOOT) return;
  const line = `[${new Date().toISOString()}] ${msg}`;
  try {
    fs.appendFileSync(getDebugLogPath(), `${line}\n`, 'utf8');
  } catch {
    // ignore
  }
  console.log(line);
}

app.disableHardwareAcceleration();

if (process.platform === 'linux' && process.env.WSL_DISTRO_NAME) {
  app.commandLine.appendSwitch('ozone-platform-hint', 'x11');
}

function assertDisplayAvailable() {
  if (process.platform !== 'linux') return;
  const hasDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  if (hasDisplay) return;
  console.error('No Linux GUI display detected (DISPLAY/WAYLAND_DISPLAY are empty).');
  console.error('If you are in WSL, enable WSLg or run from Windows with a native Electron install.');
  process.exit(1);
}

function getDefaultSavesDir() {
  const docs = path.join(os.homedir(), 'Documents');
  const direct = path.join(docs, 'EA SPORTS College Football 27', 'saves');
  if (fs.existsSync(direct)) return direct;

  const user = process.env.USERNAME || process.env.USER;
  if (user) {
    const candidates = [
      `/mnt/c/Users/${user}/OneDrive/Documents/EA SPORTS College Football 27/saves`,
      `/mnt/c/Users/${user}/Documents/EA SPORTS College Football 27/saves`,
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return direct;
}

function looksLikeSaveName(name) {
  return /^DYNASTY/i.test(name);
}

function listDynastySaves(dirPath) {
  if (!dirPath || !fs.existsSync(dirPath)) return [];
  const out = [];
  for (const name of fs.readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, name);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    if (!looksLikeSaveName(name)) continue;
    out.push({ name, fullPath, mtimeMs: stat.mtimeMs, size: stat.size });
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}

function waitForServer(url, timeoutMs = 90000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });
      req.on('error', retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(tick, 400);
    };

    tick();
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const runtimeRoot = getRuntimeRoot();
    const webDir = path.join(runtimeRoot, 'web');
    const dataDir = getDataDir();
    const nextBin = path.join(webDir, 'node_modules', 'next', 'dist', 'bin', 'next');

    const env = {
      ...process.env,
      PORT: String(WEB_PORT),
      CFB_REPO_ROOT: runtimeRoot,
      CFB_DATA_DIR: dataDir,
    };

    let command;
    let args;

    if (IS_DEV && !app.isPackaged) {
      // Local development: use npm so turbopack/dev works.
      command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      args = ['run', 'dev', '--', '-p', String(WEB_PORT), '-H', '127.0.0.1'];
    } else {
      // Packaged / production desktop: run Next with Electron's Node mode.
      if (!fs.existsSync(nextBin)) {
        reject(new Error(`Next binary missing at ${nextBin}. Rebuild the web app before packaging.`));
        return;
      }
      command = process.execPath;
      args = [nextBin, 'start', '-p', String(WEB_PORT), '-H', '127.0.0.1'];
      env.ELECTRON_RUN_AS_NODE = '1';
    }

    logBoot(`startNextServer:${command} ${args.join(' ')}`);
    nextProcess = spawn(command, args, {
      cwd: webDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    nextProcess.stdout.on('data', (buf) => {
      if (DEBUG_BOOT) process.stdout.write(String(buf));
    });
    nextProcess.stderr.on('data', (buf) => {
      if (DEBUG_BOOT) process.stderr.write(String(buf));
    });
    nextProcess.on('exit', (code) => {
      logBoot(`nextProcess:exit:${code}`);
      nextProcess = null;
    });
    nextProcess.on('error', reject);

    waitForServer(WEB_ORIGIN).then(resolve).catch(reject);
  });
}

async function promptForDynastySave(win) {
  const defaultDir = getDefaultSavesDir();
  const res = await dialog.showOpenDialog(win || undefined, {
    title: 'Select a CFB Dynasty save to extract',
    defaultPath: fs.existsSync(defaultDir) ? defaultDir : os.homedir(),
    properties: ['openFile'],
    message: 'Choose a DYNASTY save file to load into CFB Offline.',
  });

  if (res.canceled || !res.filePaths.length) {
    return null;
  }

  return res.filePaths[0];
}

function createWindow() {
  logBoot('createWindow:start');
  const preloadPath = path.join(__dirname, 'preload.js');

  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 980,
    minHeight: 700,
    show: false,
    title: 'CFB Offline',
    backgroundColor: '#0a0e16',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow = win;

  win.once('ready-to-show', () => {
    logBoot('window:ready-to-show');
    win.show();
    win.focus();
  });

  win.on('closed', () => {
    logBoot('window:closed');
    mainWindow = null;
  });

  win.loadURL(WEB_ORIGIN).then(
    () => logBoot(`window:loadURL:ok:${WEB_ORIGIN}`),
    (err) => {
      logBoot(`window:loadURL:error:${err && err.message ? err.message : String(err)}`);
      console.error('Failed to load CFB Offline UI:', err && err.message ? err.message : err);
    }
  );

  return win;
}

ipcMain.handle('app:isDesktop', async () => true);

ipcMain.handle('saves:getDefaultDir', async () => getDefaultSavesDir());

ipcMain.handle('saves:listDynasty', async (_evt, dirPath) => {
  const dir = dirPath && String(dirPath).trim() ? String(dirPath).trim() : getDefaultSavesDir();
  return { dir, saves: listDynastySaves(dir) };
});

ipcMain.handle('saves:pickDir', async () => {
  const res = await dialog.showOpenDialog(mainWindow || undefined, {
    title: 'Select CFB saves folder',
    properties: ['openDirectory'],
    defaultPath: getDefaultSavesDir(),
  });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

ipcMain.handle('saves:pickFile', async () => {
  return promptForDynastySave(mainWindow);
});

ipcMain.handle('saves:promptStartup', async () => {
  if (startupPromptShown) {
    return { alreadyShown: true, savePath: null };
  }
  startupPromptShown = true;
  const savePath = await promptForDynastySave(mainWindow);
  return { alreadyShown: false, savePath };
});

app.whenReady().then(async () => {
  logBoot('app:whenReady');
  assertDisplayAvailable();

  try {
    const runtimeRoot = getRuntimeRoot();
    const nextBuild = path.join(runtimeRoot, 'web', '.next');
    if (!IS_DEV && !fs.existsSync(nextBuild)) {
      dialog.showErrorBox(
        'CFB Offline',
        'Web build missing. Run `npm run web:build` once, then launch/package again.'
      );
      app.quit();
      return;
    }

    await startNextServer();
    createWindow();
  } catch (err) {
    console.error(err);
    dialog.showErrorBox(
      'CFB Offline failed to start',
      err && err.message ? err.message : String(err)
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  logBoot('app:window-all-closed');
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill('SIGTERM');
  }
});

app.on('will-quit', () => {
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill('SIGKILL');
  }
});
