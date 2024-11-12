import path from 'node:path';
import fs from 'node:fs/promises';
import { confirm } from '@inquirer/prompts';
import { fileURLToPath } from 'node:url';
import type { PackageManager } from './types';
import { getInstallCommand, getRunCommand } from './utils';
import { getTemplateType } from './template-operations';
import { convertToJavaScript, copyElectronFiles } from './electron-operations';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'templates');
export const BASE_TEMPLATE_PATH = path.join(TEMPLATE_PATH, 'base');
export const ELECTRON_TEMPLATE_PATH = path.join(
  TEMPLATE_PATH,
  'base',
  'electron'
);

export const createNewProject = async (
  projectName: string,
  packageManager: PackageManager,
  language?: 'javascript' | 'typescript'
): Promise<void> => {
  if (!validateProjectName(projectName)) {
    throw new Error(`Invalid project name: ${projectName}`);
  }

  const templateType = language || (await getTemplateType());
  const targetPath = path.join(process.cwd(), projectName);

  await handleExistingDirectory(targetPath);

  await fs.cp(BASE_TEMPLATE_PATH, targetPath, { recursive: true });

  if (templateType === 'javascript') {
    await configureJavaScript(targetPath);
  }

  const installCommand = getInstallCommand(packageManager);
  const devCommand = getRunCommand(packageManager, 'dev');

  console.log(`
✨ Project created successfully!

Next steps:
1. cd ${projectName}
2. ${installCommand}
3. ${devCommand}
    `);
};

async function handleExistingDirectory(targetPath: string) {
  try {
    await fs.access(targetPath);
    const overwrite = await confirm({
      message: 'Directory already exists. Overwrite?',
      default: false,
    });

    if (!overwrite) {
      console.log('Operation cancelled');
      process.exit(0);
    }
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code !== 'ENOENT'
    ) {
      throw error;
    }
  }
}

async function configureJavaScript(targetPath: string) {
  const packageJsonPath = path.join(targetPath, 'package.json');
  const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent);

  delete packageJson.dependencies['@astrojs/check'];
  delete packageJson.dependencies['typescript'];

  if (packageJson.scripts?.build) {
    packageJson.scripts.build = packageJson.scripts.build.replace(
      'astro check && ',
      ''
    );
  }

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  await convertToJavaScript();

  const astroConfigPath = path.join(targetPath, 'astro.config.mjs');
  const astroConfigContent = `
    import { defineConfig } from 'astro/config';
    import electron from 'astro-electron-ts';

    export default defineConfig({
      integrations: [
        electron({
          main: {
            entry: 'electron/main.js',
          },
          preload: {
            input: 'electron/preload.js',
          }
        })
      ]
    });
  `;
  await fs.writeFile(astroConfigPath, astroConfigContent, 'utf-8');
}

export const setupProjectFiles = async (
  projectName: string,
  language: 'javascript' | 'typescript'
): Promise<void> => {
  try {
    const targetPath = path.join(process.cwd(), projectName);
    const packageJsonPath = path.join(targetPath, 'package.json');

    // Read and parse package.json
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    // Initialize dependencies if they don't exist
    packageJson.dependencies = packageJson.dependencies || {};

    if (language === 'javascript') {
      // Remove TypeScript dependencies
      delete packageJson.dependencies['@astrojs/check'];
      delete packageJson.dependencies['typescript'];

      if (packageJson.scripts?.build) {
        packageJson.scripts.build = packageJson.scripts.build.replace(
          'astro check && ',
          ''
        );
      }
    }

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    await copyElectronFiles(targetPath);
  } catch (error) {
    console.error('Error setting up project files:', error);
    throw error;
  }
};

export const validateProjectName = (name: string): boolean => {
  if (!name) return false;

  // Allow scoped packages
  if (name.startsWith('@')) {
    const parts = name.split('/');
    if (parts.length !== 2) return false;
    name = parts[1]; // Validate the package name part
  }

  // Project name must be lowercase
  if (name.toLowerCase() !== name) return false;

  // Check if name contains only valid characters
  if (!/^[a-z0-9-_]+$/.test(name)) return false;

  // Name can't start with . or _
  if (name.startsWith('.') || name.startsWith('_')) return false;

  // Name can't start with -
  if (name.startsWith('-')) return false;

  // Name must be at least 1 character long
  if (name.length < 1) return false;

  // Name can't be longer than 214 characters (npm limit)
  if (name.length > 214) return false;

  return true;
};
