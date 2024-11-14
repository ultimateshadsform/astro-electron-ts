import type { OptionValues } from 'commander';

interface CreateOptions extends OptionValues {
  typescript: boolean;
  install: boolean;
}

export async function createNewProject(name: string, options: CreateOptions) {
  // Implementation will go here
  console.log(`Creating new project: ${name}`, options);
}
