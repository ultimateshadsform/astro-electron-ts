# 🚀 Monorepo Overview

This repository is a monorepo containing multiple packages related to Astro and Electron development.

## 📖 Usage

For detailed usage instructions, please refer to the [README.md](packages/astro-electron-ts/README.md) in the `packages/astro-electron-ts` package.

## 📂 Project Structure

```
.
├── packages/
│   ├── astro-electron-ts/           # Core integration package
│   │   ├── src/                     # Source code
│   │   ├── dist/                    # Compiled output
│   │   └── README.md                # Package documentation
│   │
│   └── create-astro-electron-ts/    # CLI package
│       ├── src/
│       │   ├── commands/            # CLI commands
│       │   │   ├── add.ts           # Add Electron to existing project
│       │   │   └── create.ts        # Create new project
│       │   ├── types.ts             # Type definitions
│       │   └── index.ts             # Entry point
│       ├── templates/               # Project templates
│       │   └── base/                # Base template
│       │       ├── package.json
│       │       └── .gitignore
│       └── package.json
│
├── .vscode/                         # VS Code configuration
│   └── settings.json
│
├── package.json                     # Root package.json
├── bun.lockb                        # Bun lock file
├── eslint.config.mjs                # ESLint configuration
├── CONTRIBUTING.md                  # Contributing guidelines
└── README.md                        # Root documentation
```

## 📦 Packages

- **create-astro-electron-ts**: The CLI for creating Astro and Electron projects and adding Electron to existing Astro projects.
- **astro-electron-ts**: The core package for Astro Electron integration.

## 🧰 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 🛠️ Development

> [!NOTE]
> This project uses [Bun](https://bun.sh/) to manage dependencies.

1. Use [Bun](https://bun.sh/) to install the dependencies:

```bash
bun install
```
