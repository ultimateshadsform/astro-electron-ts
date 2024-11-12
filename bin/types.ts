export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export type ExitPromptError = Error & {
  code?: string;
  exitCode?: number;
};
