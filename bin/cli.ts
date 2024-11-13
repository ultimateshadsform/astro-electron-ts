import { confirm, input, select } from '@inquirer/prompts';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

import {
  getPackageManager,
  getRunCommand,
  isExitPromptError,
  isTest,
} from './utils';
import type { PackageManager } from './types';

import {
  isAstroProject,
  isElectronProject,
  hasMainField,
  isJavaScriptProject,
} from './project-checks';

import {
  addElectronIntegration,
  copyElectronFiles,
  hasElectronFiles,
  convertToJavaScript,
  installElectronDependencies,
} from './electron-operations';

import { createNewProject } from './project-operations';

export async function main(
  projectName?: string,
  packageManager?: PackageManager,
  language?: 'javascript' | 'typescript'
): Promise<void> {
  try {
    const isAstro = await isAstroProject();
    const isElectron = await isElectronProject();

    if (isAstro && isElectron) {
      console.log('✨ Astro + Electron project detected!');
      return;
    }

    if (isAstro) {
      console.log('✨ Astro project detected!');
      const shouldAddElectron = await confirm({
        message: 'Would you like to add Electron to your project?',
        default: true,
      });

      if (shouldAddElectron) {
        await addElectronToExisting();
      }
      return;
    }

    const detectedPackageManager = await getPackageManager();
    const finalPackageManager = packageManager || detectedPackageManager;

    const finalProjectName =
      projectName ||
      (await input({
        message: 'What is your project name?',
        default: 'astro-electron-app',
      }));

    if (finalPackageManager === 'npm') {
      const selectedPM = await select<PackageManager>({
        message: 'Which package manager would you like to use?',
        choices: [
          { value: 'npm' as const, name: 'npm' },
          { value: 'pnpm' as const, name: 'pnpm (recommended)' },
          { value: 'yarn' as const, name: 'yarn' },
          { value: 'bun' as const, name: 'bun' },
        ],
      });
      await createNewProject(finalProjectName, selectedPM, language);
    } else {
      await createNewProject(finalProjectName, finalPackageManager, language);
    }
  } catch (error) {
    if (isExitPromptError(error)) {
      console.log('\nOperation cancelled');
      return;
    }
    if (error instanceof Error && error.message === 'USER_CANCELLED') {
      console.log('Operation cancelled');
      return;
    }
    console.error(
      'Failed to run CLI:',
      error instanceof Error ? error.message : String(error)
    );

    if (!isTest()) {
      process.exit(1);
    }
    throw error;
  }
}

export async function addElectronToExisting() {
  const projectStatus = {
    hasElectron: await isElectronProject(),
    mainExists: await hasMainField(),
    electronFilesExist: await hasElectronFiles(),
  };

  if (!projectStatus.hasElectron) {
    console.log('ℹ️  Electron not detected in package.json');
  }
  if (!projectStatus.mainExists) {
    console.log('ℹ️  Main field missing in package.json');
  }
  if (!projectStatus.electronFilesExist) {
    const isJS = await isJavaScriptProject();
    const mainPath = `electron/main${isJS ? '.js' : '.ts'}`;
    const preloadPath = `electron/preload${isJS ? '.js' : '.ts'}`;
    console.log(
      `ℹ️  Required Electron files missing (${mainPath} and/or ${preloadPath})`
    );
  }

  const shouldAddElectron = await confirm({
    message: `Would you like to ${
      !projectStatus.hasElectron ? 'add Electron' : 'configure Electron'
    } for this project?`,
    default: true,
  });

  if (!shouldAddElectron) {
    console.log('Operation cancelled');
    return;
  }

  const currentDir = process.cwd();
  const isJS = await isJavaScriptProject();

  if (!projectStatus.electronFilesExist) {
    await copyElectronFiles(currentDir);
    if (isJS) {
      await convertToJavaScript(currentDir);
    }
  }

  await addElectronIntegration();

  if (!projectStatus.mainExists) {
    await addMainField();
  }

  if (!projectStatus.hasElectron) {
    const packageManager = await getPackageManager();
    await installElectronDependencies(packageManager);
  }

  const packageManager = await getPackageManager();
  const devCommand = getRunCommand(packageManager, 'dev');
  console.log(`
✨ ${
    !projectStatus.hasElectron
      ? 'Electron and dependencies have been added'
      : projectStatus.electronFilesExist
      ? 'Main field has been configured'
      : 'Electron has been configured'
  } for your project!

Next steps:
  1. Add electron scripts to your package.json
  2. ${devCommand}
  `);
}

async function addMainField() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  try {
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    packageJson.main = 'dist-electron/main.js';
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✨ Added main field to package.json');
  } catch (error) {
    console.error('Error updating package.json:', error);
    throw error;
  }
}

export { addElectronIntegration };
