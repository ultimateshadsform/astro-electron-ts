import path from 'node:path';
import { readFile, access } from 'node:fs/promises';

export const ASTRO_EXTENSIONS = ['.mjs', '.js', '.ts', '.cjs', '.mts', '.cts'];

export async function isAstroProject(): Promise<boolean> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    let packageJson;
    try {
      packageJson = JSON.parse(packageJsonContent);
    } catch {
      return false;
    }

    return !!(
      packageJson.dependencies?.astro || packageJson.devDependencies?.astro
    );
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return false;
      }
    }
    throw error;
  }
}

export async function isElectronProject(): Promise<boolean> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const hasElectronDep = !!(
      packageJson.dependencies?.electron ||
      packageJson.devDependencies?.electron
    );

    let configContent = '';

    for (const ext of ASTRO_EXTENSIONS) {
      const configPath = path.join(process.cwd(), `astro.config${ext}`);
      try {
        configContent = await readFile(configPath, 'utf-8');
        break;
      } catch {
        continue;
      }
    }

    const hasElectronIntegration = configContent.includes('astro-electron-ts');

    return hasElectronDep && hasElectronIntegration;
  } catch {
    return false;
  }
}

export async function hasMainField(): Promise<boolean> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    return !!packageJson.main;
  } catch {
    return false;
  }
}

export async function hasPackageJson(): Promise<boolean> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    await access(packageJsonPath);
    return true;
  } catch {
    return false;
  }
}

export async function isJavaScriptProject(): Promise<boolean> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const hasTypeScript = !!(
      packageJson.dependencies?.typescript ||
      packageJson.devDependencies?.typescript
    );

    return !hasTypeScript;
  } catch {
    return true;
  }
}
