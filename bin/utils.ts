import { detect } from 'detect-package-manager';
import type { PackageManager, ExitPromptError } from './types';

export const getPackageManager = async (): Promise<PackageManager> => {
  const detected = await detect();
  return detected as PackageManager;
};

export const validateConfig = (config: string): boolean => {
  try {
    // Check if the config contains basic Astro configuration structure
    if (!config.includes('defineConfig') || !config.includes('import')) {
      return false;
    }

    // Skip Function check since it can't handle import statements
    // new Function(config);

    // Check for basic Astro config structure
    const hasExportDefault = config.includes('export default');
    const hasDefineConfig =
      config.includes('defineConfig({') ||
      config.includes('defineConfig ({') ||
      config.includes('defineConfig(\n{') ||
      config.includes('defineConfig (\n{');
    const hasElectronImport =
      config.includes('import electron from') ||
      config.includes('import electron from "astro-electron-ts"') ||
      config.includes("import electron from 'astro-electron-ts'");
    const hasIntegrations =
      config.includes('integrations: [') && config.includes('electron()');

    // Log for debugging
    console.log('Config validation:', {
      hasExportDefault,
      hasDefineConfig,
      hasElectronImport,
      hasIntegrations,
      config: config.replace(/\s+/g, ' ').trim(),
    });

    return (
      hasExportDefault &&
      hasDefineConfig &&
      hasElectronImport &&
      hasIntegrations
    );
  } catch (error) {
    console.error('Config validation error:', error);
    return false;
  }
};

export const isExitPromptError = (error: unknown): error is ExitPromptError => {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as ExitPromptError).code === 'EXIT'
  );
};

export const getInstallCommand = (
  packageManager: string,
  packageOrFlags?: string
): string => {
  if (!packageOrFlags) {
    return `${packageManager} install`;
  }
  return `${packageManager} install ${packageOrFlags}`;
};

export const getRunCommand = (
  packageManager: string,
  script: string
): string => {
  switch (packageManager) {
    case 'npm':
      return `npm run ${script}`;
    case 'yarn':
      return `yarn ${script}`;
    case 'pnpm':
      return `pnpm ${script}`;
    case 'bun':
      return `bun run ${script}`;
    default:
      return `npm run ${script}`;
  }
};

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}
