import path from 'node:path';
import fs from 'node:fs/promises';
import { input, confirm } from '@inquirer/prompts';
import { fileURLToPath } from 'node:url';
import type { PackageManager } from './types';
import { isExitPromptError, getInstallCommand, getRunCommand } from './utils';
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
  try {
    if (!projectName) {
      projectName = await input({
        message: 'What is your project name?',
        default: 'astro-electron-app',
      });
    }

    const templateType = language || (await getTemplateType());
    const targetPath = path.join(process.cwd(), projectName);

    await handleExistingDirectory(targetPath);
    await copyTemplate(targetPath);

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
  } catch (error) {
    if (isExitPromptError(error)) {
      console.log('\nOperation cancelled');
      return;
    }
    throw error;
  }
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

async function copyTemplate(targetPath: string) {
  try {
    await fs.cp(BASE_TEMPLATE_PATH, targetPath, { recursive: true });
  } catch (error) {
    console.error(
      'Error copying template:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
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

    // Copy base template files
    await copyTemplate(targetPath);

    // Copy electron files
    await copyElectronFiles(targetPath);

    // If JavaScript is selected, configure for JavaScript
    if (language === 'javascript') {
      const packageJsonPath = path.join(targetPath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      // Remove TypeScript dependencies
      delete packageJson.dependencies['@astrojs/check'];
      delete packageJson.dependencies['typescript'];

      // Remove TypeScript check from build script
      if (packageJson.scripts?.build) {
        packageJson.scripts.build = packageJson.scripts.build.replace(
          'astro check && ',
          ''
        );
      }

      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      await convertToJavaScript();

      // Update Astro config for JavaScript
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
  } catch (error) {
    console.error(
      'Error setting up project files:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

export const validateProjectName = (name: string): boolean => {
  if (!name) return false;

  // Project name must be lowercase
  if (name.toLowerCase() !== name) return false;

  // Check if name contains only valid characters
  // Valid: lowercase letters, numbers, hyphens, underscores
  if (!/^[a-z0-9-_]+$/.test(name)) return false;

  // Name can't start with . or _
  if (name.startsWith('.') || name.startsWith('_')) return false;

  // Name can't start with -
  if (name.startsWith('-')) return false;

  // Name must be at least 1 character long
  if (name.length < 1) return false;

  // Name can't be longer than 214 characters (npm limit)
  if (name.length > 214) return false;

  // Name can't be a single . or ..
  if (name === '.' || name === '..') return false;

  // Name can't be a Node.js core module
  const nodeBuiltins = ['node', 'console', 'process', 'buffer', 'events'];
  if (nodeBuiltins.includes(name)) return false;

  return true;
};
