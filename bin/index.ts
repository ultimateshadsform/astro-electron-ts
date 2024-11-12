#!/usr/bin/env node
import { Command } from 'commander';
import { main, addElectronToExisting } from './cli';
import { getPackageManager } from './utils';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      VERSION: string;
    }
  }
}

const program = new Command();

program
  .name('create-astro-electron')
  .description('CLI to create or configure Astro + Electron projects')
  .version(process.env.VERSION || '0.0.0');

program
  .command('create')
  .description('Create a new Astro + Electron project')
  .argument('[name]', 'Project name')
  .option('-js', '--javascript', 'Use JavaScript instead of TypeScript')
  .option('-ts', '--typescript', 'Use TypeScript (default)')
  .action(async (name?: string, options?: { js?: boolean; ts?: boolean }) => {
    const packageManager = await getPackageManager();
    const language = options?.js ? 'javascript' : 'typescript';
    await main(name, packageManager, language);
  });

program
  .command('add')
  .description('Add Electron to an existing Astro project')
  .action(async () => {
    await addElectronToExisting();
  });

// Default behavior when no command is specified
if (process.argv.length === 2) {
  main().catch((error) => {
    console.error('Failed to run CLI:', error);
    process.exit(1);
  });
} else {
  program.parse();
}
