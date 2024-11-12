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

export async function main() {
  try {
    const defaultPackageManager = await detectPackageManager();

    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { value: 'create', name: 'Create new Astro + Electron project' },
        { value: 'add', name: 'Add Electron to existing Astro project' },
      ],
    });

    // Ask for package manager preference
    const packageManager = (await select({
      message: 'Which package manager would you like to use?',
      choices: [
        { value: 'npm', name: 'npm', description: 'Node Package Manager' },
        { value: 'yarn', name: 'yarn', description: 'Yarn' },
        { value: 'pnpm', name: 'pnpm', description: 'pnpm' },
        { value: 'bun', name: 'bun', description: 'Bun' },
      ],
      default: defaultPackageManager,
    })) as PackageManager;

    if (action === 'create') {
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
          // If it's an error other than "directory doesn't exist"
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
    } else {
      // Add to existing project
      const shouldProceed = await confirm({
        message:
          'This will add Electron to your existing Astro project. Continue?',
        default: true,
      });

      if (!shouldProceed) {
        console.log('Operation cancelled');
        return;
      }

      const templatePath = path.join(__dirname, '..', '..', 'template');
      const currentDir = process.cwd();

      // Copy only electron-specific files
      await copyTemplate(
        path.join(templatePath, 'electron'),
        path.join(currentDir, 'electron')
      );

      // Read and modify package.json
      const packageJsonPath = path.join(currentDir, 'package.json');
      let packageJson;
      try {
        const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
        packageJson = JSON.parse(packageJsonContent);

        // Only add the main field
        packageJson.main = 'dist-electron/main.js';

        // Write back to package.json
        await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

        // Install dependencies
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
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }

      const devCommand = getRunCommand(packageManager, 'dev');

      console.log(`
✨ Electron and dependencies have been added to your project!

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
