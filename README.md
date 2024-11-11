# 🚀 astro-electron-ts

Astro-Electron is an integration designed to seamlessly incorporate Electron into Astro projects. It simplifies the process of setting up Electron, providing a streamlined development experience for building cross-platform desktop applications with Astro and Electron.

## ✨ Features

- 🔌 Effortless integration of Electron with Astro projects
- ⚡️ Automatic setup of the Electron environment during package installation
- ⚙️ Customizable Electron configuration with sensible defaults

## 📦 Installation

To install `astro-electron`, run one of the following commands in your Astro project:

```bash
<package-manager> add astro-electron-ts electron
```

## 🛠️ Setup

Follow these steps to get your Electron app running:

### 1️⃣ Add integration

Add the `astro-electron-ts` integration to your `astro.config.js`:

```javascript
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

Create the `src/electron` directory and add these files:

```typescript
// src/electron/main.ts
import * as url from 'url';
import { app, BrowserWindow } from 'electron';

app.whenReady().then(() => {
  const win = new BrowserWindow({
    title: 'Main window',
    webPreferences: {
      preload: url.fileURLToPath(new URL('preload.mjs', import.meta.url)),
    },
  });

  // You can use `process.env.VITE_DEV_SERVER_URL` when the vite command is called `serve`
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    // Load your file
    win.loadFile('dist/index.html');
  }
});
```

```typescript
// src/electron/preload.ts
console.log('preload.ts');
```

## ⚙️ Configuration

Customize your Electron setup with these configuration options:

```javascript
export default defineConfig({
  integrations: [
    electron({
      main: {
        entry: 'src/electron/main.ts', // Path to your Electron main file
        vite: {}, // Vite-specific configurations
      },
      preload: {
        input: 'src/electron/preload.ts', // Path to your Electron preload file
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
