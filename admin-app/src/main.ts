import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';



class App {
    private mainWindow: BrowserWindow | null = null;

    constructor() {
        // handles app updates through squirrel
        if (started) {
            app.quit();
        }

        app.on('ready', () => this.createWindow());
        app.on('window-all-closed', () => this.onWindowAllClosed());
        app.on('activate', () => this.onActivate());
        if (app.isReady()) {
            this.setupCSP();
        }
    }

    private createWindow(): void {
        // create the main window
        this.mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
            },
        });
        // disables the default windows navbar
        this.mainWindow.removeMenu();
        // render the  index
        if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
            this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        } else {
            this.mainWindow.loadFile(
                path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
            );
        }
        // opens the dev tools, remove this in the final version
        this.mainWindow.webContents.openDevTools();
    }

    // closes the program when all windows are closed
    private onWindowAllClosed(): void {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    }

    // opens the main window when its reclicked in the tray
    // done for OS X compatability
    private onActivate(): void {
        if (BrowserWindow.getAllWindows().length === 0) {
            this.createWindow();
        }
    }

    private setupCSP(): void {
        const { session } = require('electron');
        session.defaultSession.webRequest.onHeadersReceived(
            (details: Electron.OnHeadersReceivedListenerDetails, callback: (response: Electron.HeadersReceivedResponse) => void) => {
                callback({
                    responseHeaders: {
                        ...details.responseHeaders,
                        'Content-Security-Policy': ['default-src \'self\'']
                    }
                })
            })

    }
}

new App();