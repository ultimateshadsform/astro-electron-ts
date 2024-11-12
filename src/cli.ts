import { input, select, confirm } from '@inquirer/prompts';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { readFile, writeFile } from 'fs/promises';
import { detect } from 'detect-package-manager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

async function detectPackageManager(): Promise<PackageManager> {
  try {
    const pm = await detect();
    return pm as PackageManager;
  } catch (error) {
    console.warn(
      'Failed to detect package manager:',
      error instanceof Error ? error.message : String(error),
      '\nDefaulting to npm'
    );
    return 'npm';
  }
}

async function copyTemplate(templatePath: string, targetPath: string) {
  try {
    await fs.cp(templatePath, targetPath, { recursive: true });
  } catch (error) {
    console.error(
      'Error copying template:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

function getInstallCommand(
  packageManager: PackageManager,
  packageName?: string
): string {
  switch (packageManager) {
    case 'yarn':
      return packageName ? `yarn add ${packageName}` : 'yarn';
    case 'pnpm':
      return packageName ? `pnpm add ${packageName}` : 'pnpm install';
    case 'bun':
      return packageName ? `bun add ${packageName}` : 'bun install';
    default:
      return packageName ? `npm install ${packageName}` : 'npm install';
  }
}

function getRunCommand(packageManager: PackageManager, script: string): string {
  switch (packageManager) {
    case 'yarn':
      return `yarn ${script}`;
    case 'pnpm':
      return `pnpm run ${script}`;
    case 'bun':
      return `bun run ${script}`;
    default:
      return `npm run ${script}`;
  }
}

async function isAstroProject(): Promise<boolean> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    return !!(
      packageJson.dependencies?.astro || packageJson.devDependencies?.astro
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid package.json format');
    }
    if (error instanceof Error && 'code' in error) {
      throw error;
    }
    throw new Error('Failed to check for Astro');
  }
}

async function isElectronProject(): Promise<boolean> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    return !!(
      packageJson.dependencies?.electron ||
      packageJson.devDependencies?.electron
    );
  } catch {
    return false;
  }
}

async function hasMainField(): Promise<boolean> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    return !!packageJson.main;
  } catch {
    return false;
  }
}

async function hasElectronFiles(): Promise<boolean> {
  try {
    const electronDir = path.join(process.cwd(), 'electron');
    const mainFile = path.join(electronDir, 'main.ts');
    const preloadFile = path.join(electronDir, 'preload.ts');

    // Check if all required files exist
    await Promise.all([
      fs.access(electronDir),
      fs.access(mainFile),
      fs.access(preloadFile),
    ]);

    return true;
  } catch {
    return false;
  }
}

async function getPackageManager(
  defaultPackageManager: PackageManager
): Promise<PackageManager> {
  if (defaultPackageManager !== 'npm') {
    // If we successfully detected a package manager other than npm, use it
    return defaultPackageManager;
  }

  // Only ask if we defaulted to npm due to detection failure
  return (await select({
    message: 'Which package manager would you like to use?',
    choices: [
      { value: 'npm', name: 'npm', description: 'Node Package Manager' },
      { value: 'yarn', name: 'yarn', description: 'Yarn' },
      { value: 'pnpm', name: 'pnpm', description: 'pnpm' },
      { value: 'bun', name: 'bun', description: 'Bun' },
    ],
    default: defaultPackageManager,
  })) as PackageManager;
}

