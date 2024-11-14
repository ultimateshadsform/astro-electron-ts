import type { CreateOptions } from './types'
import process from 'node:process'
import { Command } from 'commander'
import { addElectronToProject } from './commands/add'
import { createNewProject } from './commands/create'

const appVersion = process.env.VERSION
const appName = process.env.APP_NAME
const appDescription = process.env.APP_DESCRIPTION

const program = new Command()
  .name(appName || 'astro-electron-ts')
  .description(appDescription || 'Create an Astro app with Electron')
  .version(appVersion || '0.0.0')

program
  .command('create')
  .description('Create a new Astro + Electron project')
  .argument('[name]', 'Project name', 'my-astro-electron-app')
  .option('-t, --typescript', 'Use TypeScript (default: true)', true)
  .option(
    '--install',
    'Install dependencies after creation (default: true)',
    true,
  )
  .action(async (name: string, options: CreateOptions) => createNewProject(name, options))

program
  .command('add')
  .description('Add Electron to an existing Astro project')
  .action(async () => addElectronToProject())

program.parse(process.argv)
