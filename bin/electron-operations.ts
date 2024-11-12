import path from 'node:path';
import { readFile, writeFile, rename, access, cp } from 'node:fs/promises';
import { confirm } from '@inquirer/prompts';
import { isJavaScriptProject } from './project-checks';
import { ELECTRON_TEMPLATE_PATH } from './project-operations';
import { execa } from 'execa';

export const installElectronDependencies = async (
  packageManager: string
): Promise<void> => {
  const regularDependencies = ['electron', 'astro-electron-ts'];
  const devDependencies = ['electron-builder'];

  const devFlag = packageManager === 'npm' ? '--save-dev' : '-D';
  const installCmd = packageManager === 'npm' ? 'install' : 'add';

  try {
    // Install regular dependencies
    await execa(packageManager, [installCmd, ...regularDependencies], {
      stdio: 'inherit',
    });

    // Install dev dependencies
    await execa(packageManager, [installCmd, devFlag, ...devDependencies], {
      stdio: 'inherit',
    });

    console.log('✨ Installed Electron dependencies');
  } catch (error) {
    console.error(
      'Error installing Electron dependencies:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

export const addElectronIntegration = async (): Promise<void> => {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    const isJS = await isJavaScriptProject();
    const mainFile = isJS ? 'electron/main.js' : 'electron/main.ts';

    // Add Electron-specific scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      'electron-dev': `electron ${mainFile}`,
      'electron-build': 'electron-builder',
      'app:build': 'npm run build && electron-builder',
    };

    // Add electron-builder configuration
    packageJson.build = {
      appId: 'com.electron.app',
      productName: packageJson.name || 'Electron App',
      directories: {
        output: 'dist_electron',
      },
      files: ['dist/**/*', 'electron/**/*'],
      mac: {
        category: 'public.app-category.utilities',
      },
      win: {
        target: 'nsis',
      },
      linux: {
        target: 'AppImage',
      },
    };

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✨ Added Electron scripts and configuration to package.json');
  } catch (error) {
    console.error(
      'Error adding Electron integration:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

export async function convertToJavaScript() {
  const electronDir = path.join(process.cwd(), 'electron');
  await rename(
    path.join(electronDir, 'main.ts'),
    path.join(electronDir, 'main.js')
  );
  await rename(
    path.join(electronDir, 'preload.ts'),
    path.join(electronDir, 'preload.js')
  );

  const mainJsPath = path.join(electronDir, 'main.js');
  let mainJsContent = await readFile(mainJsPath, 'utf-8');
  mainJsContent = mainJsContent.replace(
    /let win: BrowserWindow \| null;/,
    'let win;'
  );
  await writeFile(mainJsPath, mainJsContent, 'utf-8');
}

export async function copyElectronFiles(targetPath: string) {
  try {
    const targetElectronDir = path.join(targetPath, 'electron');

    try {
      await access(targetElectronDir);
      const overwrite = await confirm({
        message: 'Electron directory already exists. Overwrite?',
        default: false,
      });

      if (!overwrite) {
        console.log('Skipping electron files copy');
        return;
      }
    } catch {
      // Directory doesn't exist, proceed with copy
    }

    await cp(ELECTRON_TEMPLATE_PATH, targetElectronDir, { recursive: true });
    console.log('✨ Added Electron files to your project');
  } catch (error) {
    console.error(
      'Error copying electron files:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

export async function hasElectronFiles(): Promise<boolean> {
  try {
    const isJS = await isJavaScriptProject();
    const electronDir = path.join(process.cwd(), 'electron');
    const mainFile = path.join(electronDir, isJS ? 'main.js' : 'main.ts');
    const preloadFile = path.join(
      electronDir,
      isJS ? 'preload.js' : 'preload.ts'
    );

    await Promise.all([
      access(electronDir),
      access(mainFile),
      access(preloadFile),
    ]);

    return true;
  } catch {
    return false;
  }
}