export async function main() {
  try {
    const defaultPackageManager = await detectPackageManager();

    // Show menu first
    const choices = [
      { value: 'create', name: 'Create new Astro + Electron project' },
      { value: 'add', name: 'Add Electron to existing Astro project' },
    ];

    const action = await select({
      message: 'What would you like to do?',
      choices,
    });

    const packageManager = await getPackageManager(defaultPackageManager);

    if (action === 'create') {
      // Create new project logic
      const projectName = await input({
        message: 'What is your project name?',
        default: 'astro-electron-app',
      });

      const targetPath = path.join(process.cwd(), projectName);

      // Check if directory exists
      try {
        await fs.access(targetPath);
        const overwrite = await confirm({
          message: 'Directory already exists. Overwrite?',
          default: false,
        });

        if (!overwrite) {
          console.log('Operation cancelled');
          return;
        }
      } catch (error: unknown) {
        // Directory doesn't exist, which is what we want
        if (
          error instanceof Error &&
          'code' in error &&
          (error as NodeJS.ErrnoException).code !== 'ENOENT'
        ) {
          console.error('Error checking directory:', error.message);
          throw error;
        }
      }

      // Copy template
      const templatePath = path.join(__dirname, '..', '..', 'template');
      await copyTemplate(templatePath, targetPath);

      const installCommand = getInstallCommand(packageManager);
      const devCommand = getRunCommand(packageManager, 'dev');

      console.log(`
✨ Project created successfully!
  
Next steps:
  1. cd ${projectName}
  2. ${installCommand}
  3. ${devCommand}
      `);
      return;
    }

    // Add to existing project logic
    const hasAstro = await isAstroProject();

    if (!hasAstro) {
      console.log(
        '❌ Astro not detected in this project. Please create an Astro project first.'
      );
      console.log('Tip: You can create a new Astro project with:');
      console.log('  npm create astro@latest');
      return;
    }

    const hasElectron = await isElectronProject();
    const mainExists = await hasMainField();
    const electronFilesExist = await hasElectronFiles();

    if (hasAstro && hasElectron && mainExists && electronFilesExist) {
      console.log('✨ Astro + Electron project detected!');
      console.log("You're all set! Run your dev command to get started.");
      return;
    }

    // If Astro is detected but something is missing with Electron setup
    if (hasAstro && (!hasElectron || !mainExists || !electronFilesExist)) {
      console.log('✨ Astro project detected!');

      if (!hasElectron) {
        console.log('ℹ️  Electron not detected in package.json');
      }
      if (!mainExists) {
        console.log('ℹ️  Main field missing in package.json');
      }
      if (!electronFilesExist) {
        console.log(
          'ℹ️  Required Electron files missing (electron/main.ts and/or electron/preload.ts)'
        );
      }

      const shouldAddElectron = await confirm({
        message: `Would you like to ${
          !hasElectron ? 'add Electron' : 'configure Electron'
        } for this project?`,
        default: true,
      });

      if (!shouldAddElectron) {
        console.log('Operation cancelled');
        return;
      }

      const templatePath = path.join(__dirname, '..', '..', 'template');
      const currentDir = process.cwd();

      // Copy electron files if they're missing
      if (!electronFilesExist) {
        console.log('📁 Adding Electron files...');
        await copyTemplate(
          path.join(templatePath, 'electron'),
          path.join(currentDir, 'electron')
        );
      }

      // Only modify package.json if main field is missing
      if (!mainExists) {
        const packageJsonPath = path.join(currentDir, 'package.json');
        try {
          const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
          const packageJson = JSON.parse(packageJsonContent);
          packageJson.main = 'dist-electron/main.js';
          await writeFile(
            packageJsonPath,
            JSON.stringify(packageJson, null, 2)
          );
          console.log('✨ Added main field to package.json');
        } catch (error) {
          console.error('Error updating package.json:', error);
          throw error;
        }
      }

      // Only install dependencies if Electron isn't installed
      if (!hasElectron) {
        console.log('Installing dependencies...');
        const dependencies = ['electron'];
        const devDependencies = ['@types/electron', 'electron-builder'];

        // Install regular dependencies
        for (const dep of dependencies) {
          try {
            const { execSync } = await import('child_process');
            const installCmd = getInstallCommand(packageManager, dep);
            console.log(`Running: ${installCmd}`);
            execSync(installCmd, { stdio: 'inherit' });
          } catch (error) {
            console.error(`Failed to install ${dep}:`, error);
            throw error;
          }
        }

        // Install dev dependencies
        for (const dep of devDependencies) {
          try {
            const { execSync } = await import('child_process');
            const installCmd = getInstallCommand(packageManager, `-D ${dep}`);
            console.log(`Running: ${installCmd}`);
            execSync(installCmd, { stdio: 'inherit' });
          } catch (error) {
            console.error(`Failed to install ${dep}:`, error);
            throw error;
          }
        }
      }

      const devCommand = getRunCommand(packageManager, 'dev');
      console.log(`
✨ ${
        !hasElectron
          ? 'Electron and dependencies have been added'
          : electronFilesExist
          ? 'Main field has been configured'
          : 'Electron has been configured'
      } for your project!

Next steps:
  1. Add electron scripts to your package.json
  2. ${devCommand}
      `);
    }
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

// Call main() only if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {
    process.exit(1);
  });
}
