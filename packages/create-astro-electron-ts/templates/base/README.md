# Astro + Electron Starter Kit

```sh
npm create astro@latest -- --template basics
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/basics/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![astro-electron-ts](https://github.com/user-attachments/assets/91d3b3d4-76f1-43f7-b467-3cc93a324f31)

## 🚀 Project Structure

Inside of your Astro + Electron project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── electron/
│   ├── main.(js|ts)        # Electron main process
│   └── preload.(js|ts)     # Preload script for IPC
├── src/
│   ├── components/
│   │   └── Card.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `electron/` directory contains all Electron-specific code:

- `main.(js|ts)` handles the main process, window creation, and app lifecycle
- `preload.(js|ts)` provides secure IPC communication between main and renderer processes

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server and electron app         |
| `npm run build`           | Build your production site and electron app      |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run electron:dev`    | Run electron in development mode                 |
| `npm run electron:build`  | Build electron app for production                |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## ⚡ Electron Features

This template comes with:

- Secure IPC communication setup
- Hot-reload support in development
- Production build configuration
- Basic window management
- Cross-platform support

## 👀 Want to learn more?

Feel free to check [Astro documentation](https://docs.astro.build) or [Electron documentation](https://www.electronjs.org/docs/latest/), or jump into our [Discord server](https://astro.build/chat).
