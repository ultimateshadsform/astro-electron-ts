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

    // Check for valid JavaScript/TypeScript syntax
    new Function(config);

    // Check for basic Astro config structure
    const hasValidStructure =
      config.includes('export default') &&
      (config.includes('defineConfig({') || config.includes('defineConfig ({'));

    // Check for proper electron integration configuration
    // TypeScript version just needs electron()
    const hasSimpleElectronConfig =
      config.includes('electron()') && config.includes('integrations: [');

    // JavaScript version needs explicit main and preload paths
    const hasDetailedElectronConfig =
      config.includes('electron({') &&
      config.includes('integrations: [') &&
      (config.includes('main: {') || config.includes('preload: {'));

    // Config is valid if it has either the simple or detailed electron configuration
    return (
      hasValidStructure &&
      (hasSimpleElectronConfig || hasDetailedElectronConfig)
    );
  } catch {
    // If parsing fails or syntax is invalid, return false
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
