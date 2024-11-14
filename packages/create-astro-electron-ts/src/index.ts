import { Command } from 'commander';
import { createNewProject } from './commands/create';
import { addElectronToProject } from './commands/add';

const appVersion = process.env.VERSION;
const appName = process.env.APP_NAME;
const appDescription = process.env.APP_DESCRIPTION;

const program = new Command()
  .name(appName || 'astro-electron-ts')
  .description(appDescription || 'Create an Astro app with Electron')
  .version(appVersion || '0.0.0');

program
  .command('create')
  .description('Create a new Astro + Electron project')
  .argument('[name]', 'Project name', 'my-astro-electron-app')
  .option('-t, --typescript', 'Use TypeScript (default: true)', true)
  .option(
    '--install',
    'Install dependencies after creation (default: true)',
    true
  )
  .action(async (name, options) => createNewProject(name, options));

program
  .command('add')
  .description('Add Electron to an existing Astro project')
  .action(async () => addElectronToProject());

program.parse(process.argv);
