// eslint.config.js
import antfu from '@antfu/eslint-config'

export default antfu({
// Type of the project. 'lib' for libraries, the default is 'app'
  type: 'lib',

  // Or customize the stylistic rules
  stylistic: {
    indent: 2, // 4, or 'tab'
    quotes: 'single', // or 'double'
  },

  // TypeScript and Vue are autodetected, you can also explicitly enable them:
  typescript: true,

  // Disable jsonc and yaml support
  jsonc: false,
  yaml: false,

  // `.eslintignore` is no longer supported in Flat config, use `ignores` instead
  ignores: [
    '**/fixtures',
    '**/dist',
    '**/dist-electron',
    '**/node_modules',
    '**/build',
    '**/coverage',
    '**/out',
    '**/.turbo',
    '**/.next',
    '**/.nuxt',
    '**/.cache',
    '**/.idea',
    '**/.vscode',
    '**/logs',
    '**/*.log',
    '**/tmp',
    '**/temp',
    '**/yarn.lock',
    '**/package-lock.json',
    '**/pnpm-lock.yaml',
    '**/*.md',
  ],
})