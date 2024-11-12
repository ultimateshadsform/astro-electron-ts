import { confirm } from '@inquirer/prompts';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

import { getPackageManager, getRunCommand, isExitPromptError } from './utils';
import type { PackageManager } from './types';

import {
  isAstroProject,
  isElectronProject,
  hasMainField,
  hasPackageJson,
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
  defaultPM?: PackageManager,
  language?: 'javascript' | 'typescript'
) {
  try {
    const defaultPackageManager = defaultPM ?? (await getPackageManager());
    const hasProject = await hasPackageJson();

    if (!hasProject) {
      return createNewProject(
        projectName || 'astro-electron-app',
        defaultPackageManager,
        language
      );
    }

    const projectStatus = {
      hasAstro: await isAstroProject(),
      hasElectron: await isElectronProject(),
      mainExists: await hasMainField(),
      electronFilesExist: await hasElectronFiles(),
    };

    if (
      projectStatus.hasAstro &&
      projectStatus.hasElectron &&
      projectStatus.mainExists &&
      projectStatus.electronFilesExist
    ) {
      console.log('✨ Astro + Electron project detected!');
      console.log("You're all set! Run your dev command to get started.");
      return;
    }

    if (!projectStatus.hasAstro) {
      return createNewProject(
        projectName || 'astro-electron-app',
        defaultPackageManager,
        language
      );
    }

    await addElectronToExisting();
  } catch (error) {
    if (isExitPromptError(error)) {
      return;
    }
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
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
      await convertToJavaScript();
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
