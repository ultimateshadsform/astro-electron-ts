# 🚀 astro-electron-ts

Build cross-platform desktop applications with Astro and Electron. This integration seamlessly incorporates Electron into your Astro projects, handling all the setup and configuration automatically so you can focus on building your app.

![preview](https://github.com/user-attachments/assets/91d3b3d4-76f1-43f7-b467-3cc93a324f31)

## ✨ Features

- 🔌 Effortless integration of Electron with Astro projects
- ⚡️ Automatic setup of the Electron environment during package installation
- ⚙️ Customizable Electron configuration with sensible defaults

## 🤔 Why astro-electron-ts?

- Actively maintained by the community and aim to support latest Electron versions and Astro.
- Supports both TypeScript and JavaScript out of the box.
- I aim to fix and close any issues as soon as possible.

## 📦 Installation

To install `astro-electron-ts`, run one of the following commands in your Astro project:

```bash
<package-manager> add astro-electron-ts electron
```

## 🛠️ Setup

Follow these steps to get your Electron app running:

### 1️⃣ Add integration

Add the `astro-electron-ts` integration to your `astro.config.ts`:

```typescript
import { defineConfig } from 'astro/config';
import electron from 'astro-electron-ts';

export default defineConfig({
  integrations: [electron()],
});
```

### 2️⃣ Define entry point

Add the entry point to your `package.json`:

```json
{
  "main": "dist-electron/main.js"
}
```

### 3️⃣ Update `.gitignore`

Add the Electron build directory to your `.gitignore`:

```
# Electron
dist-electron/
```

### 4️⃣ Create electron scripts

Create the `/electron` directory in your project folder and add these files:

```typescript
// /electron/main.ts
import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
```

```typescript
// /electron/preload.ts
console.log('preload.ts');
```

## ⚙️ Configuration

Customize your Electron setup with these configuration options:

```typescript
export default defineConfig({
  integrations: [
    electron({
      main: {
        entry: '/electron/main.ts', // Path to your Electron main file
        vite: {}, // Vite-specific configurations
      },
      preload: {
        input: '/electron/preload.ts', // Path to your Electron preload file
        vite: {}, // Vite-specific configurations
      },
      renderer: {
        // Renderer-specific configurations
      },
    }),
  ],
});
```

For more configuration options, check out the [vite-plugin-electron docs](https://github.com/electron-vite/vite-plugin-electron) 📚

## 🎨 Static Assets

To use static assets (fonts, videos, etc.) in your Electron app:

- Use the `/public` directory in your paths explicitly
- For images, use `Image` from `astro:assets`

## 🏗️ Building and Publishing

While this integration focuses on development setup, we recommend using [Electron Forge](https://www.electronforge.io/) for building and publishing your app.

## 📄 License

MIT License - do whatever you want with it! 🎉
