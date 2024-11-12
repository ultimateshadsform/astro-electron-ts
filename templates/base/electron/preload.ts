// /electron/preload.ts
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getCurrentTime: () => new Date().toLocaleTimeString(),
});

console.log('preload.ts');
