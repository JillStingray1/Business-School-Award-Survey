import { contextBridge, ContextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld('electronAPI', {
    sendFile: (excel_file: string) => ipcRenderer.send('send-file', excel_file)
})