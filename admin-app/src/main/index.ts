import { app, BrowserWindow, session } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { db } from './db';
import { apiClient } from './api';
import { registerIpcHandlers } from './ipc/handlers';

class App {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    if (started) {
      app.quit();
      return;
    }

    app.on('ready', () => this.onReady());
    app.on('window-all-closed', () => this.onWindowAllClosed());
    app.on('activate', () => this.onActivate());
  }

  private async onReady(): Promise<void> {
    this.setupCSP();

    // Initialise shared services before opening any window
    await db.connect();
    apiClient.configure({
      // TODO: set baseUrl when a remote API is available
      baseUrl: '',
    });

    registerIpcHandlers();
    this.createWindow();
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.mainWindow.removeMenu();

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      this.mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      );
    }

    if (!app.isPackaged) {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private onWindowAllClosed(): void {
    db.disconnect();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  private onActivate(): void {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createWindow();
    }
  }

  private setupCSP(): void {
    session.defaultSession.webRequest.onHeadersReceived(
      (
        details: Electron.OnHeadersReceivedListenerDetails,
        callback: (response: Electron.HeadersReceivedResponse) => void,
      ) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:",
            ],
          },
        });
      },
    );
  }
}

new App();
