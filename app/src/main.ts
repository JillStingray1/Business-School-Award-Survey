import { BrowserWindow } from 'electron'

export default class Main {
    static main_window: Electron.BrowserWindow | null;
    static application: Electron.App;
    static BrowserWindow: typeof BrowserWindow;

    private static on_window_all_closed() {
        if (process.platform !== 'darwin') {
            Main.application.quit();
        }
    }

    private static on_close() {
        Main.main_window = null;
    }

    private static onReady() {
        Main.main_window = new Main.BrowserWindow({ width: 800, height: 600 });
        if (Main.main_window == null) {
            return null;
        }
        Main.main_window
            .loadURL('file://' + __dirname + '/index.html');
        Main.main_window.on('closed', Main.on_close);
    }

    static main(app: Electron.App, browser_window: typeof BrowserWindow) {
        // we pass the Electron.App object and the  
        // Electron.BrowserWindow into this function 
        // so this class has no dependencies. This 
        // makes the code easier to write tests for 
        Main.BrowserWindow = browser_window;
        Main.application = app;
        Main.application.on('window-all-closed', Main.on_window_all_closed);
        Main.application.on('ready', Main.onReady);
    }
}